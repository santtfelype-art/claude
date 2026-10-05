#!/usr/bin/env node
'use strict';

// Busca leads pelo terminal e envia para o Telegram.
//
//   node buscar.js --termo hamburgueria --cidade "Feira de Santana" --uf BA
//
// Opções:
//   --termo <texto>     o que procurar no Google Maps (padrão: "restaurante delivery")
//   --cidade <nome>     padrão: Feira de Santana
//   --uf <UF>           padrão: BA
//   --min <0-100>       score mínimo para entrar na lista (padrão: 0)
//   --top <n>           quantos leads detalhar na mensagem (padrão: 20)
//   --sem-instagram     não procura o Instagram das lojas
//   --nao-enviar        só mostra no terminal, sem mandar para o Telegram
//   --demo              usa dados fictícios (não precisa de chaves)

const { searchLeads } = require('./src/search');
const { sendLeads, ensureConfigured } = require('./src/telegram');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else args[key] = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const send = !args['nao-enviar'];
  if (send) ensureConfigured();

  const query = {
    city: args.cidade || 'Feira de Santana',
    uf: String(args.uf || 'BA').toUpperCase(),
    term: typeof args.termo === 'string' ? args.termo : undefined,
  };
  console.log(`Buscando "${query.term || 'restaurante delivery'}" em ${query.city}/${query.uf}…`);

  const result = await searchLeads({
    ...query,
    demo: Boolean(args.demo),
    withInstagram: !args['sem-instagram'],
    minScore: Number(args.min || 0),
  });
  for (const w of result.warnings) console.warn(`Aviso: ${w}`);

  console.log(`\n${result.total} leads encontrados:\n`);
  for (const l of result.leads) {
    const ig = l.instagram ? `@${l.instagram.username}` : 'sem Instagram';
    console.log(`${String(l.score).padStart(3)}  ${l.name}  ·  ${l.phone || 'sem telefone'}  ·  ${ig}`);
  }

  if (send) {
    const sent = await sendLeads(result, { top: Number(args.top || 20) });
    console.log(`\nEnviado para o Telegram (${sent.messages} mensagem(ns)${sent.file ? ' + planilha' : ''}).`);
  }
}

main().catch((err) => {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
});
