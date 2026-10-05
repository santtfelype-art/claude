'use strict';

const test = require('node:test');
const assert = require('node:assert');

const ifood = require('../src/providers/ifood');
const deliverymuch = require('../src/providers/deliverymuch');
const { extractMerchants, extractJsonFromHtml } = require('../src/providers/extract');
const { makeLead } = require('../src/lead');
const { scoreLead, mergeAcrossPlatforms } = require('../src/scoring');
const { searchLeads } = require('../src/search');
const { server } = require('../server');

const LOC = { lat: -12.2664, lng: -38.9663, city: 'Feira de Santana', uf: 'BA' };

test('iFood: normaliza loja da listagem v1', () => {
  const lead = ifood.toLead(
    {
      id: 'abc-123',
      name: 'Burger do Bairro',
      slug: 'burger-do-bairro-centro',
      userRating: 4.2,
      mainCategory: { friendlyName: 'Lanches' },
      deliveryFee: { value: 5.99 },
      deliveryTime: 40,
      distance: 2.1,
      available: true,
      resources: [{ type: 'LOGO', fileName: 'x.png' }],
    },
    LOC,
  );
  assert.equal(lead.name, 'Burger do Bairro');
  assert.equal(lead.category, 'Lanches');
  assert.equal(lead.rating, 4.2);
  assert.equal(lead.deliveryFee, 5.99);
  assert.equal(lead.hasLogo, true);
  assert.equal(lead.url, 'https://www.ifood.com.br/delivery/feira-de-santana-ba/burger-do-bairro-centro/abc-123');
});

test('iFood: extrai lojas de cards da busca (cardstack)', () => {
  const payload = {
    sections: [{ cards: [{ cardType: 'MERCHANT_LIST', data: { contents: [
      { id: 'm1', name: 'Pizza X', userRating: 4.8, action: 'merchant?identifier=m1&slug=feira-de-santana-ba%2Fpizza-x', imageUrl: 'logo.png' },
      { id: 'i1', name: 'Pizza Calabresa', price: 39.9, description: 'item de cardápio' },
    ] } }] }],
  };
  const merchants = extractMerchants(payload);
  assert.equal(merchants.length, 1);
  const lead = ifood.toLead(merchants[0], LOC);
  assert.equal(lead.url, 'https://www.ifood.com.br/delivery/feira-de-santana-ba/pizza-x/m1');
});

test('Delivery Much: extrai lojas de JSON-LD e __NEXT_DATA__', () => {
  const html = `
    <script type="application/ld+json">{"@type":"Restaurant","name":"Açaí Tropical","telephone":"(75) 99999-0000",
      "aggregateRating":{"ratingValue":"4.5","reviewCount":"120"},"servesCuisine":["Açaí"]}</script>
    <script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"companies":[
      {"id":7,"name":"Espetinho do Zé","slug":"espetinho-do-ze","delivery_fee":4,"logo":null,"rating":3.9}
    ]}}}</script>`;
  const merchants = extractJsonFromHtml(html).flatMap(extractMerchants);
  const leads = merchants.map((m) => deliverymuch.toLead(m, LOC, 'https://www.deliverymuch.com.br/feira-de-santana-ba'));
  const acai = leads.find((l) => l.name === 'Açaí Tropical');
  const espeto = leads.find((l) => l.name === 'Espetinho do Zé');
  assert.equal(acai.phone, '(75) 99999-0000');
  assert.equal(acai.rating, 4.5);
  assert.equal(acai.category, 'Açaí');
  assert.equal(espeto.url, 'https://www.deliverymuch.com.br/feira-de-santana-ba/espetinho-do-ze');
  assert.equal(espeto.hasLogo, false);
});

test('score: vitrine fraca pontua mais que vitrine completa', () => {
  const weak = scoreLead({ ...makeLead({ name: 'Burger', rating: 4.0, hasLogo: false, menu: { items: 20, withPhoto: 2, withDescription: 3 } }), platforms: ['ifood'] });
  const strong = scoreLead({ ...makeLead({ name: 'Sushi', rating: 4.9, reviewCount: 900, hasLogo: true, hasBanner: true, menu: { items: 40, withPhoto: 40, withDescription: 40 } }), platforms: ['ifood'] });
  assert.ok(weak.score > strong.score, `${weak.score} > ${strong.score}`);
  assert.ok(weak.reasons.includes('Sem logo'));
  assert.ok(weak.score <= 100);
});

test('mescla a mesma loja vinda das duas plataformas', () => {
  const merged = mergeAcrossPlatforms([
    makeLead({ id: 1, source: 'ifood', name: 'Açaí Tropical', url: 'https://ifood/x' }),
    makeLead({ id: 2, source: 'deliverymuch', name: 'Acai Tropical', phone: '75999990000', url: 'https://dm/x' }),
  ]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].platforms, ['ifood', 'deliverymuch']);
  assert.equal(merged[0].phone, '75999990000');
  assert.equal(merged[0].urls.deliverymuch, 'https://dm/x');
});

test('busca em modo demonstração devolve leads ordenados', async () => {
  const r = await searchLeads({ city: 'Feira de Santana', uf: 'BA', demo: true });
  assert.ok(r.total > 0);
  assert.deepEqual(r.errors, {});
  for (let i = 1; i < r.leads.length; i++) assert.ok(r.leads[i - 1].score >= r.leads[i].score);
});

test('API /api/search valida parâmetros e responde em modo demo', async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const bad = await fetch(`${base}/api/search?city=X`);
    assert.equal(bad.status, 400);
    const ok = await fetch(`${base}/api/search?city=Feira%20de%20Santana&uf=BA&demo=1&term=burger`);
    const data = await ok.json();
    assert.equal(ok.status, 200);
    assert.equal(data.leads[0].name, 'Burger do Bairro');
    const page = await fetch(`${base}/`);
    assert.match(await page.text(), /Busca de Leads/);
  } finally {
    server.close();
  }
});
