#!/usr/bin/env python3
"""
Módulo 3 — Sanity check del solver (control de cordura).
Equivalente a GTOStreetValidation.sanityCheckSolver en JS.

Uso:
  python tools/sanity_check_solver.py
  python tools/sanity_check_solver.py --check-turn 80 --check-river 79 --coordinated
"""

from __future__ import annotations

import argparse
import sys


def sanity_check_solver(
    check_turn_pct: float,
    check_river_pct: float,
    board_coordinado: bool,
    tolerance_pct: float = 1.0,
    river_completes_straight: bool = False,
) -> dict:
    """
    Si board coordinado y check turn ≈ check river (±tolerance), rechazar cálculo.
    """
    delta = abs(check_turn_pct - check_river_pct)
    clone = delta <= tolerance_pct

    if board_coordinado and clone:
        return {
            "ok": False,
            "code": "SOLVER_SANITY_FAIL",
            "action": "INVALIDATE_AND_RECALC",
            "log": (
                f"[SOLVER] ERROR: board coordinado (straight_complete={river_completes_straight}) "
                f"pero check turn={check_turn_pct:.0f}% river={check_river_pct:.0f}% "
                f"(delta={delta:.1f}%) — invalidar caché y recalcular árbol."
            ),
        }

    return {"ok": True, "delta": delta}


def classify_facing_node(to_call_bb: float, pot_before_bb: float, street: str = "river") -> str:
    """Bucket de nodo — evita heredar frecuencias bet → shove."""
    if street != "river" or to_call_bb <= 0:
        ratio = to_call_bb / max(pot_before_bb, 0.1)
        if ratio >= 1.2:
            return "overbet"
        if ratio >= 0.66:
            return "large"
        return "small"
    ratio = to_call_bb / max(pot_before_bb, 0.1)
    if to_call_bb >= 50 or ratio >= 0.70:
        return "shove"
    if to_call_bb >= 30 or ratio >= 0.55:
        return "overbet"
    if ratio >= 0.66:
        return "large"
    return "small"


def river_shove_frequencies(
    to_call_bb: float,
    pot_before_bb: float,
    hero_equity: float,
    board_paired: bool,
    absolute_nuts: bool,
) -> dict[str, float]:
    """
    Recálculo obligatorio ante shove river (NL2-NL10 underbluff).
    Color nut en mesa doblada → fold dominante si no hay nuts absolutas.
    """
    pot_odds = to_call_bb / (pot_before_bb + 2 * to_call_bb)
    eq = min(hero_equity, 0.22) if board_paired and not absolute_nuts else hero_equity
    eq_edge = eq - pot_odds
    node = classify_facing_node(to_call_bb, pot_before_bb, "river")

    if absolute_nuts and eq_edge >= 0.05:
        return {"fold": 0.04, "call": 0.82, "raise": 0.14}

    if node == "shove" or to_call_bb >= 50:
        if board_paired or eq < pot_odds + 0.08:
            fold = min(0.96, max(0.75, 0.82 + (pot_odds - eq) * 0.25))
            return {"fold": fold, "call": 1 - fold - 0.02, "raise": 0.02}

    return {"fold": 0.35, "call": 0.55, "raise": 0.10}


def validate_facing_node_change(prev_call: float, cur_call: float, prev_gto: dict, cur_gto: dict) -> dict:
    """Detecta clonación de frecuencias entre nodos distintos en la misma calle."""
    if abs(prev_call - cur_call) < 1:
        return {"ok": True}
    if prev_gto == cur_gto:
        return {
            "ok": False,
            "code": "FACING_NODE_FREQ_CLONE",
            "log": f"Frecuencias idénticas con toCall {prev_call}bb → {cur_call}bb",
        }
    return {"ok": True}


def main() -> int:
    parser = argparse.ArgumentParser(description="Sanity check Turn vs River probe frequencies")
    parser.add_argument("--check-turn", type=float, default=80.0)
    parser.add_argument("--check-river", type=float, default=80.0)
    parser.add_argument("--coordinated", action="store_true", default=True)
    parser.add_argument("--tolerance", type=float, default=1.0)
    parser.add_argument("--river-straight", action="store_true", default=True)
    args = parser.parse_args()

    result = sanity_check_solver(
        args.check_turn,
        args.check_river,
        args.coordinated,
        args.tolerance,
        args.river_straight,
    )

    print(result["log"] if not result["ok"] else f"OK: delta={result.get('delta', 0):.1f}%")
    return 1 if not result["ok"] else 0


if __name__ == "__main__":
    sys.exit(main())
