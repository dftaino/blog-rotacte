import fs from 'node:fs'
import path from 'node:path'
import { q } from '../../../lib/db.js'

const RAIZ = process.env.ARQUIVOS_DIR || path.resolve('./arquivos')

/** Entrega o PDF do lead. O arquivo nunca e servido por caminho direto: so via chave. */
export async function GET({ params }) {
  const { rows } = await q(
    `select m.arquivo, m.titulo from lead l join material m on m.id = l.material_id
     where l.chave = $1`, [params.chave],
  )
  if (rows.length === 0) return new Response('Nao encontrado', { status: 404 })

  const seguro = path.normalize(rows[0].arquivo).replace(/^([.][.][/\\])+/, '')
  const caminho = path.join(RAIZ, seguro)
  if (!caminho.startsWith(RAIZ) || !fs.existsSync(caminho)) {
    return new Response('Arquivo indisponivel', { status: 404 })
  }
  const nomeLimpo = rows[0].titulo.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '').trim().replace(/\s+/g, '-').toLowerCase()
  return new Response(fs.readFileSync(caminho), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomeLimpo}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
