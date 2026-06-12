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
