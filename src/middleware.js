import { garantirSchema, registrarAcesso } from './lib/db.js'
import { sessaoValida } from './lib/admin.js'

const BOT = /bot|crawler|spider|slurp|curl|wget|python-requests|monitor|lighthouse|headless/i

/**
 * Duas responsabilidades de borda:
 *  1. proteger /admin (menos a tela de entrada);
 *  2. contar o acesso de pagina publica — depois da resposta pronta, so em HTML
 *     200 de gente (bots de busca sao bem-vindos na pagina, nao na metrica).
 */
export async function onRequest(contexto, next) {
  await garantirSchema()
  const { url, request, cookies } = contexto
  const rota = url.pathname.replace(/\/+$/, '') || '/'

  if (rota.startsWith('/admin') && rota !== '/admin/entrar') {
    if (!sessaoValida(cookies)) {
      return Response.redirect(new URL('/admin/entrar', url), 303)
    }
  }

  const resposta = await next()

  const ehHtml = (resposta.headers.get('content-type') || '').includes('text/html')
  const publica = !rota.startsWith('/admin') && !rota.startsWith('/api') && !rota.startsWith('/baixar')
  const gente = !BOT.test(request.headers.get('user-agent') || '')
  if (request.method === 'GET' && resposta.status === 200 && ehHtml && publica && gente) {
    registrarAcesso(rota).catch(() => {}) // metrica nunca derruba a pagina
  }
  return resposta
}
