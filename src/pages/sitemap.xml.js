import { q } from '../lib/db.js'

export async function GET() {
  const site = (process.env.SITE_URL || 'https://blog.rotacte.com.br').replace(/\/$/, '')
  const { rows: posts } = await q(`select slug, atualizado_em from post where status='PUBLICADO'`)
  const { rows: mats } = await q(`select slug from material where ativo`)
  const urls = [
    `<url><loc>${site}/</loc></url>`,
    `<url><loc>${site}/materiais</loc></url>`,
    ...posts.map((p) => `<url><loc>${site}/${p.slug}</loc><lastmod>${new Date(p.atualizado_em).toISOString().slice(0, 10)}</lastmod></url>`),
    ...mats.map((m) => `<url><loc>${site}/materiais/${m.slug}</loc></url>`),
  ].join('')
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  )
}
