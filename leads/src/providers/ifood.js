'use strict';

// Conector iFood.
//
// O iFood não tem API pública de listagem de lojas; usamos os mesmos
// endpoints que o site www.ifood.com.br consome no navegador. Eles podem
// mudar sem aviso, por isso o parser é tolerante (ver ./extract.js) e as
// URLs podem ser sobrescritas por variáveis de ambiente.

const { request, mapLimit } = require('../http');
const { makeLead, slugify } = require('../lead');
const { pick, extractMerchants } = require('./extract');

const MARKETPLACE = process.env.IFOOD_MARKETPLACE_URL || 'https://marketplace.ifood.com.br';
const WSLOJA = process.env.IFOOD_WSLOJA_URL || 'https://wsloja.ifood.com.br/ifood-ws-v3';
const STATIC = 'https://static.ifood-static.com.br/image/upload/t_thumbnail/logosgde/';

const SEARCH_BODY = {
  'supported-headers': ['OPERATION_HEADER'],
  'supported-cards': [
    'MERCHANT_LIST', 'MERCHANT_LIST_V2', 'FEATURED_MERCHANT_LIST', 'MERCHANT_CAROUSEL',
    'MERCHANT_TILE_CAROUSEL', 'SIMPLE_MERCHANT_CAROUSEL', 'MERCHANT_LIST_WITH_ITEMS_CAROUSEL',
    'CATALOG_ITEM_LIST', 'CATALOG_ITEM_LIST_V2', 'NEXT_CONTENT',
  ],
  'supported-actions': ['catalog-item', 'merchant', 'page', 'card-content', 'search'],
  'feed-feature-name': '',
  'faster-overrides': '',
};

function geoQuery(loc) {
  return `latitude=${loc.lat}&longitude=${loc.lng}&channel=IFOOD`;
}

function storeUrl(raw, loc) {
  const id = pick(raw, ['id', 'merchantId', 'uuid']);
  let slug = pick(raw, ['slug']);
  if (!slug) {
    const action = String(pick(raw, ['action']) || '');
    slug = (action.match(/slug=([^&]+)/) || [])[1];
  }
  if (!id || !slug) return null;
  slug = decodeURIComponent(slug);
  const path = slug.includes('/') ? slug : `${slugify(loc.city)}-${String(loc.uf).toLowerCase()}/${slug}`;
  return `https://www.ifood.com.br/delivery/${path}/${id}`;
}

function toLead(raw, loc) {
  const resources = pick(raw, ['resources']) || [];
  const logoRes = Array.isArray(resources) ? resources.find((r) => r && r.type === 'LOGO') : null;
  const logo = pick(raw, ['logoUrl', 'imageUrl', 'logo']) || (logoRes && STATIC + logoRes.fileName);
  const banner = Array.isArray(resources) && resources.some((r) => r && /HEADER|BANNER|COVER/.test(r.type || ''));
  const category = pick(raw, ['mainCategory.friendlyName', 'mainCategory.name', 'mainCategory', 'category', 'contentDescription']);

  return makeLead({
    id: pick(raw, ['id', 'merchantId', 'uuid']),
    source: 'ifood',
    name: pick(raw, ['name']),
    category: typeof category === 'string' ? category : null,
    url: storeUrl(raw, loc),
    city: loc.city,
    uf: loc.uf,
    rating: pick(raw, ['userRating', 'rating', 'evaluation.rating']),
    reviewCount: pick(raw, ['userRatingCount', 'evaluationCount', 'ratingCount']),
    deliveryFee: pick(raw, ['deliveryFee.value', 'deliveryInfo.fee', 'deliveryFee']),
    deliveryTime: pick(raw, ['deliveryTime', 'deliveryInfo.timeMaxMinutes', 'deliveryInfo.timeMinMinutes']),
    distanceKm: pick(raw, ['distance', 'deliveryInfo.distance']),
    isOpen: typeof raw.available === 'boolean' ? raw.available : typeof raw.closed === 'boolean' ? !raw.closed : null,
    hasLogo: Boolean(logo),
    hasBanner: banner,
  });
}

async function listMerchants(loc, { pages = 3, size = 100 } = {}) {
  const all = [];
  for (let page = 0; page < pages; page++) {
    const json = await request(`${MARKETPLACE}/v1/merchants?${geoQuery(loc)}&size=${size}&page=${page}`);
    const merchants = Array.isArray(json?.merchants) ? json.merchants : extractMerchants(json);
    all.push(...merchants);
    if (merchants.length < size) break;
  }
  return all;
}

async function searchMerchants(loc, term, { size = 100 } = {}) {
  const url =
    `${MARKETPLACE}/v2/cardstack/search/results?alias=SEARCH_RESULTS_MERCHANT_TAB_GLOBAL` +
    `&${geoQuery(loc)}&size=${size}&term=${encodeURIComponent(term)}`;
  const json = await request(url, { method: 'POST', body: SEARCH_BODY });
  return extractMerchants(json);
}

// Lê o cardápio para medir a qualidade da vitrine (fotos e descrições).
async function fetchMenuStats(id, loc) {
  const json = await request(`${WSLOJA}/v1/merchants/${id}/catalog?latitude=${loc.lat}&longitude=${loc.lng}`);
  const sections = json?.data?.menu || [];
  let items = 0;
  let withPhoto = 0;
  let withDescription = 0;
  for (const s of sections) {
    for (const it of s.itens || s.items || []) {
      items++;
      if (it.logoUrl || it.imageUrl) withPhoto++;
      if ((it.details || it.description || '').trim().length >= 15) withDescription++;
    }
  }
  return items ? { items, withPhoto, withDescription } : null;
}

async function fetchExtra(id) {
  const json = await request(`${WSLOJA}/v1/merchants/${id}/extra`);
  const d = json?.data || {};
  const a = d.address || {};
  const address = [a.streetName, a.streetNumber, a.district, a.city].filter(Boolean).join(', ');
  return {
    address: address || null,
    phone: d.phoneIf || d.phone || null,
    cnpj: d.documents?.CNPJ?.value || null,
  };
}

async function search(loc, { term, enrich = true, enrichLimit = 40 } = {}) {
  let raws;
  try {
    raws = term ? await searchMerchants(loc, term) : await listMerchants(loc);
  } catch (err) {
    // Se a busca por termo falhar, tenta a listagem geral e filtra localmente.
    if (!term) throw err;
    const t = term.toLowerCase();
    raws = (await listMerchants(loc)).filter((m) =>
      JSON.stringify([m.name, m.mainCategory]).toLowerCase().includes(t),
    );
  }

  const leads = raws.map((r) => toLead(r, loc)).filter((l) => l.id && l.name);

  if (enrich) {
    await mapLimit(leads.slice(0, enrichLimit), 4, async (lead) => {
      const [menu, extra] = await Promise.allSettled([fetchMenuStats(lead.id, loc), fetchExtra(lead.id)]);
      if (menu.status === 'fulfilled') lead.menu = menu.value;
      if (extra.status === 'fulfilled') {
        lead.address = extra.value.address || lead.address;
        lead.phone = extra.value.phone || lead.phone;
        lead.cnpj = extra.value.cnpj;
      }
    });
  }
  return leads;
}

module.exports = { search, toLead, storeUrl };
