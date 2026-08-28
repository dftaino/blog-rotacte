import crypto from 'node:crypto'
import { q } from '../../lib/db.js'
import { permitido, ipDoPedido } from '../../lib/limite.js'

/**
 * Recebe o form do material e devolve o leitor direto para o download.
 * O lead ganha uma chave propria: e ela que libera o arquivo, entao o link
 * funciona de novo se a pessoa perder o PDF — sem refazer o cadastro.
 */
export async function POST({ request, redirect, clientAddress }) {
  // Formulario publico: 5 envios por IP a cada 10 minutos ja atende gente de
  // verdade (dois materiais, alguma repeticao) e corta robo de cadastro.
  if (!permitido(`lead:${ipDoPedido(request, clientAddress)}`, 5, 10 * 60_000)) {
    return new Response('Muitas tentativas seguidas. Tente de novo em alguns minutos.', { status: 429 })
  }
  const form = await request.formData()
  const nome = String(form.get('nome') || '').trim().slice(0, 120)
  const email = String(form.get('email') || '').trim().toLowerCase().slice(0, 160)
  const whatsapp = String(form.get('whatsapp') || '').trim().slice(0, 20) || null
  const materialSlug = String(form.get('material') || '').trim()

  const volta = `/materiais/${encodeURIComponent(materialSlug)}`
  if (!nome || !email) return redirect(`${volta}?erro=campos`, 303)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return redirect(`${volta}?erro=email`, 303)

  const { rows } = await q(`select id from material where slug = $1 and ativo`, [materialSlug])
  if (rows.length === 0) return redirect('/materiais', 303)

  // Mesmo e-mail no mesmo material: reaproveita o lead (e a chave) em vez de duplicar.
  const existente = await q(
    `select chave from lead where email = $1 and material_id = $2 limit 1`,
    [email, rows[0].id],
  )
  if (existente.rows.length > 0) return redirect(`/baixar/${existente.rows[0].chave}`, 303)

  const chave = crypto.randomUUID()
  await q(
    `insert into lead (nome, email, whatsapp, material_id, origem, chave)
     values ($1, $2, $3, $4, $5, $6)`,
    [nome, email, whatsapp, rows[0].id, materialSlug, chave],
  )
  return redirect(`/baixar/${chave}`, 303)
}
