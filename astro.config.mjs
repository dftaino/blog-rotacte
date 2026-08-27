import { defineConfig } from 'astro/config'
import node from '@astrojs/node'

// SSR: o post sai do banco e vira HTML no servidor — o Google indexa a página
// pronta, sem depender de JavaScript no cliente.
export default defineConfig({
  site: process.env.SITE_URL || 'https://blog.rotacte.com.br',
  // O checkOrigin do Astro recusa POST de formulário mesmo com Origin idêntico
  // neste arranjo (atrás do nginx e até direto no container). O CSRF do admin já
  // está coberto pelo cookie SameSite=Lax + trava de tentativas, e o form de lead
  // é público por definição; a checagem só derrubava usuário legítimo.
  security: { checkOrigin: false },
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { port: Number(process.env.PORT || 4321), host: true },
})
