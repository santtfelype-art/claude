# Busca de Leads — Google Maps + Instagram → Telegram

Ferramenta interna da Vitrine Delivery. Ela:

1. **busca restaurantes no Google Maps** (cidade + o que procurar: "hamburgueria", "pizzaria"…);
2. **coleta as informações** de cada loja: telefone, endereço, site, nota, nº de avaliações e de fotos;
3. **acha o Instagram** da loja (pelo site cadastrado no Google ou por links dentro do site/Linktree)
   e, com o token configurado, lê seguidores, nº de posts, bio e data do último post;
4. calcula um **score de oportunidade (0–100)**: quanto mais fraca a presença digital, maior o score;
5. **manda para o seu Telegram** os melhores leads (com links de WhatsApp, Maps e Instagram)
   e a **planilha CSV** completa.

Requer Node.js 18+. Não precisa de `npm install`: não há dependências.

## Como usar

```bash
cd leads
cp .env.example .env        # preencha as chaves (passo a passo abaixo)

# Pelo terminal: busca e já manda para o Telegram
node buscar.js --termo hamburgueria --cidade "Feira de Santana" --uf BA

# Ou pela tela: http://localhost:3000 (botão "Enviar pro Telegram")
npm start
```

Opções do `buscar.js`:

| Opção | O que faz |
| --- | --- |
| `--termo <texto>` | o que procurar (padrão: "restaurante delivery") |
| `--cidade <nome>` / `--uf <UF>` | padrão: Feira de Santana / BA |
| `--min <0-100>` | só leads com score a partir desse valor |
| `--top <n>` | quantos leads detalhar na mensagem (padrão 20; a planilha leva todos) |
| `--sem-instagram` | não procura o Instagram (mais rápido) |
| `--nao-enviar` | só mostra no terminal |
| `--demo` | dados fictícios, sem chaves |

## Configuração (.env)

### 1. Google Maps — obrigatório

1. Entre em <https://console.cloud.google.com/>, crie um projeto e ative o faturamento
   (o Google oferece uma cota gratuita mensal; confira a página de preços da Places API).
2. Em **APIs e serviços → Biblioteca**, ative **Places API (New)**.
3. Em **Credenciais → Criar credencial → Chave de API**. Restrinja a chave à Places API.
4. Coloque em `GOOGLE_MAPS_API_KEY`.

Cada busca traz até 60 lojas (3 páginas de 20).

### 2. Telegram — para receber os leads

1. No Telegram, fale com **@BotFather** → `/newbot` → escolha um nome. Ele te dá o token:
   coloque em `TELEGRAM_BOT_TOKEN`.
2. Mande qualquer mensagem para o seu bot novo.
3. Abra `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates` no navegador e copie o número
   em `"chat":{"id": ...}` para `TELEGRAM_CHAT_ID`.
   (Para mandar num grupo: adicione o bot ao grupo e use o id do grupo, que começa com `-`.)

### 3. Instagram — opcional

Sem token, o sistema já encontra o **@** das lojas. Com token, também traz **seguidores,
posts, bio e último post**, usando a *Business Discovery* da API oficial do Instagram:

1. Sua conta do Instagram precisa ser **profissional** (comercial ou criador de conteúdo)
   e estar ligada a uma Página do Facebook.
2. Crie um app em <https://developers.facebook.com/> com o produto Instagram
   (API com login do Facebook) e gere um token com as permissões
   `instagram_basic`, `pages_show_list` e `business_management`.
3. `INSTAGRAM_USER_ID` = ID da **sua** conta profissional do Instagram;
   `INSTAGRAM_ACCESS_TOKEN` = o token (de preferência o de longa duração).

Limitação da própria API: só aparecem dados de lojas cujo Instagram também é conta
profissional. Para contas pessoais vem apenas o @.

## Como o score funciona

Ver `src/scoring.js`. Somam pontos: sem site, usa o Instagram como site, poucas fotos ou
avaliações no Google, nota baixa, Instagram não encontrado, poucos seguidores ou posts,
muito tempo sem postar, bio sem chamada para pedido, nicho foco (hambúrguer, pizza, açaí…)
e ter contato direto.

## Na tela

Filtros, status do funil (Novo → Contatado → Em negociação → Fechado), anotações
(salvas no navegador), botão de WhatsApp com mensagem de abordagem pronta (para
celulares), download do CSV e envio para o Telegram.

## API

- `GET /api/search?city=&uf=&term=&instagram=1&minScore=0&demo=0`
- `POST /api/send` com `{ query, leads }` → envia para o Telegram
- `GET /api/status` → quais chaves estão configuradas

## Estrutura

```
leads/
├── buscar.js                 # linha de comando: busca + envio
├── server.js                 # servidor da tela + API
├── public/index.html         # interface
├── .env.example              # modelo de configuração
├── src/
│   ├── search.js             # orquestra Google Maps → Instagram → score
│   ├── scoring.js            # score de oportunidade
│   ├── report.js             # CSV e mensagens
│   ├── telegram.js           # envio pelo bot
│   ├── config.js             # lê o .env
│   ├── http.js               # fetch com timeout, cache e concorrência
│   ├── lead.js               # formato único de lead
│   └── providers/
│       ├── googlemaps.js     # Places API (New)
│       ├── instagram.js      # descoberta do @ + Business Discovery
│       └── demo.js           # dados fictícios
└── test/leads.test.js
```

Use os dados de forma responsável: respeite a LGPD ao guardar e contatar os leads.
