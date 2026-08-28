import { q } from './db.js'

/**
 * Catalogo fixo de assuntos. Categoria e um enum do produto, nao texto livre:
 * assim a barra do topo tem um conjunto estavel, o /categoria/<slug> nunca
 * aparece escrito de dois jeitos e o admin escolhe numa lista.
 */
export const CATEGORIAS = [
  { slug: 'cte', nome: 'CT-e' },
  { slug: 'mdfe', nome: 'MDF-e' },
  { slug: 'nfe', nome: 'NF-e' },
  { slug: 'reforma-tributaria', nome: 'Reforma tributária' },
  { slug: 'frota', nome: 'Gestão de frota' },
  { slug: 'financeiro', nome: 'Financeiro' },
]

export const categoriaPorSlug = (slug) => CATEGORIAS.find((c) => c.slug === slug) || null
export const nomeDaCategoria = (slug) => categoriaPorSlug(slug)?.nome || null

/**
 * Categorias que tem pelo menos um post publicado — a barra do topo nao deve
 * oferecer assunto que leva a uma pagina vazia. Memorizado por 60s: a barra
 * aparece em toda pagina e a contagem muda no ritmo de quem publica, nao no de
 * quem le.
 */
let cache = { em: 0, valor: [] }
export async function categoriasComPosts() {
  const agora = Date.now()
  if (agora - cache.em < 60_000) return cache.valor

  const { rows } = await q(
    `select categoria, count(*)::int total from post
     where status = 'PUBLICADO' and categoria is not null
     group by categoria`,
  )
  const totais = new Map(rows.map((r) => [r.categoria, r.total]))
  const valor = CATEGORIAS.filter((c) => totais.has(c.slug)).map((c) => ({ ...c, total: totais.get(c.slug) }))
  cache = { em: agora, valor }
  return valor
}

/** Publicar/editar muda a barra na hora, sem esperar o TTL. */
export function esquecerCategorias() {
  cache = { em: 0, valor: [] }
}
