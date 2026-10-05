'use strict';

// Conector Google Maps via Places API (New), a API oficial do Google.
// Requer GOOGLE_MAPS_API_KEY com a "Places API (New)" ativada.
// https://developers.google.com/maps/documentation/places/web-service/text-search

const { request } = require('../http');
const { makeLead } = require('../lead');
const { config } = require('../config');

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.websiteUri', 'places.rating', 'places.userRatingCount',
  'places.googleMapsUri', 'places.primaryTypeDisplayName', 'places.businessStatus', 'places.photos',
  'nextPageToken',
].join(',');

function toLead(p) {
  return makeLead({
    id: p.id,
    name: p.displayName?.text,
    category: p.primaryTypeDisplayName?.text || null,
    address: p.formattedAddress,
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
    website: p.websiteUri || null,
    mapsUrl: p.googleMapsUri || null,
    rating: p.rating,
    reviewCount: p.userRatingCount ?? 0,
    // A API devolve no máximo 10 fotos por lugar; serve como indicador.
    photoCount: Array.isArray(p.photos) ? p.photos.length : 0,
    businessStatus: p.businessStatus || null,
  });
}

async function search({ city, uf, term, maxResults = 60 }) {
  if (!config.googleApiKey) {
    throw new Error('Configure GOOGLE_MAPS_API_KEY no arquivo .env (veja o README).');
  }
  const textQuery = `${term || 'restaurante delivery'} em ${city} - ${uf}`;
  const places = [];
  let pageToken;
  do {
    const json = await request(ENDPOINT, {
      method: 'POST',
      headers: { 'X-Goog-Api-Key': config.googleApiKey, 'X-Goog-FieldMask': FIELDS },
      body: { textQuery, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 20, ...(pageToken ? { pageToken } : {}) },
    });
    places.push(...(json.places || []));
    pageToken = json.nextPageToken;
  } while (pageToken && places.length < maxResults);

  return places
    .slice(0, maxResults)
    .filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY')
    .map(toLead);
}

module.exports = { search, toLead, FIELDS };
