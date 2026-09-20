#!/usr/bin/env python3
"""
Renderiza os quadros de texto do story de um post, lendo o próprio roteiro.

    python3 scripts/gerar-stories.py --marca reservya arquivos/stories-manicure.md

O roteiro em `arquivos/stories-<slug>.md` é a fonte: mexeu no texto de lá, roda de novo e
as imagens acompanham. Cada quadro é um bloco assim —

    **2 · o caso**

    > primeira frase, que sai em destaque
    >
    > as seguintes, menores

O quadro 1 é a imagem pronta do gerador de capa (`--formato stories`) e fica de fora.
Linhas em itálico (`*Sugestão de figurinha: ...*`) são recado para quem posta, não texto de
tela, e também ficam de fora.

Saída: `arquivos/imagens/stories-<slug>-<n>.jpg`, 1080x1920, JPEG — o Instagram não aceita
webp no story.

Mesmo script nos dois blogs, como o gerar-capa.py — mas `--marca` NÃO é só paleta: cada
marca traz o próprio LAYOUT, porque as duas identidades discordam no desenho, não na cor.

- **reservya**: régua coral no alto, texto centrado no quadro, brilho radial suave no fundo.
- **rotacte**: identidade ROTA — logotipo no alto, tipografia mandando, e a **linha de rota
  avançando de quadro em quadro** (Coleta → anel → Contador), que é a assinatura da marca.
  Sem degradê em lugar nenhum: a regra 3 da identidade proíbe.

⚠️ A primeira versão disto era o layout do Reservya recolorido, e ficou com cara de peça
emprestada — que é exatamente o que a identidade do RotaCTe existe para evitar.

Precisa de google-chrome e Pillow. As fontes são os woff2 locais: sem rede.
"""
import argparse
import pathlib
import re
import subprocess
import sys
import tempfile

L, A = 1080, 1920

MARCA_ROTACTE = "/home/dftaiho/Projetos/rotacte-criativos/marca"

MARCAS = {
    "reservya": {
        "fonte": "Montserrat",
        "arquivo": "file:///home/dftaiho/Projetos/reservya.com.br/public_html/assets/fonts/"
                   "montserrat-latin-wght-normal.woff2",
        "peso_destaque": 800, "peso_corpo": 500, "aperto": "-.025em",
        "fundo": "#0f2c2b", "regua": "#E8926B", "claro": "#F6FAF9",
        "apoio": "#b9d2cf", "pe": "#8fc0bf", "brilho": "143,199,200",
        "site": "blog.reservya.com.br",
    },
    "rotacte": {
        "fonte": "Open Sans",
        "arquivo": f"file://{MARCA_ROTACTE}/opensans-latin.woff2",
        # Open Sans não aperta como a Montserrat; -.02em é o aperto da identidade ROTA.
        "peso_destaque": 800, "peso_corpo": 400, "aperto": "-.02em",
        "fundo": "#23201a", "ouro": "#b8860b", "ouro_claro": "#d0a63c",
        "claro": "#faf8f3", "apoio": "#cfc6b4", "pe": "#cfc6b4",
        "site": "blog.rotacte.com.br",
    },
}

# 300px embaixo é onde a barra de resposta do Instagram entra; 200 em cima, onde fica o
# avatar de quem postou. O texto vive no meio, que é o que sobra.
MARGEM, TOPO_SEGURO, BASE_SEGURA = 88, 200, 300

PAGINA = """<!doctype html>
<html><head><meta charset="utf-8" /><style>
  @font-face{{font-family:'{fonte}';src:url('{arquivo}') format('woff2');
             font-weight:100 900;font-display:block;}}
  *{{box-sizing:border-box}}
  html,body{{margin:0;padding:0;width:{L}px;height:{A}px;overflow:hidden;background:{fundo};}}
  .quadro{{position:relative;width:{L}px;height:{A}px;font-family:'{fonte}',sans-serif;}}
  p{{margin:0;color:{apoio};font-size:46px;font-weight:{peso_corpo};line-height:1.34;
     letter-spacing:-.01em;}}
  p+p{{margin-top:34px;}}
  p.destaque{{color:{claro};font-size:62px;font-weight:{peso_destaque};line-height:1.16;
              letter-spacing:{aperto};}}
  .pe{{position:absolute;left:{margem}px;bottom:190px;color:{pe};font-size:27px;
       font-weight:600;letter-spacing:1.4px;}}
  {estilo}
</style></head>
<body><div class="quadro">{corpo}<div class="pe">{site}</div></div></body></html>
"""

# --- reservya: régua coral, texto centrado, brilho radial suave -----------------------
ESTILO_RESERVYA = """
  /* um brilho leve no alto à esquerda tira o chapado do verde sem virar decoração */
  .luz{position:absolute;inset:0;background:
       radial-gradient(120% 70% at 12% 8%, rgba(143,199,200,.16), rgba(15,44,43,0) 60%);}
  .bloco{position:absolute;left:88px;right:88px;top:200px;bottom:300px;
         display:flex;flex-direction:column;justify-content:center;}
  .regua{width:64px;height:6px;border-radius:3px;background:#E8926B;margin:0 0 40px;}
"""


def corpo_reservya(paragrafos, _passo, _total):
    return ('<div class="luz"></div>'
            f'<div class="bloco"><div class="regua"></div>{paragrafos}</div>')


# --- rotacte: identidade ROTA — logotipo, tipografia mandando, linha de rota que anda --
ESTILO_ROTACTE = """
  .lock{position:absolute;left:88px;top:150px;}
  .lock img{display:block;width:214px;height:62px;}
  .bloco{position:absolute;left:88px;right:88px;top:300px;bottom:560px;
         display:flex;flex-direction:column;justify-content:center;}
  /* a linha de rota vive logo acima da área que o Instagram cobre */
  .rota{position:absolute;left:88px;right:88px;bottom:380px;
        display:flex;align-items:center;gap:20px;}
  .rota .no{width:18px;height:18px;border-radius:50%;flex:none;}
  .rota .cheio{background:#b8860b;}
  .rota .vazio{border:4px solid #b8860b;}
  .rota .rotulo{font-size:16px;font-weight:700;letter-spacing:.22em;
                text-transform:uppercase;color:#d0a63c;flex:none;}
  .rota .trilho{flex:1;position:relative;height:48px;display:flex;align-items:center;}
  .rota .apagado{position:absolute;inset:0;display:flex;align-items:center;}
  .rota .apagado i{width:100%;height:3px;display:block;background:
      repeating-linear-gradient(90deg,rgba(184,134,11,.22) 0 18px,transparent 18px 34px);}
  .rota .andado{position:absolute;left:0;display:flex;align-items:center;}
  .rota .andado i{flex:1;height:3px;display:block;background:
      repeating-linear-gradient(90deg,#b8860b 0 18px,transparent 18px 34px);}
  .rota .anel{width:48px;height:48px;flex:none;}
"""


def corpo_rotacte(paragrafos, passo, total):
    """O trajeto anda com o story: quadro 1 de 5 = 20%, quadro 5 de 5 = fechado.

    É o mesmo recurso do Reels da campanha, na velocidade do dedo de quem toca a tela em
    vez da do vídeo. Quem chega ao último quadro vê a rota completa — e o último quadro é
    justamente o da pergunta e do link.
    """
    p = max(0.06, min(1.0, passo / total))
    fim = "cheio" if p >= 0.999 else "vazio"
    return f'''
  <div class="lock"><img src="file://{MARCA_ROTACTE}/rotacte-logo-branco.svg"></div>
  <div class="bloco">{paragrafos}</div>
  <div class="rota">
    <div class="no cheio"></div><div class="rotulo">Coleta</div>
    <div class="trilho">
      <div class="apagado"><i></i></div>
      <div class="andado" style="width:{p * 100:.1f}%;">
        <i></i><img class="anel" src="file://{MARCA_ROTACTE}/rotacte-anel-ouro.svg">
      </div>
    </div>
    <div class="no {fim}"></div><div class="rotulo">Contador</div>
  </div>'''


LAYOUTS = {
    "reservya": (ESTILO_RESERVYA, corpo_reservya),
    "rotacte": (ESTILO_ROTACTE, corpo_rotacte),
}


def quadros(md):
    """Devolve [(numero, [paragrafos])] dos quadros que têm texto de tela."""
    achados = []
    for bloco in re.split(r"\n---+\n", md):
        cab = re.search(r"\*\*(\d+)\s*·", bloco)
        if not cab:
            continue
        # Só o que está em citação é texto de tela. Linha de `>` vazia separa parágrafo;
        # linhas seguidas são a MESMA frase quebrada no arquivo — juntar, senão uma frase
        # longa vira dois parágrafos e o segundo começa no meio.
        falas, atual = [], []
        for l in bloco.splitlines():
            if not l.startswith(">"):
                continue
            t = l[1:].strip()
            if t:
                atual.append(t)
            elif atual:
                falas.append(" ".join(atual))
                atual = []
        if atual:
            falas.append(" ".join(atual))
        falas = [f for f in falas if not f.startswith("*")]
        if falas:
            achados.append((int(cab.group(1)), falas))
    return achados


def html(paragrafos, nome_marca, passo, total):
    marca = MARCAS[nome_marca]
    estilo, montar = LAYOUTS[nome_marca]
    texto = "".join(
        f'<p class="destaque">{t}</p>' if i == 0 else f"<p>{t}</p>"
        for i, t in enumerate(paragrafos)
    )
    return PAGINA.format(
        L=L, A=A, margem=MARGEM, estilo=estilo, corpo=montar(texto, passo, total),
        fonte=marca["fonte"], arquivo=marca["arquivo"], fundo=marca["fundo"],
        claro=marca["claro"], apoio=marca["apoio"], pe=marca["pe"],
        peso_destaque=marca["peso_destaque"], peso_corpo=marca["peso_corpo"],
        aperto=marca["aperto"], site=marca["site"],
    )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--marca", required=True, choices=sorted(MARCAS))
    p.add_argument("roteiro", help="arquivos/stories-<slug>.md")
    p.add_argument("--qualidade", type=int, default=90)
    a = p.parse_args()

    roteiro = pathlib.Path(a.roteiro)
    if not roteiro.exists():
        sys.exit(f"roteiro não encontrado: {roteiro}")
    slug = roteiro.stem.replace("stories-", "")
    saida = roteiro.parent / "imagens"
    saida.mkdir(parents=True, exist_ok=True)

    achados = quadros(roteiro.read_text(encoding="utf-8"))
    if not achados:
        sys.exit("nenhum quadro com texto de tela no roteiro")

    from PIL import Image
    with tempfile.TemporaryDirectory() as tmp:
        for passo, (n, falas) in enumerate(achados, start=1):
            arq = pathlib.Path(tmp) / f"q{n}.html"
            arq.write_text(html(falas, a.marca, passo, len(achados)), encoding="utf-8")
            png = pathlib.Path(tmp) / f"q{n}.png"
            subprocess.run(
                ["google-chrome", "--headless", "--disable-gpu", "--no-sandbox",
                 "--hide-scrollbars", "--allow-file-access-from-files",
                 f"--window-size={L},{A}", f"--screenshot={png}",
                 "--virtual-time-budget=6000", f"file://{arq}"],
                check=True, capture_output=True, timeout=180,
            )
            fim = saida / f"stories-{slug}-{n}.jpg"
            Image.open(png).convert("RGB").save(
                fim, "JPEG", quality=a.qualidade, subsampling=0, optimize=True)
            print(f"  {fim} · {fim.stat().st_size // 1024} KB · {len(falas)} parágrafos")


if __name__ == "__main__":
    main()
