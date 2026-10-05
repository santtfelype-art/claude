'use strict';

// Conector Delivery Much.
//
// A Delivery Much também não publica API de listagem. O conector baixa a
// página da cidade e lê os dados embutidos (Next.js / JSON-LD), extraindo
// as lojas de forma genérica. Os modelos de URL podem ser ajustados por
// variáveis de ambiente caso o site mude:
//   DM_CITY_URLS="https://www.deliverymuch.com.br/{city}-{uf}|https://..."
//   DM_API_URL="https://.../companies?lat={lat}&lng={lng}"   (opcional, JSON)

const { request } = require('../http');
const { makeLead, slugify } = require('../lead');
const { pick, extractMerchants, extractJsonFromHtml } = require('./extract');

const BASE = 'https://www.deliverymuch.com.br';
const CITY_URLS = (process.env.DM_CITY_URLS ||
  `${BASE}/{city}-{uf}|${BASE}/delivery/{city}-{uf}|${BASE}/{city}`).split('|');

function fill(tpl, loc) {
  return tpl
    .replace('{city}', slugify(loc.city))
    .replace('{uf}', String(loc.uf).toLowerCase())
    .replace('{lat}', loc.lat)
    .replace('{lng}', loc.lng);
}

function toLead(raw, loc, pageUrl) {
  const slug = pick(raw, ['slug', 'permalink', 'url']);
  let url = null;
  if (typeof slug === 'string') {
    url = /^https?:/.test(slug) ? slug : `${pageUrl.replace(/\/$/, '')}/${slug.replace(/^\//, '')}`;
  }
  const address = pick(raw, ['address.streetAddress', 'address.street', 'address', 'endereco']);
  const category = pick(raw, ['servesCuisine', 'category.name', 'category', 'categories.0.name', 'categories.0']);

  return makeLead({
    id: pick(raw, ['id', 'uuid', 'company_id', 'companyId', 'slug', 'name']),
    source: 'deliverymuch',
    name: pick(raw, ['name', 'nome', 'fantasyName']),
    category: Array.isArray(category) ? category.join(', ') : typeof category === 'string' ? category : null,
    url,
    city: loc.city,
    uf: loc.uf,
    address: typeof address === 'string' ? address : null,
    phone: pick(raw, ['telephone', 'phone', 'telefone', 'whatsapp']),
    rating: pick(raw, ['aggregateRating.ratingValue', 'rating', 'average_rating', 'avaliacao']),
    reviewCount: pick(raw, ['aggregateRating.reviewCount', 'aggregateRating.ratingCount', 'rating_count', 'reviews_count']),
    deliveryFee: pick(raw, ['delivery_fee', 'deliveryFee', 'taxa_entrega']),
    deliveryTime: pick(raw, ['delivery_time', 'deliveryTime', 'tempo_entrega']),
    isOpen: typeof raw.is_open === 'boolean' ? raw.is_open : typeof raw.open === 'boolean' ? raw.open : null,
    hasLogo: Boolean(pick(raw, ['logo', 'logoUrl', 'logo_url', 'image', 'imageUrl'])),
    hasBanner: Boolean(pick(raw, ['banner', 'cover', 'cover_url', 'bannerUrl'])),
  });
}

async function search(loc, { term } = {}) {
  const errors = [];
  let merchants = [];
  let pageUrl = BASE;

  if (process.env.DM_API_URL) {
    try {
      merchants = extractMerchants(await request(fill(process.env.DM_API_URL, loc)));
    } catch (err) {
      errors.push(err.message);
    }
  }

  for (const tpl of CITY_URLS) {
    if (merchants.length) break;
    pageUrl = fill(tpl, loc);
    try {
      const html = await request(pageUrl, { as: 'text' });
      merchants = extractJsonFromHtml(html).flatMap(extractMerchants);
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (!merchants.length && errors.length) throw new Error(errors[errors.length - 1]);

  let leads = merchants.map((m) => toLead(m, loc, pageUrl)).filter((l) => l.name);
  if (term) {
    const t = term.toLowerCase();
    leads = leads.filter((l) => `${l.name} ${l.category || ''}`.toLowerCase().includes(t));
  }
  return leads;
}

module.exports = { search, toLead };
