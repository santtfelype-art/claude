# Busca de Leads — iFood + Delivery Much

Ferramenta interna da Vitrine Delivery para encontrar restaurantes no **iFood** e na
**Delivery Much** e priorizar quem tem a vitrine mais fraca (sem logo, poucas fotos,
cardápio sem descrição, nota baixa). Esses são os melhores leads para prospectar.

## Como rodar

Requer Node.js 18+ (não precisa de `npm install`, não há dependências).

```bash
cd leads
npm start            # http://localhost:3000
npm test             # testes automatizados
```

Marque **Modo demonstração** para testar a interface com dados fictícios.

## O que faz

1. Converte cidade/UF em coordenadas (Feira de Santana, Salvador etc. já vêm prontas;
   outras cidades usam o OpenStreetMap).
2. Busca as lojas da região em cada plataforma (opcionalmente filtrando por termo:
   "hambúrguer", "pizza"…).
3. Com **Analisar cardápio** ligado, lê o cardápio das lojas do iFood para contar
   itens com foto e descrição, e busca endereço/telefone/CNPJ quando disponíveis.
4. Junta a mesma loja encontrada nas duas plataformas.
5. Calcula um **score de oportunidade (0–100)** com os motivos (ver `src/scoring.js`).
6. Na tela: filtros, status do funil (Novo → Contatado → Em negociação → Fechado),
   anotações (salvas no navegador), botão de WhatsApp com mensagem de abordagem
   pronta e exportação para CSV (abre no Excel/Google Sheets).

## API

`GET /api/search?city=Feira de Santana&uf=BA&term=burger&sources=ifood,deliverymuch&enrich=1&minScore=0&demo=0`

Resposta: `{ location, total, leads: [...], errors: { plataforma: mensagem } }`.
Se uma plataforma falhar, as outras continuam e o erro aparece na tela.

## Importante sobre os conectores

Nenhuma das duas plataformas tem API pública de listagem de lojas. Os conectores usam
os mesmos endpoints/páginas que os sites usam no navegador e por isso **podem parar de
funcionar se o site mudar** ou bloquear o IP do servidor. Para reduzir esse risco:

- o parser procura "objetos com cara de loja" no JSON em vez de depender de um caminho fixo;
- as URLs podem ser trocadas por variáveis de ambiente sem mexer no código:

| Variável | Padrão |
| --- | --- |
| `IFOOD_MARKETPLACE_URL` | `https://marketplace.ifood.com.br` |
| `IFOOD_WSLOJA_URL` | `https://wsloja.ifood.com.br/ifood-ws-v3` |
| `DM_CITY_URLS` | `https://www.deliverymuch.com.br/{city}-{uf}` + 2 variações, separadas por `\|` |
| `DM_API_URL` | (vazio) — endpoint JSON opcional; aceita `{lat}`, `{lng}`, `{city}`, `{uf}` |
| `CACHE_TTL_MS` | `600000` (10 min de cache por consulta) |

Rode a partir de um computador/servidor no Brasil e use com moderação (o cache e o limite
de 4 requisições simultâneas ajudam). Respeite os termos de uso das plataformas e a LGPD
ao armazenar e contatar os leads.

## Estrutura

```
leads/
├── server.js                 # servidor HTTP + API
├── public/index.html         # interface
├── src/
│   ├── search.js             # orquestra plataformas, mescla e pontua
│   ├── scoring.js            # score de oportunidade
│   ├── geocode.js            # cidade → coordenadas
│   ├── http.js               # fetch com timeout, cache e concorrência
│   ├── lead.js               # formato único de lead
│   └── providers/
│       ├── ifood.js
│       ├── deliverymuch.js
│       ├── demo.js           # dados fictícios
│       └── extract.js        # extração genérica de lojas em JSON/HTML
└── test/leads.test.js
```
