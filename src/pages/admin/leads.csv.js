import { q } from '../../lib/db.js'

export async function GET() {
  const { rows } = await q(
    `select l.nome, l.email, coalesce(l.whatsapp,'') whatsapp, coalesce(m.titulo,'') material,
            to_char(l.criado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') quando
     from lead l left join material m on m.id = l.material_id order by l.criado_em desc`,
  )
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
  const linhas = [
    'nome;email;whatsapp;material;quando',
    ...rows.map((r) => [r.nome, r.email, r.whatsapp, r.material, r.quando].map(esc).join(';')),
  ].join('\r\n')
  return new Response('﻿' + linhas, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads-blog-rotacte.csv"',
    },
  })
}
