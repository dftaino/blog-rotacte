/**
 * Limite de tentativas por IP, em memoria. Serve tanto para o login do admin
 * quanto para o formulario publico de material — sem isso, um robo enche a
 * tabela de leads (e a caixa de entrada de quem cuida deles) em minutos.
 */
const baldes = new Map()

/** Consome uma tentativa. `true` = pode seguir. */
export function permitido(chave, max, janelaMs) {
  const agora = Date.now()
  const marcas = (baldes.get(chave) || []).filter((t) => agora - t < janelaMs)
  if (marcas.length >= max) {
    baldes.set(chave, marcas)
    return false
  }
  marcas.push(agora)
  baldes.set(chave, marcas)
  return true
}

/**
 * IP real de quem chamou. O nginx da VPS usa `$proxy_add_x_forwarded_for`, que
 * ACRESCENTA o IP verdadeiro ao fim do cabecalho — entao o ultimo item e o unico
 * que o cliente nao consegue forjar. Sem cabecalho, vale o socket.
 */
export function ipDoPedido(request, clientAddress) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const partes = xff.split(',').map((p) => p.trim()).filter(Boolean)
    if (partes.length) return partes[partes.length - 1]
  }
  return clientAddress || 'desconhecido'
}

/** Faxina periodica: sem isso o mapa guarda um IP que passou uma vez, para sempre. */
const LIMPEZA = 15 * 60_000
setInterval(() => {
  const agora = Date.now()
  for (const [chave, marcas] of baldes) {
    if (!marcas.length || agora - marcas[marcas.length - 1] > LIMPEZA) baldes.delete(chave)
  }
}, LIMPEZA).unref?.()
