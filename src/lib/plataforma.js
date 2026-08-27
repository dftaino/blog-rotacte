import crypto from 'node:crypto'

/**
 * Token fixo do painel cross-sistema, no mesmo desenho do X-Plataforma-Token do
 * RotaCTe: sem token configurado (ou curto demais), o endpoint nem sobe.
 */
const TOKEN = process.env.PLATAFORMA_TOKEN || ''

export function autorizar(request) {
  if (!TOKEN || TOKEN.length < 24) {
    return new Response(JSON.stringify({ erro: 'Integracao desativada (defina PLATAFORMA_TOKEN, minimo 24 caracteres)' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } })
  }
  const veio = request.headers.get('x-blog-token') || ''
  const a = Buffer.from(veio); const b = Buffer.from(TOKEN)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return new Response(JSON.stringify({ erro: 'Token invalido' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } })
  }
  return null
}

export const json = (corpo) =>
  new Response(JSON.stringify(corpo), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
