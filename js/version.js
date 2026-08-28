/* Incrementar en cada despliegue para invalidar caché del navegador. */
window.PT_BUILD = '2.7.37';

/* Huella del contenido de js, css, dist y data. La genera tools/build-bundles.js:
   no editar a mano. Es el token de ?v=, así que cambia siempre que cambia un
   asset aunque nadie suba PT_BUILD, y la caché vieja no sobrevive al deploy. */
window.PT_ASSET_REV = '2.7.37-f27e42231d';

/* Token de invalidación para URLs de assets (?v=) y para el build guard. */
window.PT_REV = function () {
  return String(window.PT_ASSET_REV || window.PT_BUILD || '1');
};
