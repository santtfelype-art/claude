'use strict';

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

const googlemaps = require('../src/providers/googlemaps');
const instagram = require('../src/providers/instagram');
const { makeLead, phoneDigits } = require('../src/lead');
const { scoreLead } = require('../src/scoring');
const { toCsv, formatMessages, whatsappNumber } = require('../src/report');
const { searchLeads } = require('../src/search');

// Servidor HTTP local para simular APIs externas.
async function fakeServer(handler) {
  const srv = http.createServer(handler);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { srv, base: `http://127.0.0.1:${srv.address().port}` };
}

test('Google Maps: normaliza lugar da Places API', () => {
  const lead = googlemaps.toLead({
    id: 'ChIJ123',
    displayName: { text: 'Burger do Bairro' },
    formattedAddress: 'Rua A, 10 - Centro, Feira de Santana - BA',
    nationalPhoneNumber: '(75) 99100-0001',
    websiteUri: 'https://www.instagram.com/burgerdobairro/',
    rating: 4.1,
    userRatingCount: 22,
    googleMapsUri: 'https://maps.google.com/?cid=1',
    primaryTypeDisplayName: { text: 'Hamburgueria' },
    businessStatus: 'OPERATIONAL',
    photos: [{}, {}],
  });
  assert.equal(lead.name, 'Burger do Bairro');
  assert.equal(lead.category, 'Hamburgueria');
  assert.equal(lead.photoCount, 2);
  assert.equal(lead.reviewCount, 22);
  assert.equal(lead.mapsUrl, 'https://maps.google.com/?cid=1');
});

test('Instagram: extrai @ de URLs e ignora caminhos reservados', () => {
  assert.equal(instagram.handleFromUrl('https://www.instagram.com/Burger.Do.Bairro/?hl=pt'), 'burger.do.bairro');
  assert.equal(instagram.handleFromUrl('https://instagram.com/p/AbC123'), null);
  assert.equal(instagram.handleFromUrl('https://burger.com.br'), null);
  assert.equal(instagram.whatsappFromText('Peça: https://wa.me/5575991000001'), '5575991000001');
  assert.equal(instagram.whatsappFromText('api.whatsapp.com/send?phone=75991000001'), '5575991000001');
});

test('Instagram: encontra @ e WhatsApp dentro do site da loja', async () => {
  const { srv, base } = await fakeServer((req, res) => {
    res.end('<a href="https://www.instagram.com/pizzaria_x/">Insta</a> <a href="https://wa.me/5575991112222">Zap</a>');
  });
  try {
    const lead = await instagram.enrich(makeLead({ name: 'Pizzaria X', website: `${base}/` }));
    assert.equal(lead.instagram.username, 'pizzaria_x');
    assert.equal(lead.whatsapp, '5575991112222');
  } finally {
    srv.close();
  }
});

test('telefone: só celular vira link de WhatsApp', () => {
  assert.equal(phoneDigits('(75) 99100-0001'), '5575991000001');
  assert.equal(whatsappNumber(makeLead({ phone: '(75) 99100-0001' })), '5575991000001');
  assert.equal(whatsappNumber(makeLead({ phone: '(75) 3221-0002' })), null);
});

test('score: presença digital fraca pontua mais que forte', () => {
  const now = Date.now();
  const weak = scoreLead(makeLead({ name: 'Burger', rating: 4.0, reviewCount: 10, photoCount: 1 }), now);
  const strong = scoreLead(
    makeLead({
      name: 'Sushi', website: 'https://sushi.com.br', rating: 4.9, reviewCount: 900, photoCount: 10,
      instagram: { username: 'sushi', followers: 20000, posts: 800, lastPostAt: new Date(now).toISOString(), bio: 'Peça no wa.me/55' },
    }),
    now,
  );
  assert.ok(weak.score > strong.score, `${weak.score} > ${strong.score}`);
  assert.ok(weak.reasons.includes('Instagram não encontrado'));
  assert.ok(weak.score <= 100);
});

test('relatório: CSV com cabeçalho e mensagens divididas no limite', async () => {
  const r = await searchLeads({ city: 'Feira de Santana', uf: 'BA', demo: true });
  const csv = toCsv(r.leads);
  assert.ok(csv.startsWith('﻿"score";"nome"'));
  assert.equal(csv.split('\r\n').length, r.leads.length + 1);
  const msgs = formatMessages(r, { maxLen: 600 });
  assert.ok(msgs.length > 1);
  assert.ok(msgs.every((m) => m.length <= 600 || !m.includes('\n\n')));
  assert.match(msgs[0], /leads<\/b> — restaurantes em Feira de Santana\/BA/);
});

test('Telegram: envia mensagens e a planilha', async () => {
  const calls = [];
  const { srv, base } = await fakeServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      calls.push({ url: req.url, body });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, result: {} }));
    });
  });
  process.env.TELEGRAM_API_URL = base;
  process.env.TELEGRAM_BOT_TOKEN = 'TOKEN';
  process.env.TELEGRAM_CHAT_ID = '123';
  delete require.cache[require.resolve('../src/telegram')];
  const { sendLeads } = require('../src/telegram');
  try {
    const r = await searchLeads({ city: 'Feira de Santana', uf: 'BA', demo: true });
    const sent = await sendLeads(r);
    assert.equal(sent.file, true);
    assert.ok(calls.some((c) => c.url === '/botTOKEN/sendMessage' && JSON.parse(c.body).chat_id === '123'));
    const doc = calls.find((c) => c.url === '/botTOKEN/sendDocument');
    assert.ok(doc && doc.body.includes('Burger do Bairro'));
  } finally {
    srv.close();
    delete process.env.TELEGRAM_API_URL;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  }
});

test('API: valida parâmetros, busca em modo demo e informa configuração', async () => {
  const { server } = require('../server');
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/api/search?city=X`)).status, 400);
    const ok = await fetch(`${base}/api/search?city=Feira%20de%20Santana&uf=BA&demo=1&term=burger`);
    const data = await ok.json();
    assert.equal(ok.status, 200);
    assert.equal(data.leads[0].name, 'Burger do Bairro');
    const status = await (await fetch(`${base}/api/status`)).json();
    assert.deepEqual(Object.keys(status).sort(), ['google', 'instagram', 'telegram']);
    assert.match(await (await fetch(`${base}/`)).text(), /Busca de Leads/);
  } finally {
    server.close();
  }
});
