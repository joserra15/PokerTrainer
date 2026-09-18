#!/usr/bin/env python3
"""Genera puzzles + soluciones Instagram '¿Qué tiene el villano?' estilo PokerForgeAI.

Cartas: mazo de cuatro colores (igual que data-card-style=colored en la app).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "marketing/instagram/09-villano-quiz"
DATA = OUT / "casos.json"

W, H = 1080, 1350  # 4:5 Instagram

BG_TOP = (12, 22, 48)
BG_BOT = (8, 14, 32)
PANEL = (22, 34, 58)
WHITE = (255, 255, 255)
MUTED = (170, 185, 210)
GOLD = (245, 196, 81)
GOLD2 = (255, 220, 120)
GREEN = (63, 185, 80)
RED = (240, 83, 59)

# Mazo colored (css/styles.css [data-card-style="colored"])
SUIT_BG = {
    "h": (201, 74, 82),    # #c94a52
    "d": (47, 111, 214),   # #2f6fd6
    "c": (42, 143, 78),    # #2a8f4e
    "s": (58, 65, 73),     # #3a4149
}
SUIT_WM = {
    "h": (232, 160, 165),  # #e8a0a5
    "d": (139, 180, 240),  # #8bb4f0
    "c": (125, 206, 160),  # #7dcea0
    "s": (154, 163, 173),  # #9aa3ad
}
SUIT_SYM = {"h": "♥", "d": "♦", "c": "♣", "s": "♠"}
RANK_SHOW = {"T": "10"}
CARD_BORDER = (255, 250, 245)


def font(size: int, bold: bool = False, suits: bool = False):
    if suits:
        paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    else:
        paths = [
            "/usr/share/fonts/truetype/macos/Inter-Bold.ttf" if bold else "/usr/share/fonts/truetype/macos/Inter-Regular.ttf",
            "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf" if bold else "/usr/share/fonts/truetype/macos/Inter-Medium.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def parse_card(c: str):
    c = c.strip()
    return RANK_SHOW.get(c[:-1], c[:-1]), c[-1].lower()


def gradient_bg(w, h):
    img = Image.new("RGB", (w, h), BG_BOT)
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
        for x in range(w):
            cx, cy = (x - w / 2) / w, (y - h / 2) / h
            v = 1 - 0.16 * (cx * cx + cy * cy)
            px[x, y] = (max(0, int(r * v)), max(0, int(g * v)), max(0, int(b * v)))
    return img


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_card(base: Image.Image, x, y, card: str, cw=120, ch=166, hidden=False):
    """Carta colored: fondo por palo, índice, watermark, rango centrado."""
    draw = ImageDraw.Draw(base)
    rad = max(12, int(cw * 0.12))

    if hidden:
        rounded_rect(draw, (x, y, x + cw, y + ch), rad, (5, 8, 11), GOLD, 2)
        step = max(6, cw // 10)
        for i in range(-2, cw // step + 3):
            for j in range(-2, ch // step + 3):
                px = x + i * step
                py = y + j * step
                if (i + j) % 2 == 0:
                    draw.rectangle((px, py, px + 1, py + step), fill=(45, 38, 18))
        inset = 5
        rounded_rect(
            draw,
            (x + inset, y + inset, x + cw - inset, y + ch - inset),
            max(4, rad - 4),
            None,
            (180, 150, 60),
            1,
        )
        f_sp = font(int(ch * 0.34), True, suits=True)
        sym = "♠"
        bbox = draw.textbbox((0, 0), sym, font=f_sp)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((x + (cw - tw) / 2, y + (ch - th) / 2 - 2), sym, font=f_sp, fill=GOLD)
        return

    rank, suit = parse_card(card)
    bg = SUIT_BG[suit]
    wm_col = SUIT_WM[suit]
    sym = SUIT_SYM[suit]

    # sombra
    rounded_rect(draw, (x + 3, y + 5, x + cw + 3, y + ch + 5), rad, (0, 0, 0), None, 1)
    rounded_rect(draw, (x, y, x + cw, y + ch), rad, bg, CARD_BORDER, 2)

    # watermark con alpha real (capa RGBA)
    overlay = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    f_wm = font(int(ch * 0.85), True, suits=True)
    bbox = od.textbbox((0, 0), sym, font=f_wm)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    od.text(
        ((cw - tw) / 2, (ch - th) / 2 - int(ch * 0.04)),
        sym,
        font=f_wm,
        fill=(*wm_col, 78),  # ~30% opacity como la app
    )
    # clip a esquinas redondeadas
    mask = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, cw - 1, ch - 1), radius=rad, fill=255)
    card_layer = Image.new("RGBA", (cw, ch), (*bg, 255))
    card_layer.paste(overlay, (0, 0), overlay)
    # reaplicar borde/clip
    clipped = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    clipped.paste(card_layer, (0, 0), mask)
    base.paste(clipped, (x, y), clipped)
    # borde claro encima
    draw.rounded_rectangle((x, y, x + cw, y + ch), radius=rad, outline=CARD_BORDER, width=2)

    # índice esquina: rango + palo
    idx_size = max(16, int(ch * 0.145))
    f_idx = font(idx_size, True)
    f_idx_s = font(int(idx_size * 0.92), True, suits=True)
    ix, iy = x + max(7, int(cw * 0.07)), y + max(5, int(ch * 0.035))
    draw.text((ix, iy), rank, font=f_idx, fill=WHITE)
    rb = draw.textbbox((0, 0), rank, font=f_idx)
    draw.text((ix + (rb[2] - rb[0]) + 1, iy + 1), sym, font=f_idx_s, fill=WHITE)

    # rango grande centrado
    f_rank = font(int(ch * 0.36) if rank != "10" else int(ch * 0.30), True)
    bbox = draw.textbbox((0, 0), rank, font=f_rank)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    # ligera sombra de texto
    draw.text((x + (cw - tw) / 2 + 1, y + (ch - th) / 2), rank, font=f_rank, fill=(0, 0, 0))
    draw.text((x + (cw - tw) / 2, y + (ch - th) / 2 - 2), rank, font=f_rank, fill=WHITE)


def highlight_sizing(draw, text, x, y, f_norm, f_gold):
    tokens = re.findall(r"\S+|\s+", text)
    cx = x
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        chunk, used = tok, 1
        col, ff = WHITE, f_norm
        if re.match(r"^[\d.,]+%$", tok) and i + 2 < len(tokens) and tokens[i + 1].isspace() and tokens[i + 2].lower() == "pot":
            chunk = tok + tokens[i + 1] + tokens[i + 2]
            used = 3
            col, ff = GOLD, f_gold
        elif re.match(r"^[\d.,]+$", tok) and i + 2 < len(tokens) and tokens[i + 1].isspace() and tokens[i + 2].lower() == "bb":
            chunk = tok + tokens[i + 1] + tokens[i + 2]
            used = 3
            col, ff = GOLD, f_gold
        elif re.match(r"^[\d]+[.,]?[\d]*×$", tok) or tok.lower() in ("all-in", "overbet"):
            col, ff = GOLD, f_gold
        draw.text((cx, y), chunk, font=ff, fill=col)
        bbox = draw.textbbox((0, 0), chunk, font=ff)
        cx += bbox[2] - bbox[0]
        i += used
    return cx


def wrap_text(draw, text, f, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textbbox((0, 0), test, font=f)[2] <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_header(draw, solution: bool):
    f_brand = font(28, True)
    f_sub = font(16, False)
    f_title = font(36, True)

    draw.text((40, 22), "PokerForgeAI", font=f_brand, fill=WHITE)
    draw.text((40, 56), "Escuela · Rangos", font=f_sub, fill=MUTED)

    title = "Solución: ¿qué tenía el villano?" if solution else "¿Qué crees que tiene el villano?"
    bbox = draw.textbbox((0, 0), title, font=f_title)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, 86), title, font=f_title, fill=WHITE)


def draw_line_history(draw, line, y0):
    f_street = font(18, True)
    f_norm = font(18, False)
    f_gold = font(18, True)
    y = y0
    for row in line:
        street = row["street"]
        text = row["text"]
        draw.text((40, y), f"{street}:", font=f_street, fill=MUTED)
        sw = draw.textbbox((0, 0), f"{street}: ", font=f_street)[2]
        highlight_sizing(draw, text, 40 + sw, y, f_norm, f_gold)
        y += 28
    return y


def draw_board_and_hero(img, case, y0):
    """Board a ancho casi completo; héroe debajo a la misma escala."""
    draw = ImageDraw.Draw(img)
    f_lab = font(20, True)
    f_small = font(16, False)

    # Board: 5 cartas lo más grandes posible (~160×222)
    gap = 14
    cw = (W - 56 - 4 * gap) // 5  # márgenes 28+28
    ch = int(cw * 1.39)
    board_w = 5 * cw + 4 * gap
    board_x = (W - board_w) // 2

    draw.text((board_x, y0), "Board", font=f_lab, fill=MUTED)
    cy = y0 + 24
    for i, c in enumerate(case["board"]):
        draw_card(img, board_x + i * (cw + gap), cy, c, cw, ch)

    # Héroe + backs villano en la misma fila, centrados
    hy = cy + ch + 16
    hero_gap = 12
    back_w, back_h = int(cw * 0.62), int(ch * 0.62)
    hero_block = 2 * cw + hero_gap
    vill_block = 2 * back_w + 8
    block_w = hero_block + 36 + vill_block
    hx = (W - block_w) // 2

    draw.text((hx, hy), f"Héroe {case['heroPos']}", font=f_lab, fill=MUTED)
    draw.text((hx + hero_block + 36, hy), f"Villano {case['villainPos']}", font=f_lab, fill=MUTED)
    card_y = hy + 24
    for i, c in enumerate(case["hero"]):
        draw_card(img, hx + i * (cw + hero_gap), card_y, c, cw, ch)

    vx = hx + hero_block + 36
    vy = card_y + (ch - back_h) // 2
    draw_card(img, vx, vy, "Xx", back_w, back_h, hidden=True)
    draw_card(img, vx + back_w + 8, vy, "Xx", back_w, back_h, hidden=True)
    draw.text((vx, vy + back_h + 6), "cartas ocultas", font=f_small, fill=MUTED)

    return card_y + ch + 8


def draw_options(img, case, y0, reveal_idx=None):
    draw = ImageDraw.Draw(img)
    f_h = font(22, True)
    f_lab = font(18, True)
    draw.text((40, y0), "Opciones (elige una)", font=f_h, fill=WHITE)
    y = y0 + 30

    opts = case["options"]
    margin = 24
    gap = 12
    box_w = (W - 2 * margin - 2 * gap) // 3
    # Cartas de opción grandes, limitadas por el alto restante
    max_ch = H - y - 110  # footer
    ch = min(176, max_ch - 52)
    cw = int(ch / 1.39)
    if 2 * cw + 10 > box_w - 16:
        cw = (box_w - 26) // 2
        ch = int(cw * 1.39)
    box_h = 46 + ch + 14

    for i, opt in enumerate(opts):
        x = margin + i * (box_w + gap)
        is_ans = reveal_idx is not None and i == reveal_idx
        is_wrong = reveal_idx is not None and i != reveal_idx
        fill = (24, 60, 40) if is_ans else (PANEL if not is_wrong else (40, 28, 32))
        outline = GREEN if is_ans else (RED if is_wrong else (60, 80, 110))
        rounded_rect(draw, (x, y, x + box_w, y + box_h), 16, fill, outline, 3 if is_ans else 2)

        label = f"{chr(65 + i)}. {opt['label']}"
        if is_ans:
            label = f"✓ {label}"
        draw.text((x + 12, y + 8), label, font=f_lab, fill=GREEN if is_ans else (MUTED if is_wrong else WHITE))

        cards = opt["cards"]
        row_w = 2 * cw + 10
        cx = x + (box_w - row_w) // 2
        for j, c in enumerate(cards):
            draw_card(img, cx + j * (cw + 10), y + 40, c, cw, ch)

    return y + box_h


def draw_footer(draw, y, solution_why=None):
    f_q = font(22, True)
    f_url = font(20, True)
    f_why = font(17, False)
    f_small = font(14, False)

    if solution_why:
        lines = wrap_text(draw, solution_why, f_why, W - 80)
        for i, ln in enumerate(lines[:3]):
            bbox = draw.textbbox((0, 0), ln, font=f_why)
            tw = bbox[2] - bbox[0]
            draw.text(((W - tw) / 2, y + i * 26), ln, font=f_why, fill=GOLD2)
        y += min(len(lines), 3) * 26 + 12
    else:
        q = "¿Qué mano sobrevive a la línea?"
        bbox = draw.textbbox((0, 0), q, font=f_q)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) / 2, y), q, font=f_q, fill=WHITE)
        y += 36

    url = "pokerforgeai.com"
    bbox = draw.textbbox((0, 0), url, font=f_url)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, y), url, font=f_url, fill=GOLD)
    full = "https://www.pokerforgeai.com"
    bbox = draw.textbbox((0, 0), full, font=f_small)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, y + 28), full, font=f_small, fill=MUTED)


def render_case(case: dict, solution: bool) -> Image.Image:
    img = gradient_bg(W, H)
    draw = ImageDraw.Draw(img)
    draw_header(draw, solution)
    y = draw_line_history(draw, case["line"], 136)
    y = draw_board_and_hero(img, case, y + 14)
    reveal = case["answer"] if solution else None
    y = draw_options(img, case, y + 12, reveal_idx=reveal)
    why = case["why"] if solution else None
    footer_y = y + 14
    if footer_y > H - 100:
        footer_y = H - 100
    draw_footer(draw, footer_y, solution_why=why)
    return img


def validate_case(case: dict):
    hb = case["hero"] + case["board"]
    if len(hb) != len(set(hb)):
        raise ValueError(f"Case {case['n']}: duplicate in hero/board {hb}")
    for i, opt in enumerate(case["options"]):
        combo = case["hero"] + case["board"] + opt["cards"]
        if len(combo) != len(set(combo)):
            raise ValueError(f"Case {case['n']} option {i}: card conflict {combo}")
    if not (0 <= case["answer"] < 3):
        raise ValueError(f"Case {case['n']}: bad answer index")


def main():
    cases = json.loads(DATA.read_text(encoding="utf-8"))
    assert len(cases) == 30
    puzzles = OUT / "puzzles"
    solutions = OUT / "soluciones"
    puzzles.mkdir(parents=True, exist_ok=True)
    solutions.mkdir(parents=True, exist_ok=True)

    for case in cases:
        validate_case(case)
        n = case["n"]
        p = render_case(case, solution=False)
        s = render_case(case, solution=True)
        p.save(puzzles / f"{n:02d}-puzzle.jpg", "JPEG", quality=92, optimize=True)
        s.save(solutions / f"{n:02d}-solucion.jpg", "JPEG", quality=92, optimize=True)
        print(f"OK {n:02d}")

    lines = [
        "# Villano Quiz — 30 casos Instagram",
        "",
        "Puzzles y soluciones numerados en archivo (01–30). **Sin número en la imagen.**",
        "Cartas: mazo de cuatro colores (app `data-card-style=colored`).",
        "",
        "| # | Tag | Línea clave | Respuesta |",
        "|---|-----|-------------|-----------|",
    ]
    for c in cases:
        ans = c["options"][c["answer"]]["label"]
        lines.append(f"| {c['n']:02d} | {c['tag']} | {c['villainPos']} vs {c['heroPos']} | **{ans}** |")
    lines += [
        "",
        "## Archivos",
        "- `puzzles/NN-puzzle.jpg`",
        "- `soluciones/NN-solucion.jpg`",
        "- `casos.json` — fuente regenerable",
        "",
        "Regenerar: `python3 tools/instagram-villano-quiz-assets.py`",
        "",
    ]
    (OUT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Done → {OUT}")


if __name__ == "__main__":
    main()
