/*
 * school-data-mttlab.js — Esqueleto Escuela MTT LAB (M1–M8), allOpen + externalLinks.
 */
(function (global) {
  'use strict';

  var D = global.PTSchoolData;
  if (!D || !D.registerLessons) {
    console.warn('[school-data-mttlab] PTSchoolData no disponible');
    return;
  }

  function lesson(id, title, moduleId, order, extra) {
    extra = extra || {};
    return {
      id: id,
      title: title,
      route: 'mttlab',
      module: moduleId,
      order: order,
      plan: 'free',
      xp: extra.xp || 20,
      passThreshold: 0,
      goldThreshold: 0,
      concept: extra.concept || title,
      theory: extra.theory || [
        'Contenido en preparación. Esta lección forma parte del esqueleto de MTT LAB.'
      ],
      examples: extra.examples || [],
      aiQuestions: extra.aiQuestions || [],
      spots: extra.spots || [],
      externalLinks: extra.externalLinks || []
    };
  }

  var lessons = [];

  // M1 — Fundamentos del MTT
  [
    'Qué son los MTT y cómo funcionan',
    'Estructura de un torneo',
    'Fases del torneo',
    'Stack sizes',
    'Posiciones',
    'ICM',
    'Rangos',
    'Conceptos fundamentales que necesitas dominar'
  ].forEach(function (t, i) {
    lessons.push(lesson('ML-M1-' + String(i + 1).padStart(2, '0'), t, 'M1', i + 1, {
      theory: [
        'Módulo 1 — Fundamentos del MTT. Especialmente útil si vienes de cash, spins o empiezas desde cero.',
        'Lección: ' + t + '.'
      ]
    }));
  });

  // M2 — Cómo jugar contra cada tipo de jugador
  [
    'Cómo identificar los diferentes perfiles',
    'Cómo analizar a un jugador',
    'Qué información buscar',
    'Cómo adaptar tus rangos y decisiones',
    'Cómo explotar cada perfil',
    'Ejemplos reales',
    'Teoría + práctica',
    'IA para practicar situaciones'
  ].forEach(function (t, i) {
    lessons.push(lesson('ML-M2-' + String(i + 1).padStart(2, '0'), t, 'M2', i + 1));
  });

  // M3 — Cómo jugar cada tipo de MTT
  [
    'Tipos de torneos',
    'Freezeout',
    'Re-entry',
    'Progressive Knockout / PKO',
    'Turbo',
    'Hyper-turbo',
    'Satélites',
    'Torneos con diferentes estructuras',
    'Cómo cambia tu estrategia',
    'Cómo seleccionar torneos',
    'Cómo jugar óptimamente cada formato'
  ].forEach(function (t, i) {
    lessons.push(lesson('ML-M3-' + String(i + 1).padStart(2, '0'), t, 'M3', i + 1));
  });

  // M4 — Cómo estudiar póker
  [
    'Qué estudiar',
    'Cómo estudiar',
    'Cómo analizar manos',
    'Cómo revisar sesiones',
    'Cómo detectar leaks',
    'Cómo utilizar software',
    'Cómo utilizar IA',
    'Teoría → práctica → revisión',
    'Cómo crear un plan de estudio'
  ].forEach(function (t, i) {
    lessons.push(lesson('ML-M4-' + String(i + 1).padStart(2, '0'), t, 'M4', i + 1));
  });

  // M5 — Cómo organizar tu grind
  [
    'Horas de estudio',
    'Horas de juego',
    'Cómo organizar la semana',
    'Cuántos torneos jugar',
    'Gestión del tiempo',
    'Tracking de resultados',
    'Cómo analizar tu progreso',
    'Cuándo subir de stakes',
    'Cuándo bajar',
    'Gestión de banca'
  ].forEach(function (t, i) {
    lessons.push(lesson('ML-M5-' + String(i + 1).padStart(2, '0'), t, 'M5', i + 1));
  });

  // M6 — Mentalidad y psicología
  [
    'Tilt (dentro de la partida)',
    'Bad beats',
    'Decisiones bajo presión',
    'Control emocional',
    'Concentración',
    'Fatiga',
    'Disciplina (fuera de la partida)',
    'Constancia',
    'Resultados vs proceso',
    'Gestión de pérdidas',
    'Rutinas',
    'Motivación'
  ].forEach(function (t, i) {
    lessons.push(lesson('ML-M6-' + String(i + 1).padStart(2, '0'), t, 'M6', i + 1));
  });

  // M7 — De Cash → MTT
  [
    'Principales diferencias',
    'Errores típicos',
    'Qué conceptos debes desaprender',
    'Qué conceptos debes aprender',
    'Adaptación de rangos',
    'ICM',
    'Juego por fases',
    'Ejemplos'
  ].forEach(function (t, i) {
    lessons.push(lesson('ML-M7-' + String(i + 1).padStart(2, '0'), t, 'M7', i + 1));
  });

  // M8 — De Spins → MTT
  [
    'Diferencias estructurales',
    'Errores típicos',
    'Adaptación estratégica',
    'ICM',
    'Stack sizes',
    'Juego postflop',
    'Torneos largos',
    'Adaptación mental'
  ].forEach(function (t, i) {
    lessons.push(lesson('ML-M8-' + String(i + 1).padStart(2, '0'), t, 'M8', i + 1));
  });

  D.registerLessons(lessons);
  if (D.setRouteStatus) D.setRouteStatus('mttlab', 'active');

  // Module copy for hub (consumed if school.js looks up PTSchoolData / PTCommunity)
  global.PT_MTTLAB_MODULE_COPY = {
    M1: { title: 'Fundamentos del MTT', blurb: 'Base para cash, spins o principiantes.' },
    M2: { title: 'Cómo jugar contra cada tipo de jugador', blurb: 'Perfiles, explotación y práctica.' },
    M3: { title: 'Cómo jugar cada tipo de MTT', blurb: 'Formatos, estructuras y selección.' },
    M4: { title: 'Cómo estudiar póker', blurb: 'Sistema de mejora: teoría → práctica → revisión.' },
    M5: { title: 'Cómo organizar tu grind', blurb: 'Tiempo, volumen, stakes y banca.' },
    M6: { title: 'Mentalidad y psicología', blurb: 'Dentro y fuera de la partida.' },
    M7: { title: 'De Cash → MTT', blurb: 'Transición desde cash games.' },
    M8: { title: 'De Spins → MTT', blurb: 'Transición desde spins.' }
  };
})(typeof window !== 'undefined' ? window : this);
