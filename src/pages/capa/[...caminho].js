import fs from 'node:fs'
import path from 'node:path'

const RAIZ = process.env.ARQUIVOS_DIR || path.resolve('./arquivos')

const TIPOS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

/**
 * Serve a capa do post. Publica e cacheavel (entra no og:image e no card da home),
 * mas so de dentro de arquivos/: as do seed em `capas/`, as enviadas pelo admin em
 * `enviados/capas/` — que e o volume, o unico lugar que sobrevive a um rebuild.
 */
export async function GET({ params }) {
  const pedido = String(params.caminho || '')
  if (!pedido.startsWith('capas/') && !pedido.startsWith('enviados/capas/')) {
    return new Response('Nao encontrado', { status: 404 })
  }
  const ext = path.extname(pedido).toLowerCase()
  if (!TIPOS[ext]) return new Response('Tipo nao suportado', { status: 404 })

  const caminho = path.join(RAIZ, path.normalize(pedido).replace(/^([.][.][/\\])+/, ''))
  if (!caminho.startsWith(RAIZ) || !fs.existsSync(caminho)) {
    return new Response('Nao encontrado', { status: 404 })
  }
  return new Response(fs.readFileSync(caminho), {
    headers: {
      'Content-Type': TIPOS[ext],
      // O nome do arquivo carrega timestamp quando vem do admin, entao cache longo e seguro.
      'Cache-Control': 'public, max-age=604800',
    },
  })
}
