/* Interacciones de la web. Sin dependencias ni build. */
(function () {
  'use strict';

  var movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Menú móvil --- */
  var boton = document.querySelector('.menu-boton');
  var navegacion = document.getElementById('menu-principal');

  function cerrarMenu() {
    if (!boton || !navegacion) return;
    boton.setAttribute('aria-expanded', 'false');
    navegacion.classList.remove('navegacion--abierta');
  }

  if (boton && navegacion) {
    boton.addEventListener('click', function () {
      var abierto = boton.getAttribute('aria-expanded') === 'true';
      boton.setAttribute('aria-expanded', String(!abierto));
      navegacion.classList.toggle('navegacion--abierta', !abierto);
    });

    navegacion.addEventListener('click', function (evento) {
      if (evento.target.closest('a')) cerrarMenu();
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') cerrarMenu();
    });
  }

  /* --- Borde de la cabecera al hacer scroll --- */
  var cabecera = document.getElementById('cabecera');

  if (cabecera) {
    var actualizarCabecera = function () {
      cabecera.classList.toggle('cabecera--fijada', window.scrollY > 8);
    };
    actualizarCabecera();
    window.addEventListener('scroll', actualizarCabecera, { passive: true });
  }

  /* --- Aparición progresiva de los bloques --- */
  var revelables = document.querySelectorAll('.revelar');

  if (movimientoReducido || !('IntersectionObserver' in window)) {
    revelables.forEach(function (elemento) {
      elemento.classList.add('revelar--visible');
    });
  } else {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('revelar--visible');
        observador.unobserve(entrada.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    revelables.forEach(function (elemento) {
      observador.observe(elemento);
    });
  }

  /* --- Enlace activo según la sección visible --- */
  var enlaces = Array.prototype.slice.call(
    document.querySelectorAll('.navegacion__lista a[href^="#"]')
  );
  var secciones = enlaces
    .map(function (enlace) { return document.querySelector(enlace.getAttribute('href')); })
    .filter(Boolean);

  if (secciones.length && 'IntersectionObserver' in window) {
    var observadorSecciones = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        enlaces.forEach(function (enlace) {
          enlace.classList.toggle(
            'activo',
            enlace.getAttribute('href') === '#' + entrada.target.id
          );
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    secciones.forEach(function (seccion) {
      observadorSecciones.observe(seccion);
    });
  }

  /* --- Año del pie --- */
  var anio = document.querySelector('[data-anio]');
  if (anio) anio.textContent = String(new Date().getFullYear());
})();
