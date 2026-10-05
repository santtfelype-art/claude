'use strict';

// Dados fictícios para testar o fluxo sem chaves de API.

const { makeLead } = require('../lead');

const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

const SAMPLE = [
  ['Burger do Bairro', 'Hamburgueria', 4.1, 22, 2, '(75) 99100-0001', 'https://instagram.com/burgerdobairro',
    { username: 'burgerdobairro', followers: 640, posts: 18, lastPostAt: daysAgo(45), bio: 'Os melhores burgers da cidade' }],
  ['Pizzaria Bella Feira', 'Pizzaria', 4.7, 812, 10, '(75) 3221-0002', 'https://bellafeira.com.br',
    { username: 'bellafeira', followers: 12400, posts: 540, lastPostAt: daysAgo(1), bio: 'Peça pelo WhatsApp wa.me/5575991000002' }],
  ['Açaí Tropical', 'Açaiteria', 4.5, 210, 6, '(75) 99100-0003', null, null],
  ['Marmitaria Sabor Caseiro', 'Restaurante', null, 0, 0, '(75) 99100-0004', null, null],
  ['Smash Prime', 'Hamburgueria', 4.9, 1530, 10, '(75) 99100-0005', 'https://instagram.com/smashprime',
    { username: 'smashprime', followers: 25000, posts: 900, lastPostAt: daysAgo(0), bio: 'Delivery pelo iFood e WhatsApp' }],
  ['Pastelaria Kennedy', 'Pastelaria', 4.2, 75, 4, '(75) 3221-0006', 'https://instagram.com/pastelariakennedy',
    { username: 'pastelariakennedy', followers: 2100, posts: 60, lastPostAt: daysAgo(20), bio: 'Pastéis desde 1998' }],
  ['Espetinho do Zé', 'Churrascaria', 3.9, 44, 1, '(75) 99100-0007', null, null],
  ['Sushi Feira', 'Restaurante japonês', 4.4, 390, 10, '(75) 99100-0008', 'https://sushifeira.com.br',
    { username: 'sushifeira', followers: 8000, posts: 300, lastPostAt: daysAgo(3), bio: 'Cardápio no link' }],
];

async function search({ city, uf, term }) {
  return SAMPLE.filter(([name, cat]) => !term || `${name} ${cat}`.toLowerCase().includes(term.toLowerCase()))
    .map(([name, category, rating, reviewCount, photoCount, phone, website, ig], i) =>
      makeLead({
        id: `demo-${i}`,
        name,
        category,
        address: `Rua Exemplo, ${100 + i * 7} - Centro, ${city} - ${uf}`,
        phone,
        website,
        mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(`${name} ${city}`)}`,
        rating,
        reviewCount,
        photoCount,
        businessStatus: 'OPERATIONAL',
        instagram: ig && { ...ig, url: `https://www.instagram.com/${ig.username}/` },
      }),
    );
}

module.exports = { search };
