/**
 * Aponta cada post para a capa nova. Recebe pares "slug=caminho=alt" e usa a coluna
 * certa conforme o blog: Reservya guarda `capa_url` (caminho pronto), RotaCTe guarda
 * `capa` (relativo a ./arquivos) + `capa_alt`.
 */
import { q } from '/app/src/lib/db.js'
const colunas = (await q(
  "select column_name from information_schema.columns where table_name='post'"
)).rows.map((r) => r.column_name)
const temCapaUrl = colunas.includes('capa_url')
const temAlt = colunas.includes('capa_alt')

for (const arg of process.argv.slice(2)) {
  const [slug, caminho, alt] = arg.split('=')
  const campos = temCapaUrl ? ['capa_url = $2'] : ['capa = $2']
  const vals = [slug, caminho]
  if (temAlt && alt) { campos.push(`capa_alt = $${vals.length + 1}`); vals.push(alt) }
  const r = await q(`update post set ${campos.join(', ')} where slug = $1 returning slug`, vals)
  console.log(r.rowCount ? `  ok  ${slug} -> ${caminho}` : `  !!  ${slug} nao encontrado`)
}
process.exit(0)
