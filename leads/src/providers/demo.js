'use strict';

// Dados fictícios para testar a interface sem acesso às plataformas.

const { makeLead } = require('../lead');

const SAMPLE = [
  ['Burger do Bairro', 'Lanches', 4.1, 32, false, { items: 24, withPhoto: 5, withDescription: 4 }, ['ifood', 'deliverymuch']],
  ['Pizzaria Bella Feira', 'Pizza', 4.7, 812, true, { items: 48, withPhoto: 40, withDescription: 44 }, ['ifood']],
  ['Açaí Tropical', 'Açaí', 4.5, 210, true, { items: 18, withPhoto: 6, withDescription: 10 }, ['ifood', 'deliverymuch']],
  ['Marmitaria Sabor Caseiro', 'Marmita', null, 0, false, { items: 9, withPhoto: 0, withDescription: 2 }, ['deliverymuch']],
  ['Smash Prime', 'Hambúrguer', 4.9, 1530, true, { items: 30, withPhoto: 30, withDescription: 29 }, ['ifood']],
  ['Pastelaria Kennedy', 'Pastel', 4.2, 75, true, { items: 35, withPhoto: 12, withDescription: 8 }, ['ifood']],
  ['Cantina Italiana Nonna', 'Italiana', 4.6, 140, true, { items: 40, withPhoto: 28, withDescription: 36 }, ['deliverymuch']],
  ['Espetinho do Zé', 'Espetinho', 3.9, 44, false, { items: 15, withPhoto: 2, withDescription: 1 }, ['ifood', 'deliverymuch']],
  ['Sushi Feira', 'Japonesa', 4.4, 390, true, { items: 60, withPhoto: 45, withDescription: 30 }, ['ifood']],
  ['Hot Dog Prensado da Praça', 'Lanches', 4.0, 18, false, null, ['deliverymuch']],
];

async function search(loc, { term, platform } = {}) {
  return SAMPLE.filter(([, , , , , , platforms]) => platforms.includes(platform))
    .filter(([name, cat]) => !term || `${name} ${cat}`.toLowerCase().includes(term.toLowerCase()))
    .map(([name, category, rating, reviewCount, hasLogo, menu], i) =>
      makeLead({
        id: `demo-${platform}-${i}`,
        source: platform,
        name,
        category,
        url: null,
        city: loc.city,
        uf: loc.uf,
        address: `Rua Exemplo, ${100 + i * 7}, Centro`,
        phone: i % 3 === 0 ? `7599${String(1000000 + i * 1234).slice(0, 7)}` : null,
        rating,
        reviewCount,
        deliveryFee: 3 + (i % 4) * 2.5,
        deliveryTime: 30 + i * 3,
        isOpen: i % 4 !== 0,
        hasLogo,
        hasBanner: hasLogo && i % 2 === 0,
        menu,
      }),
    );
}

module.exports = { search };
