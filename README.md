# El silencio impuesto por el miedo

Web del proyecto **El silencio impuesto por el miedo**: un espacio para documentar
testimonios, explicar cómo se instala el miedo que obliga a callar y reunir recursos
de ayuda.

Sitio estático, sin framework ni proceso de compilación: HTML, CSS y JavaScript
servidos tal cual. Se publica en GitHub Pages.

---

## Cómo crear el repositorio en GitHub

Este código vive de momento en la rama `cursor/elsilencioimpuestoporelmiedo-dc6f` del
repositorio `joserra15/PokerTrainer`, porque el agente que lo generó no tiene permiso
para crear repositorios nuevos. Es una rama huérfana: no comparte historial ni archivos
con PokerTrainer, así que su contenido es exactamente el del repositorio nuevo.

Para sacarlo a su propio repositorio, desde tu ordenador:

```bash
git clone --branch cursor/elsilencioimpuestoporelmiedo-dc6f --single-branch \
  https://github.com/joserra15/PokerTrainer.git elsilencioimpuestoporelmiedo
cd elsilencioimpuestoporelmiedo
./scripts/crear-repo.sh
```

El script borra el historial heredado, crea un commit inicial limpio y publica el
repositorio con GitHub CLI. Acepta `--privado` y `--nombre otro-nombre`.

Si prefieres hacerlo a mano:

```bash
rm -rf .git
git init -b main
git add -A
git commit -m "Commit inicial"
gh repo create elsilencioimpuestoporelmiedo --public --source=. --push
```

Cuando el repositorio exista, borra la rama del repositorio de PokerTrainer para no
dejarla arrastrando:

```bash
git push https://github.com/joserra15/PokerTrainer.git \
  --delete cursor/elsilencioimpuestoporelmiedo-dc6f
```

---

## Desarrollo local

Las rutas de la web son absolutas (`/css/estilos.css`), así que hay que servir la
carpeta desde su raíz. Abrir `index.html` con doble clic no funciona.

```bash
python3 -m http.server 4173
# o bien
npx --yes serve . -l 4173
```

Después, abre <http://localhost:4173>.

## Estructura

```
.
├── index.html          Página principal (todas las secciones)
├── 404.html            Página de error
├── css/estilos.css     Estilos completos, con variables de color y tipografía
├── js/main.js          Menú móvil, animación de entrada y navegación activa
├── img/                Favicon e imagen para redes sociales (SVG)
├── scripts/            Utilidades de mantenimiento
├── site.webmanifest    Metadatos de aplicación web
├── robots.txt          Indexación
├── sitemap.xml         Mapa del sitio
└── .github/workflows/  Publicación automática en GitHub Pages
```

## Publicación

1. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
2. Cada `push` a `main` dispara el flujo `.github/workflows/pages.yml` y publica el sitio.

### Dominio propio

1. Crea un archivo `CNAME` en la raíz con el dominio, por ejemplo
   `elsilencioimpuestoporelmiedo.com`.
2. En tu proveedor de DNS, apunta el dominio a GitHub Pages:
   - registros `A` de la raíz → `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - registro `CNAME` de `www` → `joserra15.github.io`
3. En **Settings → Pages**, escribe el dominio y activa *Enforce HTTPS*.

Verifica las IP en la [documentación de GitHub Pages](https://docs.github.com/pages)
antes de configurar el DNS: cambian muy de vez en cuando.

## Personalizar el contenido

- **Textos**: todos están escritos directamente en `index.html`, sección por sección
  (`#proyecto`, `#voces`, `#participa`, `#recursos`, `#contacto`).
- **Correo de contacto**: busca `hola@elsilencioimpuestoporelmiedo.com` en `index.html`
  y sustitúyelo.
- **Colores y tipografía**: las variables están al principio de `css/estilos.css`
  (`--fondo`, `--acento`, `--fuente-titulo`…).
- **Dominio**: aparece en las etiquetas `canonical` y Open Graph de `index.html`, en
  `robots.txt` y en `sitemap.xml`.

### Antes de publicar

Los testimonios de la sección **Voces** y las fichas de **Recursos** son ejemplos de
maquetación, no contenido real:

- No publiques ningún testimonio sin consentimiento por escrito de quien lo cuenta, y
  anonimiza los detalles que permitan identificar a terceros.
- Completa los recursos de ayuda con teléfonos y asociaciones verificados de la zona a
  la que se dirige el proyecto, con su horario y su web oficial.

## Licencia

El código de la web se publica bajo licencia MIT (ver `LICENSE`). Los textos y
testimonios son propiedad de sus autoras y autores, y no están cubiertos por esa
licencia.
