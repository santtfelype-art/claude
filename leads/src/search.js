'use strict';

const { geocode } = require('./geocode');
const { scoreLead, mergeAcrossPlatforms } = require('./scoring');
const ifood = require('./providers/ifood');
const deliverymuch = require('./providers/deliverymuch');
const demo = require('./providers/demo');

const PROVIDERS = { ifood, deliverymuch };

async function searchLeads({ city, uf, term, sources = ['ifood', 'deliverymuch'], demo: useDemo = false, enrich = true, minScore = 0 }) {
  const loc = await geocode(city, uf);
  const errors = {};

  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        if (useDemo) return await demo.search(loc, { term, platform: source });
        if (!PROVIDERS[source]) throw new Error('Plataforma desconhecida');
        return await PROVIDERS[source].search(loc, { term, enrich });
      } catch (err) {
        errors[source] = err.message;
        return [];
      }
    }),
  );

  const leads = mergeAcrossPlatforms(results.flat())
    .map(scoreLead)
    .filter((l) => l.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return { location: loc, total: leads.length, leads, errors };
}

module.exports = { searchLeads, PROVIDERS };
