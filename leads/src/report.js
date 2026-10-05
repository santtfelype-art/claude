'use strict';

// Gera a planilha CSV e as mensagens de texto (HTML do Telegram) dos leads.

const { phoneDigits, isMobile } = require('./lead');

const DAY = 24 * 60 * 60 * 1000;

function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function whatsappNumber(lead) {
  if (lead.whatsapp) return lead.whatsapp;
  const d = phoneDigits(lead.phone);
  return isMobile(d) ? d : null;
}

function daysSince(iso, now = Date.now()) {
  return iso ? Math.floor((now - new Date(iso).getTime()) / DAY) : null;
}

const CSV_COLUMNS = [
  ['score', (l) => l.score],
  ['nome', (l) => l.name],
  ['categoria', (l) => l.category],
  ['telefone', (l) => l.phone],
  ['whatsapp', (l) => whatsappNumber(l)],
  ['endereco', (l) => l.address],
  ['nota_google', (l) => l.rating],
  ['avaliacoes_google', (l) => l.reviewCount],
  ['fotos_google', (l) => l.photoCount],
  ['site', (l) => l.website],
  ['google_maps', (l) => l.mapsUrl],
  ['instagram', (l) => l.instagram?.url],
  ['seguidores', (l) => l.instagram?.followers],
  ['posts', (l) => l.instagram?.posts],
  ['dias_sem_postar', (l) => daysSince(l.instagram?.lastPostAt)],
  ['bio_instagram', (l) => l.instagram?.bio],
  ['motivos', (l) => l.reasons.join('; ')],
];

function toCsv(leads) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const rows = [CSV_COLUMNS.map(([h]) => h), ...leads.map((l) => CSV_COLUMNS.map(([, f]) => f(l)))];
  // BOM + ";" para abrir certo no Excel em português.
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}

function formatLead(lead, i) {
  const lines = [`<b>${i + 1}. ${esc(lead.name)}</b> — score <b>${lead.score}</b>${lead.category ? ` · ${esc(lead.category)}` : ''}`];
  if (lead.address) lines.push(`📍 ${esc(lead.address)}`);
  const wa = whatsappNumber(lead);
  const contact = [lead.phone && `📞 ${esc(lead.phone)}`, wa && `<a href="https://wa.me/${wa}">WhatsApp</a>`].filter(Boolean);
  if (contact.length) lines.push(contact.join(' · '));
  const ig = lead.instagram;
  if (ig) {
    const parts = [`📸 <a href="${esc(ig.url)}">@${esc(ig.username)}</a>`];
    if (ig.followers != null) parts.push(`${ig.followers} seguidores`);
    const d = daysSince(ig.lastPostAt);
    if (d != null) parts.push(`último post há ${d} dias`);
    lines.push(parts.join(' · '));
  } else {
    lines.push('📸 sem Instagram encontrado');
  }
  const g = [lead.rating ? `⭐ ${lead.rating.toFixed(1)} (${lead.reviewCount ?? 0})` : '⭐ sem nota'];
  if (lead.mapsUrl) g.push(`<a href="${esc(lead.mapsUrl)}">Google Maps</a>`);
  if (lead.website && !/instagram\.com/i.test(lead.website)) g.push(`<a href="${esc(lead.website)}">site</a>`);
  lines.push(g.join(' · '));
  if (lead.reasons.length) lines.push(`💡 ${esc(lead.reasons.join(', '))}`);
  return lines.join('\n');
}

// Divide em mensagens de até `maxLen` caracteres sem cortar um lead no meio.
function formatMessages(result, { top = 20, maxLen = 3800 } = {}) {
  const { query, leads, total } = result;
  const header =
    `🔎 <b>${total} leads</b> — ${esc(query.term || 'restaurantes')} em ${esc(query.city)}/${esc(query.uf)}\n` +
    `Mostrando os ${Math.min(top, total)} com maior score. A lista completa vai na planilha.`;
  const messages = [header];
  for (const [i, lead] of leads.slice(0, top).entries()) {
    const block = formatLead(lead, i);
    const last = messages.length - 1;
    if (messages[last].length + block.length + 2 > maxLen) messages.push(block);
    else messages[last] += `\n\n${block}`;
  }
  return messages;
}

module.exports = { toCsv, formatMessages, formatLead, whatsappNumber };
