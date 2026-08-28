import pg from 'pg'

/**
 * Conexao unica do processo. O schema e aplicado no boot, de forma idempotente:
 * um blog nao precisa de ferramenta de migracao — precisa de quatro tabelas que
 * nunca podem faltar.
 */
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'rotacte_blog',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  max: 10,
})

export const q = (texto, params) => pool.query(texto, params)

let pronto = null
export function garantirSchema() {
  // Se a criacao falhar (banco ainda subindo, por exemplo), a promessa REJEITADA
  // nao pode ficar em cache: sem o reset, todo request seguinte falharia mesmo
  // depois de o banco voltar.
  if (!pronto) {
    pronto = criar().catch((e) => { pronto = null; throw e })
  }
  return pronto
}

async function criar() {
  await q(`
    create table if not exists post (
      id           bigserial primary key,
      slug         text not null unique,
      titulo       text not null,
      resumo       text not null default '',
      conteudo_md  text not null default '',
      tags         text not null default '',
      status       text not null default 'RASCUNHO',   -- RASCUNHO | PUBLICADO
      publicado_em timestamptz,
      criado_em    timestamptz not null default now(),
      atualizado_em timestamptz not null default now()
    );
    -- Capa do post: caminho relativo dentro de ./arquivos (ver /capa/[...caminho]).
    alter table post add column if not exists capa text;
    alter table post add column if not exists capa_alt text;
    -- Assunto do post (slug do catalogo em lib/categorias.js).
    alter table post add column if not exists categoria text;
    create index if not exists idx_post_categoria on post (categoria) where status = 'PUBLICADO';
    -- Busca: um indice sobre titulo+resumo+conteudo em portugues (acento e plural
    -- resolvidos pelo dicionario, em vez de LIKE que so acha a forma exata).
    create index if not exists idx_post_busca on post using gin (
      to_tsvector('portuguese', coalesce(titulo,'') || ' ' || coalesce(resumo,'') || ' ' || coalesce(conteudo_md,''))
    );
    create table if not exists material (
      id        bigserial primary key,
      slug      text not null unique,
      titulo    text not null,
      descricao text not null default '',
      arquivo   text not null,                          -- caminho relativo em ./arquivos
      ativo     boolean not null default true,
      criado_em timestamptz not null default now()
    );
    create table if not exists lead (
      id          bigserial primary key,
      nome        text not null,
      email       text not null,
      whatsapp    text,
      material_id bigint references material(id),
      origem      text not null default '',             -- de onde veio (slug/rota)
      chave       text not null unique,                 -- libera o download
      criado_em   timestamptz not null default now()
    );
    create index if not exists idx_lead_criado on lead (criado_em);
    create table if not exists pageview (
      dia     date not null,
      rota    text not null,
      acessos int  not null default 0,
      primary key (dia, rota)
    );
  `)
}

/** Soma 1 acesso na rota do dia. Uma linha por (dia, rota): a tabela nao cresce com o trafego. */
export async function registrarAcesso(rota) {
  await q(
    `insert into pageview (dia, rota, acessos) values (current_date, $1, 1)
     on conflict (dia, rota) do update set acessos = pageview.acessos + 1`,
    [rota],
  )
}
