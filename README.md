# Vitrine Delivery — Portfólio

Landing page inicial da **Vitrine Delivery**, um serviço que cria vitrines digitais
(cardápios online, sites e presença digital) para restaurantes, pizzarias e lanchonetes
de Feira de Santana - BA.

## Como visualizar

Abra o arquivo `index.html` diretamente no navegador, ou sirva localmente:

```bash
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

## Estrutura

- `index.html` — página única (HTML + CSS + JS inline, sem dependências externas além da fonte).

## Seções

- **Hero** — proposta de valor e métricas.
- **Serviços** — cardápio digital, site, fotos, reputação, tráfego e automação.
- **Portfólio** — projetos-modelo por nicho (lanchonete, pizzaria, restaurante).
- **Como funciona** — processo em 4 passos.
- **CTA / Contato** — chamada para WhatsApp.

## Próximos passos sugeridos

- Substituir o número de WhatsApp placeholder (`5575000000000`) pelo número real.
- Trocar os projetos-modelo do portfólio por cases reais conforme forem fechados.
- Adicionar logo/identidade visual definitiva.

## Busca de leads (Google Maps + Instagram → Telegram)

A pasta [`leads/`](leads/) busca restaurantes no Google Maps, encontra o Instagram de cada um,
prioriza os leads e manda a lista para o Telegram. Veja [`leads/README.md`](leads/README.md).
Para rodar: `cd leads && node buscar.js --termo hamburgueria`.
