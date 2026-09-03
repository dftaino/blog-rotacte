#!/usr/bin/env python3
"""
Gera a capa de um post: foto de fundo + véu da marca + olho e título.

Mesmo script nos dois blogs (Reservya e RotaCTe) — o que muda é a paleta, escolhida
pelo --marca. Assim as duas capas seguem o mesmo desenho sem perder a identidade.

    python3 scripts/gerar-capa.py --marca reservya \
        --foto fotos/barbearia.jpg \
        --olho "MARKETING PARA SALÃO E BARBEARIA" \
        --titulo "O cliente mais barato|já sentou na sua cadeira." \
        --saida arquivos/imagens/capa-marketing-base.webp

O título quebra em "|". O véu é um degradê da cor da marca por cima da foto: sem ele
o texto some em foto clara, e cada capa ficaria com um contraste diferente.

O véu escurece a ESQUERDA, que é onde o texto fica. Foto cujo assunto está à esquerda
some no escuro — para essas use --espelhar (joga o assunto para a direita) ou --foco
(reenquadra, ex.: --foco "right center").

Precisa de google-chrome (renderiza) e Pillow (converte para webp). Não usa cwebp nem
imagemagick de propósito — não existem na máquina.
"""
import argparse
import pathlib
import subprocess
import sys
import tempfile

LARGURA, ALTURA = 1200, 630  # 1200x630 nos dois blogs: é a medida que o OG pede

MARCAS = {
    "reservya": {
        "fonte": "Montserrat",
        "fonte_css": "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap",
        "fundo": "#123A3D",
        "veu_a": "rgba(9,42,44,.94)",   # lado do texto: quase opaco
        "veu_b": "rgba(9,42,44,.30)",   # lado da foto: deixa a imagem aparecer
        "olho": "#8fc0bf",
        "titulo": "#F6FAF9",
        "traco": "#4d8f91",
    },
    "rotacte": {
        "fonte": "Open Sans",
        "fonte_css": "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap",
        "fundo": "#23201a",
        "veu_a": "rgba(24,21,16,.94)",
        "veu_b": "rgba(24,21,16,.28)",
        "olho": "#c9bda6",
        "titulo": "#faf8f3",
        "traco": "#d0a63c",
    },
}

MODELO = """<!doctype html>
<html><head><meta charset="utf-8" />
<link rel="stylesheet" href="{fonte_css}" />
<style>
  html,body{{margin:0;padding:0;width:{L}px;height:{A}px;overflow:hidden;background:{fundo}}}
  .capa{{position:relative;width:{L}px;height:{A}px}}
  .foto{{position:absolute;inset:0;background:url("file://{foto}") {foco}/cover no-repeat;transform:{espelho}}}
  /* véu na horizontal: texto legível à esquerda, foto respirando à direita */
  .veu{{position:absolute;inset:0;background:linear-gradient(100deg,{veu_a} 0%,{veu_a} 38%,{veu_b} 78%,{veu_b} 100%)}}
  .texto{{position:absolute;left:80px;top:0;height:{A}px;width:660px;
         display:flex;flex-direction:column;justify-content:center;font-family:'{fonte}',sans-serif}}
  .olho{{font-size:19px;font-weight:700;letter-spacing:3.5px;color:{olho};margin:0 0 22px}}
  .traco{{width:64px;height:5px;border-radius:3px;background:{traco};margin:26px 0 0}}
  h1{{font-size:{tam}px;font-weight:800;color:{titulo};margin:0;line-height:1.16;letter-spacing:-.4px}}
</style></head>
<body>
  <div class="capa">
    <div class="foto"></div>
    <div class="veu"></div>
    <div class="texto">
      <p class="olho">{olho_txt}</p>
      <h1>{titulo_html}</h1>
      <div class="traco"></div>
    </div>
  </div>
</body></html>
"""


def montar_html(marca, foto, olho, titulo, foco="center", espelhar=False):
    linhas = [l.strip() for l in titulo.split("|") if l.strip()]
    # título longo encolhe sozinho; sem isso a terceira linha vaza para fora da capa
    maior = max(len(l) for l in linhas)
    tam = 46 if maior <= 30 else 41 if maior <= 36 else 36
    return MODELO.format(
        L=LARGURA, A=ALTURA, foto=foto, tam=tam, foco=foco,
        espelho="scaleX(-1)" if espelhar else "none",
        olho_txt=olho, titulo_html="<br/>".join(linhas), **marca,
    )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--marca", required=True, choices=sorted(MARCAS))
    p.add_argument("--foto", required=True, help="caminho da foto de fundo")
    p.add_argument("--olho", required=True, help="linha de cima, em caixa alta")
    p.add_argument("--titulo", required=True, help="título; use | para quebrar a linha")
    p.add_argument("--saida", required=True, help="arquivo .webp de saída")
    p.add_argument("--foco", default="center",
                   help="background-position da foto (ex.: 'right center', '70% 40%')")
    p.add_argument("--espelhar", action="store_true",
                   help="inverte a foto na horizontal — serve quando o assunto cai do lado do véu "
                        "e sumiria no escuro; só use em foto sem texto nem logo")
    p.add_argument("--qualidade", type=int, default=82)
    a = p.parse_args()

    foto = pathlib.Path(a.foto).resolve()
    if not foto.exists():
        sys.exit(f"foto não encontrada: {foto}")
    saida = pathlib.Path(a.saida)
    saida.parent.mkdir(parents=True, exist_ok=True)

    html = montar_html(MARCAS[a.marca], foto, a.olho, a.titulo, a.foco, a.espelhar)
    with tempfile.TemporaryDirectory() as tmp:
        arq = pathlib.Path(tmp) / "capa.html"
        arq.write_text(html, encoding="utf-8")
        png = pathlib.Path(tmp) / "capa.png"
        subprocess.run(
            ["google-chrome", "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
             f"--window-size={LARGURA},{ALTURA}", f"--screenshot={png}",
             "--virtual-time-budget=8000", f"file://{arq}"],
            check=True, capture_output=True, timeout=180,
        )
        from PIL import Image
        im = Image.open(png).convert("RGB")
        im.save(saida, "WEBP", quality=a.qualidade, method=6)
    print(f"  {saida} · {saida.stat().st_size // 1024} KB · {LARGURA}x{ALTURA}")


if __name__ == "__main__":
    main()
