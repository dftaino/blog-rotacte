/**
 * Datas sempre no fuso de Sao Paulo. O container roda em UTC: sem isso, um post
 * publicado as 21h de terca aparece com a data de quarta para o leitor daqui.
 */
const SP = 'America/Sao_Paulo'

export const dataBr = (d) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: SP })

export const dataCurtaBr = (d) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: SP })

export const dataHoraBr = (d) =>
  new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: SP })
