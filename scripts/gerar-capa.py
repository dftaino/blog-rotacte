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

`--formato stories` gera a mesma capa em 1080x1920 para o story do Instagram: a foto
ocupa a tela inteira, o véu vira vertical (escurece embaixo) e o texto desce para o
terço de baixo, dentro da área que a interface do app não cobre.

Precisa de google-chrome (renderiza) e Pillow (converte para webp). Não usa cwebp nem
imagemagick de propósito — não existem na máquina.
"""
import argparse
import pathlib
import subprocess
import sys
import tempfile

# capa: 1200x630 nos dois blogs, é a medida que o OG pede.
# stories: 1080x1920, o retrato do Instagram.
FORMATOS = {"capa": (1200, 630), "stories": (1080, 1920)}

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
  .veu{{position:absolute;inset:0;background:{veu}}}
  .texto{{position:absolute;font-family:'{fonte}',sans-serif;{caixa}}}
  .olho{{font-size:{tam_olho}px;font-weight:700;letter-spacing:{espaco}px;color:{olho};margin:0 0 {gap}px}}
  .traco{{width:{traco_L}px;height:{traco_A}px;border-radius:3px;background:{traco};margin:{gap_traco}px 0 0}}
  h1{{font-size:{tam}px;font-weight:800;color:{titulo};margin:0;line-height:1.16;letter-spacing:-.4px}}
  .rodape{{position:absolute;left:{margem}px;bottom:{rodape_y}px;font-family:'{fonte}',sans-serif;
          font-size:{tam_rodape}px;font-weight:600;letter-spacing:1.5px;color:{olho}}}
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
    {rodape_html}
  </div>
</body></html>
"""

# O que muda entre os dois formatos. O véu escurece o lado (capa) ou a faixa (stories)
# onde o texto fica: sem ele o título some em foto clara.
DESENHO = {
    "capa": {
        # véu na horizontal: texto legível à esquerda, foto respirando à direita
        "veu": "linear-gradient(100deg,{veu_a} 0%,{veu_a} 38%,{veu_b} 78%,{veu_b} 100%)",
        "caixa": "left:80px;top:0;height:{A}px;width:660px;"
                 "display:flex;flex-direction:column;justify-content:center",
        "margem": 80, "gap": 22, "gap_traco": 26, "espaco": 3.5, "tam_olho": 19,
        "traco_L": 64, "traco_A": 5, "tam_rodape": 20, "rodape_y": 44,
        "tamanhos": ((30, 46), (36, 41), (999, 36)),
    },
    "stories": {
        # véu na vertical: foto inteira em cima, texto no terço de baixo
        "veu": "linear-gradient(180deg,{veu_b} 0%,{veu_b} 34%,{veu_a} 62%,{veu_a} 100%)",
        # 300px de folga embaixo: é onde o Instagram põe a barra de resposta
        "caixa": "left:80px;right:80px;bottom:300px;",
        "margem": 80, "gap": 34, "gap_traco": 40, "espaco": 4.5, "tam_olho": 30,
        "traco_L": 96, "traco_A": 7, "tam_rodape": 30, "rodape_y": 190,
        "tamanhos": ((16, 80), (22, 68), (28, 58), (999, 50)),
    },
}


def montar_html(marca, foto, olho, titulo, foco="center", espelhar=False,
                formato="capa", rodape=None):
    d = DESENHO[formato]
    L, A = FORMATOS[formato]
    linhas = [l.strip() for l in titulo.split("|") if l.strip()]
    # título longo encolhe sozinho; sem isso a última linha vaza para fora da capa
    maior = max(len(l) for l in linhas)
    tam = next(px for limite, px in d["tamanhos"] if maior <= limite)
    rodape_html = f'<div class="rodape">{rodape}</div>' if rodape else ""
    return MODELO.format(
        L=L, A=A, foto=foto, tam=tam, foco=foco,
        espelho="scaleX(-1)" if espelhar else "none",
        veu=d["veu"].format(**marca),
        caixa=d["caixa"].format(A=A),
        margem=d["margem"], gap=d["gap"], gap_traco=d["gap_traco"],
        espaco=d["espaco"], tam_olho=d["tam_olho"],
        traco_L=d["traco_L"], traco_A=d["traco_A"],
        tam_rodape=d["tam_rodape"], rodape_y=d["rodape_y"], rodape_html=rodape_html,
        olho_txt=olho, titulo_html="<br/>".join(linhas), **marca,
    )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--marca", required=True, choices=sorted(MARCAS))
    p.add_argument("--foto", required=True, help="caminho da foto de fundo")
    p.add_argument("--olho", required=True, help="linha de cima, em caixa alta")
    p.add_argument("--titulo", required=True, help="título; use | para quebrar a linha")
    p.add_argument("--saida", required=True,
                   help="arquivo de saída; a extensão decide o formato (.webp, .jpg ou .png)")
    p.add_argument("--foco", default="center",
                   help="background-position da foto (ex.: 'right center', '70%% 40%%')")
    p.add_argument("--espelhar", action="store_true",
                   help="inverte a foto na horizontal — serve quando o assunto cai do lado do véu "
                        "e sumiria no escuro; só use em foto sem texto nem logo")
    p.add_argument("--formato", default="capa", choices=sorted(FORMATOS),
                   help="capa (1200x630, o que o blog usa) ou stories (1080x1920, Instagram)")
    p.add_argument("--rodape", help="linha discreta no pé — só no stories (ex.: blog.reservya.com.br)")
    p.add_argument("--qualidade", type=int, default=82)
    a = p.parse_args()

    foto = pathlib.Path(a.foto).resolve()
    if not foto.exists():
        sys.exit(f"foto não encontrada: {foto}")
    saida = pathlib.Path(a.saida)
    saida.parent.mkdir(parents=True, exist_ok=True)

    L, A = FORMATOS[a.formato]
    html = montar_html(MARCAS[a.marca], foto, a.olho, a.titulo, a.foco, a.espelhar,
                       a.formato, a.rodape)
    with tempfile.TemporaryDirectory() as tmp:
        arq = pathlib.Path(tmp) / "capa.html"
        arq.write_text(html, encoding="utf-8")
        png = pathlib.Path(tmp) / "capa.png"
        subprocess.run(
            ["google-chrome", "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
             f"--window-size={L},{A}", f"--screenshot={png}",
             "--virtual-time-budget=8000", f"file://{arq}"],
            check=True, capture_output=True, timeout=180,
        )
        from PIL import Image
        im = Image.open(png).convert("RGB")
        # o blog serve webp; o story vai para o celular, e o Instagram não aceita webp —
        # então a extensão do --saida decide o formato.
        ext = saida.suffix.lower()
        if ext in (".jpg", ".jpeg"):
            im.save(saida, "JPEG", quality=a.qualidade + 8, subsampling=0, optimize=True)
        elif ext == ".png":
            im.save(saida, "PNG", optimize=True)
        else:
            im.save(saida, "WEBP", quality=a.qualidade, method=6)
    print(f"  {saida} · {saida.stat().st_size // 1024} KB · {L}x{A}")


if __name__ == "__main__":
    main()
