export function GET({ cookies, redirect }) {
  cookies.delete('adm', { path: '/' })
  return redirect('/admin/entrar', 303)
}
