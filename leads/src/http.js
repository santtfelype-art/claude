'use strict';

// Cliente HTTP mínimo com timeout, headers de navegador e cache em memória.

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9',
};

const cache = new Map();
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 10 * 60 * 1000);

async function request(url, { method = 'GET', headers = {}, body, timeoutMs = 15000, as = 'json' } = {}) {
  const key = `${method} ${url} ${body ? JSON.stringify(body) : ''}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const host = new URL(url).host;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...DEFAULT_HEADERS,
        Accept: as === 'json' ? 'application/json' : 'text/html,*/*',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      // APIs do Google/Meta explicam o erro no corpo; repassamos a mensagem.
      let detail = '';
      try {
        const j = JSON.parse(await res.text());
        detail = j.error?.message || j.message || '';
      } catch {
        /* corpo não é JSON */
      }
      throw new Error(`HTTP ${res.status} em ${host}${detail ? `: ${detail}` : ''}`);
    }
    const value = as === 'json' ? await res.json() : await res.text();
    cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Tempo esgotado em ${host}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Executa `fn` sobre `items` com no máximo `limit` chamadas simultâneas.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

module.exports = { request, mapLimit };
