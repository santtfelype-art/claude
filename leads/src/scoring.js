'use strict';

// Pontua cada lead (0-100) pela chance de precisar dos serviços da
// Vitrine Delivery: quanto pior a vitrine, maior a oportunidade.

const { slugify } = require('./lead');

const FOCUS_NICHES = /hamburg|burger|lanche|pizza|acai|açaí|marmit|pastel|espetinho|porção|porcao|sanduich|hot ?dog|cachorro/i;

function scoreLead(lead) {
  const reasons = [];
  let score = 0;
  const add = (pts, reason) => {
    score += pts;
    reasons.push(reason);
  };

  if (!lead.hasLogo) add(15, 'Sem logo');
  if (!lead.hasBanner) add(5, 'Sem capa/banner');

  if (lead.menu && lead.menu.items) {
    const photo = lead.menu.withPhoto / lead.menu.items;
    const desc = lead.menu.withDescription / lead.menu.items;
    if (photo < 0.5) add(25, `Só ${Math.round(photo * 100)}% dos itens com foto`);
    else if (photo < 0.8) add(12, `${Math.round(photo * 100)}% dos itens com foto`);
    if (desc < 0.5) add(15, `Só ${Math.round(desc * 100)}% dos itens com descrição`);
    else if (desc < 0.8) add(7, `${Math.round(desc * 100)}% dos itens com descrição`);
    if (lead.menu.items < 10) add(5, `Cardápio curto (${lead.menu.items} itens)`);
  }

  if (lead.rating === null || lead.rating === 0) add(8, 'Sem nota (loja nova?)');
  else if (lead.rating < 4.3) add(10, `Nota baixa (${lead.rating.toFixed(1)})`);

  if (lead.reviewCount !== null && lead.reviewCount < 50) add(5, `Poucas avaliações (${lead.reviewCount})`);
  if (lead.deliveryFee !== null && lead.deliveryFee > 8) add(3, `Taxa de entrega alta (R$ ${lead.deliveryFee.toFixed(2)})`);
  if (lead.category && FOCUS_NICHES.test(`${lead.category} ${lead.name}`)) add(10, 'Nicho foco');
  else if (FOCUS_NICHES.test(lead.name)) add(10, 'Nicho foco');
  if (lead.platforms && lead.platforms.length > 1) add(5, 'Ativo em mais de uma plataforma');

  lead.score = Math.min(100, score);
  lead.reasons = reasons;
  return lead;
}

// Junta a mesma loja encontrada em plataformas diferentes (pelo nome).
function mergeAcrossPlatforms(leads) {
  const byName = new Map();
  for (const lead of leads) {
    const key = slugify(lead.name).replace(/-(delivery|lanches|lanchonete|restaurante)$/, '');
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { ...lead, platforms: [lead.source], urls: { [lead.source]: lead.url } });
      continue;
    }
    if (!existing.platforms.includes(lead.source)) existing.platforms.push(lead.source);
    existing.urls[lead.source] = lead.url;
    for (const k of ['phone', 'address', 'category', 'rating', 'reviewCount', 'menu', 'cnpj']) {
      if (existing[k] == null && lead[k] != null) existing[k] = lead[k];
    }
    existing.hasLogo = existing.hasLogo && lead.hasLogo;
  }
  return [...byName.values()];
}

module.exports = { scoreLead, mergeAcrossPlatforms };
