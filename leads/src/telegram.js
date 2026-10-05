'use strict';

// Envio dos leads para o Telegram via Bot API.
// https://core.telegram.org/bots/api

const { config } = require('./config');
const { toCsv, formatMessages } = require('./report');

const API = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';

function ensureConfigured() {
  if (!config.telegramToken || !config.telegramChatId) {
    throw new Error('Configure TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no arquivo .env (veja o README).');
  }
}

async function call(method, init) {
  const res = await fetch(`${API}/bot${config.telegramToken}/${method}`, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) throw new Error(`Telegram: ${json.description || `HTTP ${res.status}`}`);
  return json.result;
}

function sendMessage(text) {
  return call('sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: config.telegramChatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
}

function sendDocument(filename, content, caption) {
  const form = new FormData();
  form.append('chat_id', config.telegramChatId);
  form.append('caption', caption);
  form.append('document', new Blob([content], { type: 'text/csv' }), filename);
  return call('sendDocument', { method: 'POST', body: form });
}

async function sendLeads(result, { top = 20 } = {}) {
  ensureConfigured();
  if (!result.leads.length) {
    await sendMessage(`🔎 Nenhum lead encontrado para "${result.query.term || 'restaurantes'}" em ${result.query.city}/${result.query.uf}.`);
    return { messages: 1, file: false };
  }
  const messages = formatMessages(result, { top });
  for (const text of messages) await sendMessage(text);
  const slug = `${result.query.term || 'restaurantes'}-${result.query.city}`.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  const date = new Date().toISOString().slice(0, 10);
  await sendDocument(`leads-${slug}-${date}.csv`, toCsv(result.leads), `Planilha com os ${result.total} leads`);
  return { messages: messages.length, file: true };
}

module.exports = { sendLeads, ensureConfigured };
