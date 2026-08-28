import crypto from 'node:crypto'

/**
 * Admin de uma pessoa so: a senha vem do ambiente e o cookie carrega um HMAC
 * derivado dela — nao a propria senha. Trocou a senha, toda sessao antiga cai.
 */
const SENHA = process.env.ADMIN_SENHA || ''

const assinatura = () =>
  crypto.createHmac('sha256', SENHA).update('sessao-admin').digest('hex')

export function senhaConfere(tentativa) {
  if (!SENHA || SENHA.length < 12) return false // sem senha forte, admin desligado
  const a = Buffer.from(String(tentativa || ''))
  const b = Buffer.from(SENHA)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function cookieDeSessao() {
  return assinatura()
}

export function sessaoValida(cookies) {
  if (!SENHA || SENHA.length < 12) return false
  const v = cookies.get('adm')?.value || ''
  const esperado = assinatura()
  return v.length === esperado.length &&
    crypto.timingSafeEqual(Buffer.from(v), Buffer.from(esperado))
}

/**
 * Trava de tentativas do login: 10 falhas por IP a cada 10 minutos. Aqui a
 * contagem e propria (e nao a do lib/limite.js) porque so a falha conta: abrir
 * a tela de login nao pode gastar tentativa de quem sabe a senha.
 */
const falhas = new Map()
export function podeTentar(ip) {
  const agora = Date.now()
  const recentes = (falhas.get(ip) || []).filter((t) => agora - t < 10 * 60_000)
  if (recentes.length) falhas.set(ip, recentes); else falhas.delete(ip)
  return recentes.length < 10
}
export function registrarFalha(ip) {
  const f = falhas.get(ip) || []
  f.push(Date.now())
  falhas.set(ip, f)
}
// Faxina: IP que errou e sumiu nao pode ficar na memoria para sempre.
setInterval(() => {
  const agora = Date.now()
  for (const [ip, marcas] of falhas) {
    if (!marcas.length || agora - marcas[marcas.length - 1] > 10 * 60_000) falhas.delete(ip)
  }
}, 10 * 60_000).unref?.()
