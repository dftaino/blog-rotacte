# Deploy — blog.rotacte.com.br

Mesmo desenho do blog do Reservya e dos outros apps da VPS: container na rede
`funilads_default`, porta so no localhost (**8007**), nginx do host na frente
com TLS do certbot.

Portas ja usadas: 8003 app do RotaCTe, 8005 orbys-front, 8006 blog do Reservya.

## 0. DNS (uma vez, no painel da Hostinger)

Registro **A** `blog` → IP da VPS (2.25.91.209). Conferir com
`dig +short blog.rotacte.com.br`.

## 1. Banco (uma vez)

O superusuario do Postgres compartilhado e **`funil`** (nao `postgres` — esse
papel nao existe la):

    docker exec funilads-db-1 psql -U funil -d funilads -c \
      "create user rotacte_blog password 'SENHA-FORTE-AQUI'"
    docker exec funilads-db-1 psql -U funil -d funilads -c \
      "create database rotacte_blog owner rotacte_blog"

## 2. Codigo + configuracao

O repo e privado, entao a VPS nao clona sozinha — o caminho usado foi enviar o
tarball do commit (mesmo jeito do blog do Reservya):

    # na bancada
    git archive --format=tar.gz -o /tmp/rotacte-blog.tar.gz HEAD
    scp /tmp/rotacte-blog.tar.gz root@2.25.91.209:/tmp/

    # na VPS
    mkdir -p /home/aplicativos/rotacte-blog
    tar xzf /tmp/rotacte-blog.tar.gz -C /home/aplicativos/rotacte-blog
    cd /home/aplicativos/rotacte-blog
    cp .env.example .env
    # preencher: DB_PASSWORD, ADMIN_SENHA (>=12), PLATAFORMA_TOKEN (>=24)
    #   openssl rand -hex 24   # bom para os dois

## 3. Subir

    docker compose up -d --build
    curl -s localhost:8007/ | head -3    # deve sair HTML do blog

O container roda o seed no boot (idempotente): cria as tabelas, os dois
materiais e os artigos iniciais, se ainda nao existirem.

## 4. nginx + TLS (uma vez)

`/etc/nginx/sites-available/blog-rotacte`:

    server {
        listen 80;
        server_name blog.rotacte.com.br;
        client_max_body_size 30m;          # upload de PDF no /admin
        location / {
            proxy_pass http://127.0.0.1:8007;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
        }
    }

    ln -s /etc/nginx/sites-available/blog-rotacte /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    certbot --nginx -d blog.rotacte.com.br

## 5. Orbys (quando quiser puxar os leads)

Os endpoints `/api/plataforma/resumo` e `/api/plataforma/leads` ja existem, no
mesmo contrato do blog do Reservya (header `X-Blog-Token`).

**Atencao:** hoje o Orbys tem **um** par `BLOG_URL`/`BLOG_TOKEN` (`AppProperties.sync`),
entao ele so sincroniza um blog por vez. Ligar o segundo exige uma mudanca la —
transformar a configuracao em lista, ou um segundo par de propriedades. Enquanto
isso, os leads do RotaCTe saem pelo CSV do `/admin/leads`.

## Atualizar depois

    # bancada: git archive + scp (como no passo 2), depois na VPS:
    cd /home/aplicativos/rotacte-blog
    tar xzf /tmp/rotacte-blog.tar.gz -C .
    docker compose up -d --build

O `.env` fica de fora do tarball (esta no .gitignore), entao a atualizacao nao
apaga os segredos.

## Estado (deploy de 27/08/2026)

No ar em **https://blog.rotacte.com.br** — container `rotacte-blog-blog-1` na
8007, certificado do certbot emitido, banco `rotacte_blog` semeado com os 3
artigos e os 2 materiais. Senha do admin e tokens estao no `.env` da VPS
(`/home/aplicativos/rotacte-blog/.env`, modo 600).

## O que fica onde

| Coisa                  | Lugar                                        |
|------------------------|----------------------------------------------|
| Posts, leads, metricas | banco `rotacte_blog` (Postgres compartilhado) |
| PDFs dos materiais     | `arquivos/` (os do seed) + volume `arquivos/enviados/` (upload do admin) |
| Admin                  | `https://blog.rotacte.com.br/admin`          |
| API p/ painel          | `/api/plataforma/resumo` e `/api/plataforma/leads` (header `X-Blog-Token`) |
