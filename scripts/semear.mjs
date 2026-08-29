/**
 * Conteudo inicial do blog: os materiais de captacao e os primeiros artigos.
 * Idempotente — rodar de novo nao duplica nada (roda no boot do container).
 */
import { q, garantirSchema } from '../src/lib/db.js'

await garantirSchema()

// Titulo e descricao do material sao do seed (o admin so acrescenta materiais
// novos, nao edita esses textos) — por isso o conflito ATUALIZA em vez de ignorar.
await q(
  `insert into material (slug, titulo, descricao, arquivo) values
   ('manual-rotacte', 'Manual completo do RotaCTe',
    'O guia do sistema inteiro: CT-e, MDF-e, NF-e, frota, motoristas, financeiro e relatórios — com as telas reais e o passo a passo de cada emissão.',
    'manual-rotacte.pdf'),
   ('calendario-da-reforma-tributaria', 'Calendário da reforma tributária para transportadoras',
    'Uma página com o que muda em cada ano até 2033, o que já precisa estar no seu emissor e o checklist do que revisar antes de cada virada.',
    'calendario-reforma-transportadoras.pdf')
   on conflict (slug) do update set titulo = excluded.titulo, descricao = excluded.descricao`,
)

const posts = [
  {
    slug: 'cte-rejeitado-como-ler-o-retorno-da-sefaz',
    categoria: 'cte',
    capa: 'capas/cte-rejeitado.webp',
    capaAlt: 'XML de CT-e com carimbo de rejeitado, ao lado dos tres desfechos possiveis do retorno da SEFAZ: autorizado, rejeicao e denegacao.',
    titulo: 'CT-e rejeitado: como ler o retorno da SEFAZ e resolver o que mais trava a emissão',
    resumo: 'A SEFAZ nunca recusa em silêncio: vem sempre um código e um motivo. Entenda a diferença entre rejeição, denegação e serviço fora do ar — e corrija os tropeços mais comuns.',
    md: `Quem emite CT-e todo dia sabe: a SEFAZ nunca recusa um documento em silêncio. Toda resposta traz um **código** (o cStat) e um **motivo** (o xMotivo) — e é ali que está o conserto. O problema é que o motivo costuma ser escrito para quem programou o emissor, não para quem está com o caminhão parado no pátio.

## Rejeição, denegação e "serviço fora" são coisas diferentes

- **Autorizado (cStat 100).** O documento existe, tem protocolo e vale. É o único desfecho que libera a viagem.
- **Rejeição.** O documento **não chegou a existir**: a SEFAZ olhou, achou erro e devolveu. Você corrige e envia de novo — inclusive com o mesmo número, porque nada foi consumido.
- **Denegação.** O documento fica registrado como negado por problema **cadastral** (irregularidade do emitente ou do destinatário). Aqui o número morre: não adianta reenviar igual, o caminho é resolver a situação cadastral.
- **Serviço em manutenção.** Não é o seu XML. É esperar ou entrar em contingência.

Guarde essa separação: ela decide se você corrige o arquivo, corrige o cadastro ou simplesmente espera.

## Os tropeços que mais aparecem

### 1. Falha de schema
O mais comum e o mais mal-entendido. O XML não bateu com o leiaute oficial: casa decimal a mais, valor fora da lista permitida para aquele campo, tag obrigatória ausente, caractere inválido no texto.

O detalhe cruel é que a resposta costuma dizer apenas "falha no schema", sem apontar o campo. Por isso um emissor sério valida contra o esquema oficial **antes** de enviar: o erro local aponta a linha, o erro da SEFAZ aponta o nada.

### 2. Duplicidade
Número já usado naquela série, ou chave que já existe com dados diferentes. Acontece muito quando se emite de dois lugares, ou quando um envio "deu erro de rede" e foi refeito sem consultar antes.

Regra de ouro: **antes de reemitir por timeout, consulte**. Se o documento passou, a consulta devolve o protocolo — e você não queima número à toa.

### 3. Certificado vencido
Parece bobagem até acontecer numa sexta-feira à tarde. O A1 vale um ano: coloque o vencimento no calendário com 30 dias de antecedência, não no dia.

### 4. Ambiente trocado
Emitiu em homologação achando que era produção. Documento de homologação **não vale nada** fiscalmente — e sai com aquela razão social de teste obrigatória. Confira o ambiente antes de rodar o mês inteiro.

### 5. Cadastro do tomador
Inscrição estadual inválida para a UF, CNPJ em situação irregular, endereço sem código de município. Boa parte das rejeições "estranhas" é cadastro velho no sistema, não erro de emissão.

### 6. Valores que não fecham
A soma dos componentes tem que bater com o total. Um arredondamento diferente entre a planilha e o XML derruba o documento inteiro.

## Como parar de tropeçar sempre nas mesmas pedras

1. **Valide antes de enviar.** Erro que aparece na sua tela custa trinta segundos; erro que aparece na SEFAZ custa uma ligação para a contabilidade.
2. **Guarde o XML de envio e o de retorno.** Sem o retorno você não prova nada — nem para o cliente, nem para o fisco.
3. **Numeração por série, com controle único.** Duas pessoas emitindo da mesma série sem trava é fábrica de duplicidade.
4. **Consulte antes de reemitir.**
5. **Leia o motivo inteiro.** Ele quase sempre nomeia o campo; a pressa é que faz parar na primeira palavra.

## Como o RotaCTe trata isso

O RotaCTe valida o documento contra os esquemas oficiais antes de enviar, guarda o XML de envio e o de retorno de cada tentativa e mostra o motivo da rejeição no próprio card do documento — em vez de um "erro ao emitir" genérico. Quando a recusa é de cadastro, o caminho até o campo errado é direto.`,
  },
  {
    slug: 'reforma-tributaria-no-transporte-o-que-muda',
    categoria: 'reforma-tributaria',
    capa: 'capas/reforma-tributaria.webp',
    capaAlt: 'Linha do tempo da reforma tributaria: 2026 ano de teste, 2027 CBS, 2029 a 2032 transicao e 2033 modelo pleno.',
    titulo: 'Reforma tributária no transporte: o que muda no CT-e e na NF-e, e quando',
    resumo: 'IBS e CBS entram no lugar de cinco tributos, e a mudança chega primeiro no documento fiscal. O calendário, os campos novos e o que fazer agora para não parar de emitir na virada.',
    md: `A reforma tributária (Emenda Constitucional 132/2023) troca cinco tributos por dois. Para quem transporta carga, a mudança chega **primeiro no documento fiscal** e só depois no bolso: 2026 é ano de ensaio, com o emissor já obrigado a mandar os campos novos.

## O que substitui o quê

| Sai | Entra |
| --- | --- |
| PIS e COFINS (federais) | **CBS** — Contribuição sobre Bens e Serviços |
| ICMS (estadual) e ISS (municipal) | **IBS** — Imposto sobre Bens e Serviços |
| IPI, na maior parte dos casos | **Imposto Seletivo**, só para itens específicos |

Os dois novos são impostos sobre valor agregado de verdade: não cumulativos, cobrados no destino e, na regra geral, com crédito amplo do que a empresa comprou. Para transportadora esse último ponto é o mais relevante — combustível, pneu, manutenção e pedágio entram na conta de crédito de um jeito diferente do ICMS de hoje.

## O calendário que interessa a quem emite

- **2026 — ano de teste.** As alíquotas são simbólicas (0,9% de CBS e 0,1% de IBS) e existem para o sistema aprender a calcular e destacar. O documento já sai com os grupos novos.
- **2027 — CBS pra valer.** PIS e COFINS acabam. É quando os valores param de ser exercício.
- **2029 a 2032 — transição do IBS.** ICMS e ISS vão encolhendo por fração enquanto o IBS cresce.
- **2033 — modelo pleno.**

Enquanto isso, a Receita publica **Notas Técnicas** que mudam o leiaute do CT-e, da NF-e e do MDF-e. É por elas que o prazo aperta de verdade: a nota entra em homologação alguns meses antes de valer em produção, e quem não atualizou o emissor simplesmente para de emitir no dia da virada.

## O que muda dentro do documento

Por item — ou por prestação, no CT-e — passa a existir um grupo de IBS/CBS com:

- **CST e cClassTrib**, a classificação tributária da operação. É um par novo, sem correspondente exato no que você usa hoje.
- **Base de cálculo e alíquotas** de IBS (uma parte estadual, outra municipal) e de CBS.
- Campos de **diferimento, crédito presumido e devolução de tributo**, que existem justamente porque a transição precisa de válvulas de escape.

Há ainda campos novos de valor do item e valor total do documento. Um detalhe que confunde muita gente: em 2026 esses campos **não somam** IBS/CBS — a soma só passa a valer em 2027. Quem adiantou a fórmula colheu rejeição.

## O que fazer agora, em ordem

1. **Confirme que seu emissor está na Nota Técnica vigente.** Não é opcional e não dá para deixar para a véspera.
2. **Teste em homologação.** É de graça, e é o único jeito de descobrir que falta um cadastro antes de faltar com o caminhão carregado.
3. **Revise o cadastro de serviços e produtos.** CST e cClassTrib precisam sair de algum lugar — melhor do cadastro do que da memória de quem emite às pressas.
4. **Converse com a contabilidade sobre o regime.** O Simples Nacional tem régua própria na reforma, e a conta de continuar nele muda conforme o crédito que o seu cliente passa a poder tomar.
5. **Simule o efeito no preço do frete.** Se o tomador passa a creditar integralmente o que paga a você, o peso do imposto na negociação muda. Quem entender isso primeiro negocia melhor.

## Como o RotaCTe está tratando

O RotaCTe já emite com os grupos de IBS/CBS da fase de teste e acompanha as Notas Técnicas conforme saem — cada versão é validada em homologação, contra a SEFAZ de verdade, antes de chegar em quem usa. A ideia é simples: quando a data virar, ninguém deveria descobrir a mudança pelo erro de emissão.

> As datas e regras acima seguem a legislação e as notas técnicas publicadas até a data deste artigo. Prazo de nota técnica muda — confirme a versão vigente antes de programar a virada. Este texto é informativo e não substitui a orientação da sua contabilidade.`,
  },
  {
    slug: 'mdfe-quando-e-obrigatorio-e-o-encerramento',
    categoria: 'mdfe',
    capa: 'capas/mdfe-encerramento.webp',
    capaAlt: 'Caminhao carregado de documentos na estrada, entre o ponto de origem e a bandeira de encerramento da viagem.',
    titulo: 'MDF-e: quando é obrigatório e por que o encerramento é o passo que mais dá dor de cabeça',
    resumo: 'O manifesto tem começo e fim — e é o fim que trava a frota. Entenda quando emitir, quais eventos existem e por que um MDF-e esquecido em aberto impede a próxima viagem.',
    md: `O MDF-e é o documento que amarra a viagem: um manifesto por veículo e por percurso, listando os CT-e e as NF-e que estão dentro da carroceria. Quem faz carga fracionada convive com ele todo dia — e quase sempre a dor não está em emitir, está em **encerrar**.

## Quando ele é obrigatório

A regra prática, sem entrar no cipoal de ajustes de cada estado:

- **Transportadora com mais de um documento no veículo.** Carga fracionada, com dois ou mais CT-e ou NF-e na mesma viagem, exige manifesto.
- **Carga própria em operação interestadual.** A empresa que transporta a própria mercadoria com veículo próprio também manifesta.
- **Redespacho e subcontratação** seguem a mesma lógica: quem está com a carga na rua responde pelo manifesto.

O MDF-e é emitido **antes de a viagem começar** e acompanha o veículo — na prática, pelo DAMDFE impresso ou na tela, com o código de barras legível.

## O erro que mais custa caro: o manifesto que ficou aberto

O manifesto tem começo e fim. O fim é o **evento de encerramento**, informando a UF e o município onde a carga foi entregue. Sem ele o documento fica em aberto para sempre — e três coisas ruins acontecem:

1. **A SEFAZ passa a barrar novos manifestos** para aquele veículo: para ela, ele ainda está viajando.
2. **A fiscalização enxerga uma viagem em curso** que terminou semanas atrás.
3. **O relatório de viagem não fecha.** Quilometragem, diária do motorista e custo do frete ficam pendurados num manifesto sem fim.

O encerramento é rápido e é justamente por isso que se esquece: ele acontece no pior momento possível, quando o caminhão chegou, o motorista foi embora e ninguém está pensando em sistema. Vale como regra de casa: **manifesto encerra no mesmo dia da chegada**, e alguém no escritório é dono dessa tarefa.

## Os outros eventos que você vai precisar

- **Inclusão de DF-e.** Pegou carga no meio do caminho? O documento novo entra no manifesto que já está na rua, sem refazer nada.
- **Inclusão de condutor.** Troca de motorista no percurso.
- **Cancelamento.** Só antes de a viagem começar e dentro do prazo curto. Depois disso o caminho é encerrar, não cancelar.
- **Pagamento da operação de transporte.** Onde entram os dados do frete contratado, quando é o caso.

## Checklist antes de rodar

- Placas e RNTRC batem com o cadastro?
- O condutor informado é quem está de fato dirigindo?
- O percurso tem as UFs na ordem certa — a de início, as de passagem, a de fim?
- Seguro e averbação da carga, quando exigidos?
- Todos os CT-e e NF-e que estão no veículo entraram na lista?

## Como o RotaCTe ajuda

No RotaCTe o manifesto nasce da viagem, não de um formulário em branco: os documentos da carga já entram na lista e o percurso vem da rota. O **Encerrar** fica no próprio card do manifesto autorizado, com município, UF e data já preenchidos a partir do que foi manifestado — encerrar deixa de ser um formulário e vira uma confirmação.`,
  },
  {
    slug: 'quem-precisa-emitir-cte-e-quando',
    categoria: 'cte',
    capa: 'capas/quem-emite-cte.webp',
    capaAlt: 'Tres situacoes e seus documentos: carga de terceiro usa CT-e, carga propria usa NF-e com MDF-e, e entrega municipal usa NFS-e.',
    titulo: "Quem precisa emitir CT-e — e quando",
    resumo: "Transportou carga de terceiro, cobrando pelo frete? CT-e. Carga própria? NF-e e MDF-e. Dentro do município? Outra nota. O guia direto de quem emite, quem não emite e a hora certa.",
    md: `A dúvida chega todo dia, de quem está abrindo transportadora e de quem já roda há anos: afinal, quem é obrigado a emitir CT-e? A resposta cabe numa regra de bolso — e o resto do artigo trata das exceções, que é onde mora a multa.

## A regra de bolso

**Transportou carga de outra pessoa, cobrando pelo serviço → CT-e.** O Conhecimento de Transporte eletrônico (modelo 57) é o documento fiscal da *prestação de serviço* de transporte de carga. Existe prestação quando alguém paga você para levar uma mercadoria que não é sua.

**Levou mercadoria própria, no seu veículo → não há CT-e**, porque não há serviço prestado a ninguém. O transporte roda acobertado pela NF-e da mercadoria — e pelo MDF-e, quando a viagem exige o manifesto.

Se você guardar só esses dois parágrafos, já erra menos que muita gente.

## Quem emite

- **Transportadoras (ETC)** — empresas de transporte rodoviário de carga, registradas na ANTT. É o caso clássico: cliente contrata, mercadoria de terceiro na carroceria, CT-e para cada prestação.
- **Cooperativas de transporte**, na mesma lógica.
- **Todos os modais.** O CT-e não é só do caminhão: rodoviário, aéreo, aquaviário, ferroviário e dutoviário usam o mesmo documento — ele aposentou os conhecimentos em papel, incluindo o velho CTRC.
- **Transporte de pessoas, valores ou excesso de bagagem** tem um irmão próprio: o **CT-e OS (modelo 67)**, com formulário reduzido — só tomador, descrição do serviço e valores.

## Quem não emite

**Quem carrega carga própria.** A indústria que leva produto para a filial, o atacado que entrega com frota própria, o produtor que escoa a safra no próprio caminhão: em todos esses casos o documento da mercadoria é a NF-e, e o da viagem, quando aplicável, é o MDF-e. Emitir CT-e aí seria documentar um serviço que não existe.

**O caminhoneiro autônomo (TAC).** Pessoa física não emite CT-e. Quem resolve o documento é quem contratou: se uma transportadora subcontrata o autônomo, ela emite o CT-e da prestação — e declara o frete pago a ele no CIOT, junto à ANTT. Se um embarcador contrata o autônomo direto, a forma de recolher o imposto varia por estado (substituição tributária, dispensa, regimes próprios) — esse é um caso para fechar com a contabilidade antes de rodar.

**Quem transporta só dentro do município.** Frete estritamente municipal é serviço de ISS, imposto da prefeitura — o documento é a nota de serviço municipal (NFS-e), não o CT-e. O CT-e entra quando a prestação cruza município ou estado, território do ICMS.

## Quando emitir

**Antes de a carga sair.** O CT-e autorizado gera o DACTE, que viaja junto com a mercadoria — é ele que a fiscalização pede no posto. Emitir depois que o caminhão partiu é rodar descoberto no trecho em que mais importa.

**Uma prestação, um CT-e.** Cada serviço contratado gera o seu documento, com remetente, destinatário e valor daquela prestação. Na carga fracionada isso significa vários CT-e na mesma viagem — e é o MDF-e que amarra todos ao veículo.

E os casos que fogem do padrão têm caminho próprio:

- **Subcontratação e redespacho**: quando uma transportadora passa o serviço a outra, o CT-e da subcontratada referencia o documento anterior. O passo a passo está na [central de ajuda](https://ajuda.rotacte.com.br/ct-e-de-subcontratacao-documento-anterior).
- **Complementar**: cobrou a menos? Emite-se um CT-e de complemento de valor, sem cancelar o original.
- **Anulação e substituição**: erro depois do prazo de cancelamento tem rito próprio, com um documento anulando e outro substituindo.
- **Contingência**: SEFAZ fora do ar não para a operação — o CT-e sai pela SEFAZ Virtual e a viagem acontece.

## A tabela de bolso

| Situação | Documento |
| --- | --- |
| Transportadora leva carga de cliente entre cidades | CT-e (modelo 57) |
| Indústria leva produto próprio à filial | NF-e + MDF-e |
| Autônomo (TAC) rodando para transportadora | CT-e da transportadora + CIOT |
| Entrega só dentro do município | NFS-e (ISS) |
| Transporte de pessoas, valores ou bagagem | CT-e OS (modelo 67) |

## O preço de rodar sem

Mercadoria sem documento fiscal correto é retida no posto até regularizar — com o cliente esperando na outra ponta. Vem multa, que varia por estado e cresce quando a fiscalização entende que houve intenção. O tomador perde o crédito do imposto. E, num sinistro, a seguradora vai olhar a documentação da carga antes de olhar qualquer outra coisa.

## Emitindo na prática

No RotaCTe o CT-e nasce num quadro: rascunho, revisão e envio ao governo, com validação contra os esquemas oficiais antes de a SEFAZ ver o documento — erro aparece na sua tela, não no posto fiscal. Subcontratação, complementar, OS, Simplificado e contingência estão no mesmo formulário, e o [passo a passo completo está na central de ajuda](https://ajuda.rotacte.com.br/emitir-um-ct-e-completo), com a ação gravada em GIF. Se a SEFAZ recusar, [este guia ensina a ler o retorno](/cte-rejeitado-como-ler-o-retorno-da-sefaz).

> Este artigo é informativo e reflete as regras gerais do CT-e. Situações de fronteira — autônomo contratado direto, regimes especiais, benefícios estaduais — variam por UF: confirme com a sua contabilidade antes de definir o fluxo fiscal da operação.`,
  },
]

for (const p of posts) {
  // A capa e reaplicada num blog que ja existe (o post veio antes das ilustracoes),
  // mas so quando esta faltando — texto editado no admin nunca e sobrescrito.
  await q(
    `insert into post (slug, titulo, resumo, conteudo_md, capa, capa_alt, categoria, status, publicado_em)
     values ($1,$2,$3,$4,$5,$6,$7,'PUBLICADO', now())
     on conflict (slug) do update set
       capa = coalesce(post.capa, excluded.capa),
       capa_alt = coalesce(post.capa_alt, excluded.capa_alt),
       categoria = coalesce(post.categoria, excluded.categoria)`,
    [p.slug, p.titulo, p.resumo, p.md, p.capa, p.capaAlt, p.categoria],
  )
}

// O seed ja publicou estes posts com capa PNG; as capas viraram WEBP (metade do
// peso). Troca so quem ainda aponta para o arquivo antigo do seed — capa enviada
// pelo admin nao e tocada.
for (const p of posts) {
  await q(`update post set capa = $1 where slug = $2 and capa = $3`,
    [p.capa, p.slug, p.capa.replace('.webp', '.png')])
}

const { rows } = await q(`select count(*)::int p from post`)
console.log(`semeado: ${rows[0].p} post(s), materiais ok`)
process.exit(0)
