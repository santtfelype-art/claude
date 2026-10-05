'use strict';

// Formato único de lead.
//
// {
//   id, name, category, address, phone, whatsapp, website, mapsUrl,
//   rating (0-5 | null), reviewCount, photoCount, businessStatus,
//   instagram: { username, url, followers, posts, lastPostAt, bio, name } | null,
//   score, reasons[]
// }

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function makeLead(partial) {
  return {
    id: String(partial.id ?? ''),
    name: (partial.name || '').trim(),
    category: partial.category || null,
    address: partial.address || null,
    phone: partial.phone || null,
    whatsapp: partial.whatsapp || null,
    website: partial.website || null,
    mapsUrl: partial.mapsUrl || null,
    rating: num(partial.rating),
    reviewCount: num(partial.reviewCount),
    photoCount: num(partial.photoCount),
    businessStatus: partial.businessStatus || null,
    instagram: partial.instagram || null,
    score: 0,
    reasons: [],
  };
}

// Converte telefone brasileiro em dígitos com DDI (5575999990000) ou null.
function phoneDigits(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = d.replace(/^0+/, '');
  if (!d.startsWith('55')) d = '55' + d;
  return d.length >= 12 && d.length <= 13 ? d : null;
}

function isMobile(digits) {
  // Celular: 55 + DDD (2) + 9 + 8 dígitos.
  return Boolean(digits) && digits.length === 13 && digits[4] === '9';
}

module.exports = { makeLead, num, phoneDigits, isMobile };
