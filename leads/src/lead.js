'use strict';

// Formato único de lead, independente da plataforma de origem.
//
// {
//   id, source: 'ifood' | 'deliverymuch' | 'demo' | 'import',
//   name, category, url, city, uf, address, phone,
//   rating (0-5 | null), reviewCount (number | null),
//   deliveryFee (R$ | null), deliveryTime (min | null), distanceKm,
//   isOpen (bool | null), hasLogo, hasBanner,
//   menu: { items, withPhoto, withDescription } | null,
//   score, reasons[]
// }

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(',', '.').replace(/[^\d.-]/g, '')) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function makeLead(partial) {
  return {
    id: String(partial.id ?? ''),
    source: partial.source,
    name: (partial.name || '').trim(),
    category: partial.category || null,
    url: partial.url || null,
    city: partial.city || null,
    uf: partial.uf || null,
    address: partial.address || null,
    phone: partial.phone || null,
    rating: num(partial.rating),
    reviewCount: num(partial.reviewCount),
    deliveryFee: num(partial.deliveryFee),
    deliveryTime: num(partial.deliveryTime),
    distanceKm: num(partial.distanceKm),
    isOpen: typeof partial.isOpen === 'boolean' ? partial.isOpen : null,
    hasLogo: Boolean(partial.hasLogo),
    hasBanner: Boolean(partial.hasBanner),
    menu: partial.menu || null,
    score: 0,
    reasons: [],
  };
}

// Percorre um JSON qualquer e devolve todos os objetos que satisfazem `pred`.
// Útil para extrair lojas de payloads cujo formato muda com frequência.
function findObjects(root, pred, limit = 2000) {
  const out = [];
  const seen = new Set();
  const stack = [root];
  while (stack.length && out.length < limit) {
    const node = stack.pop();
    if (!node || typeof node !== 'object' || seen.has(node)) continue;
    seen.add(node);
    if (!Array.isArray(node) && pred(node)) {
      out.push(node);
      continue;
    }
    for (const v of Array.isArray(node) ? node : Object.values(node)) {
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return out;
}

function slugify(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { makeLead, findObjects, slugify, num };
