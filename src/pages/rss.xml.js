import { q } from '../lib/db.js'

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function GET() {
  const site = (process.env.SITE_URL || 'https://blog.rotacte.com.br').replace(/\/$/, '')
  const { rows } = await q(
    `select slug, titulo, resumo, publicado_em from post where status='PUBLICADO' order by publicado_em desc limit 50`,
  )
  const itens = rows.map((p) => `
    <item>
      <title>${esc(p.titulo)}</title>
      <link>${site}/${p.slug}</link>
      <guid>${site}/${p.slug}</guid>
      <description>${esc(p.resumo)}</description>
      <pubDate>${new Date(p.publicado_em).toUTCString()}</pubDate>
    </item>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Blog RotaCTe</title>
  <link>${site}</link>
  <description>CT-e, MDF-e, reforma tributaria e custo de frota para transportadoras.</description>
  <language>pt-BR</language>${itens}
</channel></rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
