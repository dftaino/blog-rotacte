export function GET() {
  const site = (process.env.SITE_URL || 'https://blog.rotacte.com.br').replace(/\/$/, '')
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /baixar\nDisallow: /busca\n\nSitemap: ${site}/sitemap.xml\n`,
    { headers: { 'Content-Type': 'text/plain' } })
}
