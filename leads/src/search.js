'use strict';

const { mapLimit } = require('./http');
const { config } = require('./config');
const { scoreLead } = require('./scoring');
const googlemaps = require('./providers/googlemaps');
const instagram = require('./providers/instagram');
const demo = require('./providers/demo');

async function searchLeads({ city, uf, term, demo: useDemo = false, withInstagram = true, minScore = 0, maxResults = 60 }) {
  const warnings = [];
  let leads = useDemo
    ? await demo.search({ city, uf, term })
    : await googlemaps.search({ city, uf, term, maxResults });

  if (withInstagram && !useDemo) {
    await mapLimit(leads, 5, (lead) => instagram.enrich(lead));
    if (!config.igToken) {
      warnings.push('Instagram sem token: só o @ é coletado (sem seguidores/posts). Veja o README para configurar.');
    }
  }

  leads = leads
    .map((l) => scoreLead(l))
    .filter((l) => l.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return { query: { city, uf, term: term || null }, total: leads.length, leads, warnings };
}

module.exports = { searchLeads };
