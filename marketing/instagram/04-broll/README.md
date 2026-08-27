# Lote 4 — B-roll app real (capturas + clips)

Clips WebM 390×844 (móvil) listos para CapCut → export 1080×1920.

## Clips (usar estos)

| Archivo | Contenido | Pieza plan |
|---------|-----------|------------|
| `clip-01-reto-5manos.webm` | Landing/setup → mesa activa | A11 / C1 |
| `clip-02-gto-popup.webm` | Decisión → resultado mano / score | A6 / C1 |
| `clip-03-import-sesion.webm` | Sesiones + import .txt + demo | C2 |
| `clip-04-forgecoach.webm` | Panel ForgeCoach en detalle | C3 |
| `clip-05-escuela.webm` | Escuela de Póker hub | C5 |
| `clip-06-legendarias.webm` | Manos legendarias hub | D1 |
| `clip-07-rangos.webm` | Matriz rangos | Fase 3 |
| `clip-08-errores.webm` | Banco de errores | C4 |

## Stills clave

- `01-reto-5manos.jpg` / `03-table-active.jpg` — mesa con decisión
- `04-gto-feedback.jpg` / `02-gto-popup.jpg` — score 9.5/10
- `03-import-sesion.jpg` — import + sesión demo
- `04-forgecoach.jpg` — coach activo
- `05-escuela.jpg` — ruta Cash
- `06-legendarias.jpg` — hub legendarias
- `07-rangos.jpg` — rangos 6-max

## Edición ligera
1. Importa el `.webm` en CapCut.
2. Recorta a 12–20 s (hook en 1.er segundo).
3. Subtítulos auto ES + end card `../01-kit-marca/kit-endcard-5manos.jpg` (2 s).
4. Música Instagram baja; exporta 1080×1920 30 fps.

## Regenerar
```bash
npx http-server . -p 4173 -c-1
node tools/instagram-broll.js
node tools/instagram-broll-clips.js
node tools/instagram-broll-fix.js
```
