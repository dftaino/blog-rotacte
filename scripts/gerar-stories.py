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

Mesmo script nos dois blogs, como o gerar-capa.py — o que muda é o `--marca`: o Reservya
sai em verde com Montserrat, o RotaCTe em espresso com Open Sans e o fio dourado da
identidade ROTA. Precisa de google-chrome e Pillow. As fontes são os woff2 locais: sem rede.
"""
import argparse
import pathlib
import re
import subprocess
import sys
import tempfile

L, A = 1080, 1920

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
        "arquivo": "file:///home/dftaiho/Projetos/rotacte-criativos/marca/opensans-latin.woff2",
        # Open Sans não tem 800 tão apertada quanto a Montserrat; o aperto da identidade
        # ROTA é -.02em, e é o que mantém o quadro parecido com o Reels.
        "peso_destaque": 800, "peso_corpo": 400, "aperto": "-.02em",
        "fundo": "#23201a", "regua": "#b8860b", "claro": "#faf8f3",
        "apoio": "#cfc6b4", "pe": "#d0a63c", "brilho": "208,166,60",
        "site": "blog.rotacte.com.br",
    },
}

# 300px embaixo é onde a barra de resposta do Instagram entra; 200 em cima, onde fica o
# avatar de quem postou. O texto vive no meio, que é o que sobra.
MARGEM, TOPO_SEGURO, BASE_SEGURA = 88, 200, 300

MODELO = """<!doctype html>
<html><head><meta charset="utf-8" /><style>
  @font-face{{font-family:'{fonte}';src:url('{arquivo}') format('woff2');
             font-weight:100 900;font-display:block;}}
  html,body{{margin:0;padding:0;width:{L}px;height:{A}px;overflow:hidden;background:{fundo};}}
  .quadro{{position:relative;width:{L}px;height:{A}px;font-family:'{fonte}',sans-serif;}}
  /* um brilho leve no alto à esquerda tira o chapado do fundo sem virar decoração */
  .luz{{position:absolute;inset:0;background:
        radial-gradient(120% 70% at 12% 8%, rgba({brilho},.16), rgba(0,0,0,0) 60%);}}
  .bloco{{position:absolute;left:{margem}px;right:{margem}px;top:{topo}px;bottom:{base}px;
          display:flex;flex-direction:column;justify-content:center;}}
  .regua{{width:64px;height:6px;border-radius:3px;background:{regua};margin:0 0 40px;}}
  p{{margin:0;color:{apoio};font-size:46px;font-weight:{peso_corpo};line-height:1.34;
     letter-spacing:-.01em;}}
  p+p{{margin-top:34px;}}
  p.destaque{{color:{claro};font-size:62px;font-weight:{peso_destaque};line-height:1.16;
              letter-spacing:{aperto};}}
  .pe{{position:absolute;left:{margem}px;bottom:190px;color:{pe};font-size:27px;
       font-weight:600;letter-spacing:1.4px;}}
</style></head>
<body><div class="quadro">
  <div class="luz"></div>
  <div class="bloco"><div class="regua"></div>{paragrafos}</div>
  <div class="pe">{site}</div>
</div></body></html>
"""


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


def html(paragrafos, marca):
    corpo = "".join(
        f'<p class="destaque">{t}</p>' if i == 0 else f"<p>{t}</p>"
        for i, t in enumerate(paragrafos)
    )
    return MODELO.format(
        L=L, A=A, margem=MARGEM, topo=TOPO_SEGURO, base=BASE_SEGURA, paragrafos=corpo,
        **marca,
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
        for n, falas in achados:
            arq = pathlib.Path(tmp) / f"q{n}.html"
            arq.write_text(html(falas, MARCAS[a.marca]), encoding="utf-8")
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
