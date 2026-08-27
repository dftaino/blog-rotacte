# Blog do RotaCTe

Blog em **Astro 5 (SSR)** + **Postgres**, feito para SEO: o HTML sai pronto do
servidor, com canonical, Open Graph, RSS e sitemap. Zero JavaScript nas paginas
publicas.

Identidade do produto (`DESIGN-SYSTEM.md` do RotaCTe): dark goldenrod + tinta
espresso, Open Sans, logotipo com a rotatoria no "o". Regra de contraste que vale
em toda tela: **botao dourado leva texto espresso, nunca branco** (dourado com
branco da 2,9:1 e reprova em AA).

- **Publico**: home, posts em markdown, `/materiais` (iscas de captacao com
  form nome/e-mail/WhatsApp → download liberado por chave propria).
- **/admin** (oculto, senha por env): escrever/publicar posts, metricas de
  acesso (sem cookie, contadas no servidor), leads com exportacao CSV, upload
  de novos materiais.
- **API de plataforma**: `/api/plataforma/resumo` e `/api/plataforma/leads`
  protegidos por `X-Blog-Token` — mesmo contrato do blog do Reservya, pronto
  para o Orbys puxar os leads para o funil.

## Rodar local

    npm install
    cp .env.example .env   # ADMIN_SENHA >=12, PLATAFORMA_TOKEN >=24
    createdb rotacte_blog
    node --env-file=.env scripts/semear.mjs
    npm run dev            # http://localhost:4321

Deploy: ver `DEPLOY.md`.
