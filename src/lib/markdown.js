import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

/**
 * Markdown -> HTML seguro. O sanitize existe porque o conteudo vem do banco:
 * mesmo sendo so o admin quem escreve, um post nunca deve conseguir injetar
 * script na pagina de um leitor.
 */
export function render(md) {
  const bruto = marked.parse(md || '', { async: false })
  return sanitizeHtml(bruto, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'figure', 'figcaption']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'loading'],
      a: ['href', 'title', 'rel', 'target'],
    },
  })
}
