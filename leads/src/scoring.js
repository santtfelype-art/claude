'use strict';

// Pontua cada lead (0-100) pela chance de precisar dos serviços da
// Vitrine Delivery: quanto mais fraca a presença digital, maior a oportunidade.

const FOCUS_NICHES = /hamburg|burger|lanche|pizza|acai|açaí|marmit|pastel|espetinho|porção|porcao|sanduich|hot ?dog|cachorro|delivery/i;
const DAY = 24 * 60 * 60 * 1000;

function scoreLead(lead, now = Date.now()) {
  const reasons = [];
  let score = 0;
  const add = (pts, reason) => {
    score += pts;
    reasons.push(reason);
  };

  // Google Maps
  if (!lead.website) add(10, 'Sem site no Google');
  else if (lead.instagram && /instagram\.com/i.test(lead.website)) add(8, 'Usa o Instagram como site');
  if (lead.photoCount !== null && lead.photoCount < 5) add(8, `Poucas fotos no Google (${lead.photoCount})`);
  if (lead.reviewCount !== null && lead.reviewCount < 30) add(8, `Poucas avaliações no Google (${lead.reviewCount})`);
  if (lead.rating !== null && lead.rating > 0 && lead.rating < 4.2) add(8, `Nota baixa no Google (${lead.rating.toFixed(1)})`);

  // Instagram
  const ig = lead.instagram;
  if (!ig) add(15, 'Instagram não encontrado');
  else if (ig.followers !== undefined && ig.followers !== null) {
    if (ig.followers < 1000) add(12, `Poucos seguidores (${ig.followers})`);
    else if (ig.followers < 3000) add(6, `${ig.followers} seguidores`);
    if (ig.posts !== null && ig.posts < 30) add(6, `Poucos posts (${ig.posts})`);
    if (ig.lastPostAt) {
      const days = Math.floor((now - new Date(ig.lastPostAt).getTime()) / DAY);
      if (days > 30) add(12, `Sem postar há ${days} dias`);
      else if (days > 14) add(6, `Último post há ${days} dias`);
    }
    if (ig.bio !== null && ig.bio !== undefined && !/wa\.me|whats|zap|pedido|delivery|ifood|card[aá]pio/i.test(ig.bio)) {
      add(6, 'Bio sem chamada para pedido');
    }
  }

  if (FOCUS_NICHES.test(`${lead.category || ''} ${lead.name}`)) add(10, 'Nicho foco');
  if (lead.whatsapp || lead.phone) add(5, 'Tem contato direto');

  lead.score = Math.min(100, score);
  lead.reasons = reasons;
  return lead;
}

module.exports = { scoreLead };
