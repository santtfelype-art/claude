'use strict';

// Carrega variáveis do arquivo leads/.env (se existir) sem dependências.

const fs = require('fs');
const path = require('path');

function loadEnv(file = path.join(__dirname, '..', '.env')) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

loadEnv();

const config = {
  get googleApiKey() { return process.env.GOOGLE_MAPS_API_KEY || ''; },
  get igUserId() { return process.env.INSTAGRAM_USER_ID || ''; },
  get igToken() { return process.env.INSTAGRAM_ACCESS_TOKEN || ''; },
  get telegramToken() { return process.env.TELEGRAM_BOT_TOKEN || ''; },
  get telegramChatId() { return process.env.TELEGRAM_CHAT_ID || ''; },
};

module.exports = { config, loadEnv };
