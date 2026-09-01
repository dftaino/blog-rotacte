import { q } from '../../../lib/db.js'
import { autorizar, json } from '../../../lib/plataforma.js'

/** Retrato do blog para o painel do Orbys: audiencia + captacao, num payload so. */
export async function GET({ request }) {
  const negado = autorizar(request)
  if (negado) return negado

  const [hoje, mes, porDia, top, leads, porMaterial, posts] = await Promise.all([
    q(`select coalesce(sum(acessos),0)::int t from pageview where dia = (now() at time zone 'America/Sao_Paulo')::date`),
    q(`select coalesce(sum(acessos),0)::int t from pageview where dia >= (now() at time zone 'America/Sao_Paulo')::date - 29`),
    q(`select dia, sum(acessos)::int acessos from pageview where dia >= (now() at time zone 'America/Sao_Paulo')::date - 29 group by dia order by dia`),
    q(`select rota, sum(acessos)::int acessos from pageview where dia >= (now() at time zone 'America/Sao_Paulo')::date - 29
       group by rota order by acessos desc limit 8`),
    q(`select count(*)::int total,
              count(*) filter (where criado_em >= now() - interval '30 days')::int mes,
              count(*) filter (where (criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date)::int hoje from lead`),
    q(`select m.titulo, count(*)::int total from lead l join material m on m.id = l.material_id
       group by m.titulo order by total desc`),
    q(`select count(*)::int t from post where status = 'PUBLICADO'`),
  ])

  return json({
    geradoEm: new Date().toISOString(),
    acessos: { hoje: hoje.rows[0].t, dias30: mes.rows[0].t, porDia: porDia.rows },
    paginasMaisVistas: top.rows,
    leads: { hoje: leads.rows[0].hoje, dias30: leads.rows[0].mes, total: leads.rows[0].total, porMaterial: porMaterial.rows },
    postsPublicados: posts.rows[0].t,
  })
}
