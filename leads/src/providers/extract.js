'use strict';

// Extração genérica de lojas a partir de payloads JSON/HTML cujo formato
// não é documentado e muda com frequência. Em vez de depender de um caminho
// fixo, procuramos objetos "com cara de loja" e lemos campos por sinônimos.

const { findObjects } = require('../lead');

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function pick(obj, paths) {
  for (const p of paths) {
    const v = get(obj, p);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

const NAME = ['name', 'nome', 'fantasyName', 'tradeName', 'title'];
const ID = ['id', 'uuid', 'merchantId', 'company_id', 'companyId', 'identifier', 'slug'];
const MERCHANT_HINTS = [
  'userRating', 'rating', 'avaliacao', 'aggregateRating', 'deliveryFee', 'delivery_fee',
  'deliveryTime', 'delivery_time', 'mainCategory', 'category', 'categories', 'slug',
  'logo', 'logoUrl', 'imageUrl', 'telephone', 'phone', 'address',
];

function looksLikeMerchant(o) {
  const name = pick(o, NAME);
  if (typeof name !== 'string' || name.length < 2 || name.length > 120) return false;
  if (pick(o, ID) === undefined && o['@type'] === undefined) return false;
  // Itens de cardápio também têm nome/id/preço; descartamos.
  if ('price' in o || 'unitPrice' in o || 'preco' in o) return false;
  return MERCHANT_HINTS.filter((k) => k in o).length >= 2 || /Restaurant|FoodEstablishment|LocalBusiness/.test(o['@type'] || '');
}

function extractMerchants(json) {
  const found = findObjects(json, looksLikeMerchant);
  const byKey = new Map();
  for (const o of found) {
    const key = String(pick(o, ID) ?? pick(o, NAME)).toLowerCase();
    if (!byKey.has(key)) byKey.set(key, o);
  }
  return [...byKey.values()];
}

// Blocos JSON embutidos em páginas (Next.js, Nuxt, JSON-LD).
function extractJsonFromHtml(html) {
  const blocks = [];
  const patterns = [
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/gi,
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html))) {
      try {
        blocks.push(JSON.parse(m[1]));
      } catch {
        /* bloco inválido: ignora */
      }
    }
  }
  return blocks;
}

module.exports = { get, pick, extractMerchants, extractJsonFromHtml, looksLikeMerchant };
