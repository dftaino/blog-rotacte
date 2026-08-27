import { q } from '../../../lib/db.js'
import { autorizar, json } from '../../../lib/plataforma.js'

/**
 * Leads para o sync do Orbys. `?desde=ISO` traz so o que e novo — o Orbys guarda
 * o ultimo instante que viu e pergunta a partir dele.
 */
export async function GET({ request, url }) {
  const negado = autorizar(request)
  if (negado) return negado

  const desde = url.searchParams.get('desde')
  const data = desde && !Number.isNaN(Date.parse(desde)) ? new Date(desde) : new Date(0)
  const { rows } = await q(
    `select l.id, l.nome, l.email, l.whatsapp, l.origem, l.criado_em,
            m.titulo as material
     from lead l left join material m on m.id = l.material_id
     where l.criado_em > $1 order by l.criado_em asc limit 500`,
    [data],
  )
  return json({ leads: rows })
}
