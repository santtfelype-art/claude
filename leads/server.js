'use strict';

// Servidor da busca de leads: serve a interface (public/) e a API /api/search.
// Sem dependências externas — requer Node.js 18+.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { searchLeads } = require('./src/search');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function handleSearch(url, res) {
  const q = url.searchParams;
  const city = (q.get('city') || '').trim();
  const uf = (q.get('uf') || '').trim().toUpperCase();
  if (!city || !/^[A-Z]{2}$/.test(uf)) return sendJson(res, 400, { error: 'Informe cidade e UF (ex.: Feira de Santana / BA).' });

  const sources = (q.get('sources') || 'ifood,deliverymuch').split(',').map((s) => s.trim()).filter(Boolean);
  try {
    const result = await searchLeads({
      city,
      uf,
      term: (q.get('term') || '').trim() || undefined,
      sources,
      demo: q.get('demo') === '1',
      enrich: q.get('enrich') !== '0',
      minScore: Number(q.get('minScore') || 0),
    });
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 502, { error: err.message });
  }
}

function serveStatic(url, res) {
  const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: 'Proibido' });
  fs.readFile(file, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'Não encontrado' });
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/search') return handleSearch(url, res);
  if (req.method === 'GET') return serveStatic(url, res);
  sendJson(res, 405, { error: 'Método não permitido' });
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Busca de leads em http://localhost:${PORT}`));
}

module.exports = { server };
