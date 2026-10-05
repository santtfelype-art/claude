'use strict';

// Conector Instagram.
//
// 1. Descobre o @ da loja: pelo site cadastrado no Google Maps (muitas lojas
//    usam o próprio Instagram como site) ou procurando links instagram.com
//    dentro do site/Linktree da loja. Também captura links de WhatsApp.
// 2. Se INSTAGRAM_USER_ID e INSTAGRAM_ACCESS_TOKEN estiverem configurados,
//    usa a Business Discovery da API oficial (Instagram Graph API) para ler
//    seguidores, nº de posts, bio e data do último post.
//    https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery

const { request } = require('../http');
const { config } = require('../config');
const { phoneDigits } = require('../lead');

const GRAPH = 'https://graph.facebook.com/v21.0';
const RESERVED = new Set(['p', 'reel', 'reels', 'explore', 'accounts', 'stories', 'share', 'direct', 'about', 'developer', 'legal', 'tv']);

function handleFromUrl(url) {
  const m = String(url || '').match(/instagram\.com\/([A-Za-z0-9_.]{2,30})/i);
  if (!m) return null;
  const h = m[1].replace(/\.+$/, '').toLowerCase();
  return RESERVED.has(h) ? null : h;
}

function whatsappFromText(text) {
  const m = String(text || '').match(/(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?phone=|whatsapp\.com\/send\?phone=)\+?(\d{10,13})/i);
  return m ? phoneDigits(m[1]) : null;
}

// Lê o site da loja procurando @ do Instagram e WhatsApp.
async function scanWebsite(url) {
  const html = await request(url, { as: 'text', timeoutMs: 8000 });
  const handles = [...html.matchAll(/instagram\.com\/([A-Za-z0-9_.]{2,30})/gi)]
    .map((m) => handleFromUrl(m[0]))
    .filter(Boolean);
  return { handle: handles[0] || null, whatsapp: whatsappFromText(html) };
}

async function businessDiscovery(username) {
  const fields =
    `business_discovery.username(${username})` +
    '{username,name,biography,website,followers_count,media_count,media.limit(1){timestamp}}';
  const url = `${GRAPH}/${config.igUserId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(config.igToken)}`;
  const bd = (await request(url)).business_discovery || {};
  return {
    name: bd.name || null,
    bio: bd.biography || null,
    followers: bd.followers_count ?? null,
    posts: bd.media_count ?? null,
    lastPostAt: bd.media?.data?.[0]?.timestamp || null,
    externalUrl: bd.website || null,
  };
}

async function enrich(lead) {
  let handle = handleFromUrl(lead.website);
  if (!handle && lead.website) {
    try {
      const found = await scanWebsite(lead.website);
      handle = found.handle;
      lead.whatsapp = lead.whatsapp || found.whatsapp;
    } catch {
      /* site fora do ar ou bloqueado: segue sem Instagram */
    }
  }
  if (!handle) return lead;

  lead.instagram = { username: handle, url: `https://www.instagram.com/${handle}/` };
  if (config.igUserId && config.igToken) {
    try {
      Object.assign(lead.instagram, await businessDiscovery(handle));
      lead.whatsapp = lead.whatsapp || whatsappFromText(lead.instagram.bio) || whatsappFromText(lead.instagram.externalUrl);
    } catch (err) {
      // Contas pessoais (não comerciais) não aparecem na Business Discovery.
      lead.instagram.error = err.message;
    }
  }
  return lead;
}

module.exports = { enrich, handleFromUrl, whatsappFromText };
