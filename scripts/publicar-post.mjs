/**
 * Publica um post lido da entrada padrao (markdown com cabecalho ---).
 * Roda DENTRO do container do blog: reusa src/lib/db.js, entao nao precisa
 * de senha nenhuma na linha de comando.
 *
 *   docker cp scripts/publicar-post.mjs <container>:/app/scripts/
 *   cat post.md | docker exec -i <container> node /app/scripts/publicar-post.mjs
 *
 * Cabecalho esperado (slug, titulo e resumo sao obrigatorios):
 *
 *   ---
 *   slug: meu-post
 *   titulo: "Titulo do post"
 *   resumo: "Uma frase que aparece no cartao da home."
 *   categoria: Agenda
 *   ---
 *
 * Idempotente: rodar de novo com o mesmo slug ATUALIZA o post em vez de duplicar —
 * entao corrigir um texto e mandar o arquivo de novo.
 */
import { q, garantirSchema } from '/app/src/lib/db.js'

const bruto = await new Promise((ok) => {
  let b = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => (b += c))
  process.stdin.on('end', () => ok(b))
})

const m = bruto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
if (!m) {
  console.error('Sem cabecalho --- no comeco do arquivo')
  process.exit(1)
}
const meta = {}
for (const linha of m[1].split(/\r?\n/)) {
  const p = linha.match(/^(\w+):\s*(.*)$/)
  if (p) meta[p[1]] = p[2].trim().replace(/^"(.*)"$/, '$1')
}
const md = m[2].trim()
for (const campo of ['slug', 'titulo', 'resumo']) {
  if (!meta[campo]) {
    console.error('Falta o campo ' + campo + ' no cabecalho')
    process.exit(1)
  }
}

await garantirSchema()
const r = await q(
  `insert into post (slug, titulo, resumo, conteudo_md, categoria, status, publicado_em)
   values ($1,$2,$3,$4,$5,'PUBLICADO', now())
   on conflict (slug) do update set
     titulo = excluded.titulo, resumo = excluded.resumo,
     conteudo_md = excluded.conteudo_md, categoria = excluded.categoria,
     status = 'PUBLICADO', atualizado_em = now()
   returning slug, status, categoria, publicado_em, length(conteudo_md) as tamanho`,
  [meta.slug, meta.titulo, meta.resumo, md, meta.categoria || null],
)
const p = r.rows[0]
console.log(`  ${p.slug} · ${p.status} · categoria=${p.categoria} · ${p.tamanho} caracteres`)
console.log(`  publicado_em=${p.publicado_em ? new Date(p.publicado_em).toISOString() : '(nulo)'}`)
process.exit(0)
