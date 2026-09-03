import { q } from '../../../lib/db.js'
import { autorizar, json } from '../../../lib/plataforma.js'

/**
 * Retrato do blog para o painel do Orbys: audiencia + captacao, num payload so.
 *
 * Aceita ?de=AAAA-MM-DD&ate=AAAA-MM-DD. Sem eles a janela e a de sempre — os ultimos
 * 30 dias —, entao painel que ainda nao manda o periodo continua funcionando igual.
 *
 * Dois campos NAO seguem a janela, de proposito: `hoje` (e o numero do dia corrente) e
 * `leads.porMaterial` (e o acumulado de cada material desde o inicio).
 */
const DIA = /^\d{4}-\d{2}-\d{2}$/

/** Data valida ou null — parametro torto cai no padrao em vez de derrubar o painel. */
const dia = (v) => (v && DIA.test(v) ? v : null)

export async function GET({ request }) {
  const negado = autorizar(request)
  if (negado) return negado

  const p = new URL(request.url).searchParams
  let de = dia(p.get('de'))
  let ate = dia(p.get('ate'))
  if (de && ate && de > ate) [de, ate] = [ate, de] // invertido: conserta em vez de devolver vazio

  const janela = de && ate
  const filtroDia = janela ? 'dia between $1 and $2' : "dia >= (now() at time zone 'America/Sao_Paulo')::date - 29"
  const filtroLead = janela
    ? "(criado_em at time zone 'America/Sao_Paulo')::date between $1 and $2"
    : "criado_em >= now() - interval '30 days'"
  const args = janela ? [de, ate] : []

  const [hoje, periodo, porDia, top, leads, porMaterial, posts] = await Promise.all([
    q(`select coalesce(sum(acessos),0)::int t from pageview where dia = (now() at time zone 'America/Sao_Paulo')::date`),
    q(`select coalesce(sum(acessos),0)::int t from pageview where ${filtroDia}`, args),
    q(`select dia, sum(acessos)::int acessos from pageview where ${filtroDia} group by dia order by dia`, args),
    q(
      `select rota, sum(acessos)::int acessos from pageview where ${filtroDia}
       group by rota order by acessos desc limit 8`,
      args,
    ),
    q(
      `select count(*)::int total,
              count(*) filter (where ${filtroLead})::int periodo,
              count(*) filter (where (criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date)::int hoje
         from lead`,
      args,
    ),
    q(`select m.titulo, count(*)::int total from lead l join material m on m.id = l.material_id
       group by m.titulo order by total desc`),
    q(`select count(*)::int t from post where status = 'PUBLICADO'`),
  ])

  return json({
    geradoEm: new Date().toISOString(),
    janela: { de, ate }, // null nos dois = "ultimos 30 dias"
    // 'dias30' mantem o nome para nao quebrar painel antigo; com ?de&ate e o total da janela
    acessos: { hoje: hoje.rows[0].t, dias30: periodo.rows[0].t, porDia: porDia.rows },
    paginasMaisVistas: top.rows,
    leads: {
      hoje: leads.rows[0].hoje,
      dias30: leads.rows[0].periodo,
      total: leads.rows[0].total,
      porMaterial: porMaterial.rows,
    },
    postsPublicados: posts.rows[0].t,
  })
}
