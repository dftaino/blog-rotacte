# Stories — post "Dez clientes não precisam de dez logins"

Post: https://blog.rotacte.com.br/sistema-emissor-para-contador
Seis quadros, **todos já renderizados** — nada para montar no app:

| quadro | arquivo |
|---|---|
| 1 · abertura | `arquivos/imagens/stories-sistema-emissor-contador.jpg` (título + faixa de foto) |
| 2 a 6 | `arquivos/imagens/stories-sistema-emissor-contador-<n>.jpg` (texto sobre o espresso) |

Os seis saem **deste arquivo**, num comando só:

```bash
python3 scripts/gerar-stories.py --marca rotacte \
  --abertura arquivos/fotos/escritorio-logistica.jpg \
  --olho "Sistema emissor para contador" \
  --titulo "Dez clientes|não precisam|de dez logins." --foco "center 45%" \
  arquivos/stories-sistema-emissor-contador.md
```

Mexeu no texto daqui, roda de novo — não editar a imagem à mão. ⚠️ A abertura do RotaCTe
**não** sai do `gerar-capa.py --formato stories`: aquele põe foto sangrando com véu e texto
em cima, que é o tratamento do Reservya e o que a identidade ROTA proíbe.

A **linha de rota anda com o story**: 0 na abertura, 20% no primeiro texto e fechada no
sexto, que é o do link.

---

**1 · abertura** — usar a imagem pronta, sem texto por cima.

Ela já diz "Dez clientes não precisam de dez logins". Deixe respirar.

---

**2 · o caso**

> Dia 5, dez e meia da manhã.
>
> Sete abas abertas: dois portais da SEFAZ, três sistemas de emissão e um WhatsApp pedindo
> "me manda os XML de setembro".
>
> Às quatro da tarde ainda falta um.

---

**3 · quem emite, herda**

> Emitir pelo cliente é comum e faz sentido.
>
> Só que junto vêm a numeração dele, o CNPJ dele, o certificado dele e a guarda do XML dele.
>
> Quando um dos quatro sai errado, quem conserta é o escritório.

*Sugestão de figurinha: enquete "Seu escritório emite pelos clientes?" → Todo mês / Nunca*

---

**4 · o arquivo tem prazo**

> Guardar o XML é obrigação do contribuinte, pelos cinco anos do prazo decadencial.
>
> Na prática, quem é cobrado pelo arquivo é você.
>
> E "a gente trocou de sistema" não é resposta.

---

**5 · a pergunta certa**

> "O sistema é bom?" é pergunta incompleta.
>
> A que decide é outra: o que ele devolve para quem escritura, e em quantos cliques?

---

**6 · a pergunta + link**

> No dia 5, o arquivo está onde você espera que ele esteja?

*Figurinha de link para o post. Texto do botão: **Ler no blog***

---

## Variações do quadro 6, se quiser testar

- "Escrevi as 7 perguntas que separam um emissor que serve ao escritório de um que só serve ao emitente."
- "Dez clientes, dez logins, dez certificados vencendo em datas diferentes. Tem outro jeito."

## Legenda, se virar post de feed

> Dia 5, dez e meia: sete abas abertas, dois portais da SEFAZ, três sistemas de emissão e um
> WhatsApp pedindo os XML do mês. Às quatro da tarde ainda falta um, e ninguém tem a chave
> para buscar no portal.
>
> Esse dia não é um problema de fechamento. É a conta de uma decisão tomada trinta dias
> antes, quando o documento foi emitido num lugar que não foi pensado para quem escritura.
>
> No blog eu listo as 7 perguntas que separam um emissor que serve ao escritório de um que só
> serve ao emitente — numeração por CNPJ, XML em lote, aviso de certificado vencendo, rejeição
> traduzida e a forma de cobrança.
>
> Link na bio.
