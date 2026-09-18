#!/usr/bin/env python3
"""Genera puzzles + soluciones Instagram '¿Qué tiene el villano?' estilo PokerForgeAI."""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "marketing/instagram/09-villano-quiz"
DATA = OUT / "casos.json"
REF = Path("/home/ubuntu/.cursor/projects/workspace/assets/01a0b570-91ef-75ca-98aa-9b3e7386711c.jpg")

W, H = 1080, 1350  # 4:5 Instagram

BG_TOP = (12, 22, 48)
BG_BOT = (8, 14, 32)
PANEL = (22, 34, 58)
PANEL2 = (28, 42, 72)
WHITE = (255, 255, 255)
MUTED = (170, 185, 210)
GOLD = (245, 196, 81)
GOLD2 = (255, 220, 120)
GREEN = (63, 185, 80)
RED = (240, 83, 59)
CARD_BG = (252, 252, 255)
CARD_EDGE = (210, 215, 225)
HEART = (200, 40, 50)
DIAMOND = (200, 40, 50)
CLUB = (25, 28, 35)
SPADE = (25, 28, 35)

SUIT_SYM = {"h": "♥", "d": "♦", "c": "♣", "s": "♠"}
SUIT_COLOR = {"h": HEART, "d": DIAMOND, "c": CLUB, "s": SPADE}
RANK_SHOW = {"T": "10"}


def font(size: int, bold: bool = False, suits: bool = False):
    # Inter no tiene ♥♦♣♠; DejaVu sí.
    if suits:
        paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansSymbols2-Regular.ttf",
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
    rank, suit = c[:-1], c[-1].lower()
    return RANK_SHOW.get(rank, rank), suit


def gradient_bg(w, h):
    img = Image.new("RGB", (w, h), BG_BOT)
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        # subtle blue radial-ish vertical
        r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
        for x in range(w):
            # soft vignette
            cx, cy = (x - w / 2) / w, (y - h / 2) / h
            v = 1 - 0.18 * (cx * cx + cy * cy)
            px[x, y] = (max(0, int(r * v)), max(0, int(g * v)), max(0, int(b * v)))
    return img


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_card(base: Image.Image, x, y, card: str, cw=92, ch=128, hidden=False):
    draw = ImageDraw.Draw(base)
    if hidden:
        rounded_rect(draw, (x, y, x + cw, y + ch), 10, (30, 55, 95), (80, 120, 170), 2)
        # pattern
        for i in range(6):
            for j in range(8):
                px = x + 14 + i * 14
                py = y + 14 + j * 14
                if 0 <= px < base.width and 0 <= py < base.height:
                    draw.ellipse((px, py, px + 4, py + 4), fill=(50, 90, 140))
        return

    rank, suit = parse_card(card)
    color = SUIT_COLOR[suit]
    sym = SUIT_SYM[suit]
    rounded_rect(draw, (x, y, x + cw, y + ch), 10, CARD_BG, CARD_EDGE, 2)

    f_rank = font(28 if rank != "10" else 24, True)
    f_suit = font(26, True, suits=True)
    f_big = font(44, True, suits=True)

    # top-left
    draw.text((x + 8, y + 6), rank, font=f_rank, fill=color)
    draw.text((x + 8, y + 34), sym, font=f_suit, fill=color)
    # center suit
    bbox = draw.textbbox((0, 0), sym, font=f_big)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((x + (cw - tw) / 2, y + (ch - th) / 2 + 4), sym, font=f_big, fill=color)


def highlight_sizing(draw, text, x, y, f_norm, f_gold):
    """Resalta solo tamaños: N% pot, N bb, N×, all-in, overbet."""
    import re

    tokens = re.findall(r"\S+|\s+", text)
    cx = x
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        chunk = tok
        used = 1
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
        elif tok.lower() == "overbet" or (tok.lower().startswith("overbet")):
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


def draw_header(draw, case_n: int, solution: bool):
    f_brand = font(28, True)
    f_sub = font(16, False)
    f_title = font(36, True)
    f_num = font(18, True)

    draw.text((48, 36), "PokerForgeAI", font=f_brand, fill=WHITE)
    draw.text((48, 72), "Escuela · Rangos", font=f_sub, fill=MUTED)

    badge = f"SOLUCIÓN {case_n:02d}" if solution else f"CASO {case_n:02d}"
    bw = draw.textbbox((0, 0), badge, font=f_num)[2] + 24
    rounded_rect(draw, (W - 48 - bw, 40, W - 48, 72), 8, PANEL2, GOLD, 1)
    draw.text((W - 48 - bw + 12, 46), badge, font=f_num, fill=GOLD)

    title = "Solución: ¿qué tenía el villano?" if solution else "¿Qué crees que tiene el villano?"
    bbox = draw.textbbox((0, 0), title, font=f_title)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, 110), title, font=f_title, fill=WHITE)


def draw_line_history(draw, line, y0):
    f_street = font(20, True)
    f_norm = font(20, False)
    f_gold = font(20, True)
    y = y0
    for row in line:
        street = row["street"]
        text = row["text"]
        draw.text((48, y), f"{street}:", font=f_street, fill=MUTED)
        sw = draw.textbbox((0, 0), f"{street}: ", font=f_street)[2]
        highlight_sizing(draw, text, 48 + sw, y, f_norm, f_gold)
        y += 36
    return y


def draw_board_and_hero(img, case, y0):
    draw = ImageDraw.Draw(img)
    f_lab = font(18, True)
    f_small = font(15, False)

    draw.text((48, y0), "Board", font=f_lab, fill=MUTED)
    draw.text((620, y0), f"Héroe {case['heroPos']}", font=f_lab, fill=MUTED)

    cy = y0 + 32
    cw, ch, gap = 88, 122, 10
    for i, c in enumerate(case["board"]):
        draw_card(img, 48 + i * (cw + gap), cy, c, cw, ch)

    hx = 620
    for i, c in enumerate(case["hero"]):
        draw_card(img, hx + i * (cw + gap), cy, c, cw, ch)

    draw.text((620, cy + ch + 10), f"Villano {case['villainPos']} · cartas ocultas", font=f_small, fill=MUTED)
    # hidden villain cards hint
    draw_card(img, 620, cy + ch + 36, "Xx", 52, 72, hidden=True)
    draw_card(img, 680, cy + ch + 36, "Xx", 52, 72, hidden=True)
    return cy + ch + 120


def draw_options(img, case, y0, reveal_idx=None):
    draw = ImageDraw.Draw(img)
    f_h = font(22, True)
    f_lab = font(16, False)
    draw.text((48, y0), "Opciones (elige una)", font=f_h, fill=WHITE)
    y = y0 + 40

    opts = case["options"]
    box_w = 300
    gap = 24
    total = 3 * box_w + 2 * gap
    x0 = (W - total) // 2
    cw, ch = 78, 108

    for i, opt in enumerate(opts):
        x = x0 + i * (box_w + gap)
        is_ans = reveal_idx is not None and i == reveal_idx
        is_wrong = reveal_idx is not None and i != reveal_idx
        fill = (24, 60, 40) if is_ans else (PANEL if not is_wrong else (40, 28, 32))
        outline = GREEN if is_ans else (RED if is_wrong else (60, 80, 110))
        rounded_rect(draw, (x, y, x + box_w, y + 190), 14, fill, outline, 2 if not is_ans else 3)

        label = f"{chr(65 + i)}. {opt['label']}"
        if is_ans:
            label = f"✓ {label}"
        draw.text((x + 16, y + 12), label, font=f_lab, fill=GREEN if is_ans else (MUTED if is_wrong else WHITE))

        cards = opt["cards"]
        cx = x + (box_w - (2 * cw + 10)) // 2
        for j, c in enumerate(cards):
            draw_card(img, cx + j * (cw + 10), y + 44, c, cw, ch)

    return y + 210


def draw_footer(draw, y, solution_why=None):
    f_q = font(22, True)
    f_url = font(18, True)
    f_why = font(18, False)
    f_small = font(14, False)

    if solution_why:
        lines = wrap_text(draw, solution_why, f_why, W - 96)
        for i, ln in enumerate(lines[:4]):
            bbox = draw.textbbox((0, 0), ln, font=f_why)
            tw = bbox[2] - bbox[0]
            draw.text(((W - tw) / 2, y + i * 28), ln, font=f_why, fill=GOLD2)
        y += min(len(lines), 4) * 28 + 16
    else:
        q = "¿Qué mano sobrevive a la línea?"
        bbox = draw.textbbox((0, 0), q, font=f_q)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) / 2, y), q, font=f_q, fill=WHITE)
        y += 40

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
    draw_header(draw, case["n"], solution)
    y = draw_line_history(draw, case["line"], 170)
    y = draw_board_and_hero(img, case, y + 16)
    reveal = case["answer"] if solution else None
    y = draw_options(img, case, y + 8, reveal_idx=reveal)
    why = case["why"] if solution else None
    draw_footer(draw, min(y + 20, H - 160), solution_why=why)
    return img


def validate_case(case: dict):
    cards = []
    cards.extend(case["hero"])
    cards.extend(case["board"])
    for opt in case["options"]:
        cards.extend(opt["cards"])
    # duplicates only matter within used set for hero+board+each option separately
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
        p_path = puzzles / f"{n:02d}-puzzle.jpg"
        s_path = solutions / f"{n:02d}-solucion.jpg"
        p.save(p_path, "JPEG", quality=92, optimize=True)
        s.save(s_path, "JPEG", quality=92, optimize=True)
        print(f"OK {n:02d}")

    # index markdown
    lines = [
        "# Villano Quiz — 30 casos Instagram",
        "",
        "Puzzles y soluciones numerados 01–30. Publica el puzzle; la solución al día siguiente o en carrusel slide 2.",
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
