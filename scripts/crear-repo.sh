#!/usr/bin/env bash
#
# Convierte esta copia de trabajo en un repositorio nuevo e independiente
# y lo publica en GitHub.
#
# Uso:
#   ./scripts/crear-repo.sh                       # repo público con el nombre por defecto
#   ./scripts/crear-repo.sh --privado             # repo privado
#   ./scripts/crear-repo.sh --nombre otro-nombre  # otro nombre de repositorio
#
set -euo pipefail

NOMBRE="elsilencioimpuestoporelmiedo"
VISIBILIDAD="--public"
DESCRIPCION="Web del proyecto El silencio impuesto por el miedo"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --privado) VISIBILIDAD="--private"; shift ;;
    --publico) VISIBILIDAD="--public"; shift ;;
    --nombre)  NOMBRE="${2:?Falta el nombre tras --nombre}"; shift 2 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; exit 1 ;;
  esac
done

cd "$(dirname "$0")/.."

if ! command -v gh >/dev/null 2>&1; then
  echo "Necesitas GitHub CLI. Instálalo desde https://cli.github.com" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "No has iniciado sesión en GitHub CLI. Ejecuta: gh auth login" >&2
  exit 1
fi

if [[ -f index.html ]]; then :; else
  echo "Ejecuta este script desde la raíz del proyecto (no se encuentra index.html)." >&2
  exit 1
fi

echo "Se creará el repositorio '$NOMBRE' (${VISIBILIDAD#--}) con el contenido de $(pwd)."
read -r -p "¿Continuar? [s/N] " respuesta
[[ "$respuesta" =~ ^[sSyY]$ ]] || { echo "Cancelado."; exit 0; }

# El historial heredado del repositorio de origen no aporta nada aquí.
rm -rf .git
git init -b main
git add -A
git commit -m "Commit inicial: web El silencio impuesto por el miedo"

gh repo create "$NOMBRE" "$VISIBILIDAD" --source=. --remote=origin --push \
  --description "$DESCRIPCION"

echo
echo "Listo. Repositorio creado y subido."
echo "Activa GitHub Pages en Settings > Pages > Source: GitHub Actions."
