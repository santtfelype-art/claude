'use strict';

const { request } = require('./http');

// Cidades frequentes já resolvidas, para não depender do geocoder.
const KNOWN = {
  'feira de santana-ba': { lat: -12.2664, lng: -38.9663, city: 'Feira de Santana', uf: 'BA' },
  'salvador-ba': { lat: -12.9714, lng: -38.5014, city: 'Salvador', uf: 'BA' },
  'vitoria da conquista-ba': { lat: -14.8615, lng: -40.8442, city: 'Vitória da Conquista', uf: 'BA' },
  'alagoinhas-ba': { lat: -12.1356, lng: -38.4192, city: 'Alagoinhas', uf: 'BA' },
};

function normalizeKey(city, uf) {
  return `${city}-${uf}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

async function geocode(city, uf) {
  const known = KNOWN[normalizeKey(city, uf)];
  if (known) return known;

  const q = encodeURIComponent(`${city}, ${uf}, Brasil`);
  const results = await request(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=br`,
    { headers: { 'User-Agent': 'vitrine-delivery-leads/1.0' } },
  );
  if (!Array.isArray(results) || !results.length) {
    throw new Error(`Cidade não encontrada: ${city}/${uf}`);
  }
  return { lat: Number(results[0].lat), lng: Number(results[0].lon), city, uf };
}

module.exports = { geocode, normalizeKey };
