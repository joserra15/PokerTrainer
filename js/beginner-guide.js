/*
 * beginner-guide.js — Guía de conceptos básicos para usuarios nuevos.
 */
(function (global) {
  'use strict';

  var SUGGESTED_QUESTIONS = [
    '¿Qué es el GTO y por qué importa en microlímites?',
    '¿Cuándo debo hacer fold preflop con una mano mediocre?',
    '¿Qué es un 3-bet y para qué sirve?',
    '¿Qué significa que estoy en posición (IP) o fuera de posición (OOP)?',
    '¿Cómo empiezo a usar el entrenador si nunca he jugado?'
  ];

  var MINI_DRILLS = [
    {
      id: 'rfi',
      title: 'Abrir el bote (RFI)',
      desc: 'Practica cuándo subir primero desde cada posición.',
      config: { scenario: 'rfi', practiceStreet: 'preflop', handRange: 'playable', villainLevel: 'fish', liveAdvisor: true }
    },
    {
      id: '3bet',
      title: '3-bet vs open',
      desc: 'Aprende a castigar opens débiles y a construir un rango sólido.',
      config: { scenario: '3bet', practiceStreet: 'preflop', handRange: 'playable', villainLevel: 'fish', liveAdvisor: true }
    },
    {
      id: 'face3bet',
      title: 'Defender vs 3-bet',
      desc: 'Decide cuándo continuar, 4-betear o tirar la mano.',
      config: { scenario: 'face3bet', practiceStreet: 'preflop', handRange: 'playable', villainLevel: 'fish', liveAdvisor: true }
    },
    {
      id: 'flop',
      title: 'Flop: c-bet y defensa',
      desc: 'Tras el preflop, practica las primeras decisiones del board.',
      config: { scenario: 'rfi', practiceStreet: 'flop', handRange: 'playable', villainLevel: 'fish', liveAdvisor: true }
    }
  ];

  var HAND_RANKS = [
    { name: 'Escalera de color', tip: 'Cinco cartas consecutivas del mismo palo. La más fuerte es la real: A-K-Q-J-10 del mismo palo.' },
    { name: 'Póker (four of a kind)', tip: 'Cuatro cartas del mismo valor (p. ej. cuatro ases).' },
    { name: 'Full house', tip: 'Un trío + una pareja (p. ej. tres ochos y dos reyes).' },
    { name: 'Color (flush)', tip: 'Cinco cartas del mismo palo, no consecutivas.' },
    { name: 'Escalera (straight)', tip: 'Cinco cartas consecutivas de palos distintos (A-2-3-4-5 y 10-J-Q-K-A valen).' },
    { name: 'Trío (three of a kind)', tip: 'Tres cartas del mismo valor.' },
    { name: 'Doble pareja (two pair)', tip: 'Dos pares distintos (p. ej. damas y seises).' },
    { name: 'Pareja (one pair)', tip: 'Dos cartas del mismo valor.' },
    { name: 'Carta alta (high card)', tip: 'Nada emparejado: gana quien tenga la carta más alta (y si empatan, el kicker).' }
  ];

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function firstName() {
    var u = (global.PTAuth && global.PTAuth.getUser) ? global.PTAuth.getUser() : global.PT_AUTH_USER;
    if (!u || !u.name) return '';
    var n = String(u.name).trim();
    return n ? n.split(/\s+/)[0] : '';
  }

  function sectionHtml(id, title, lead, body) {
    return '<section class="learn-section card-box" id="' + escapeHtml(id) + '" aria-labelledby="' + escapeHtml(id) + '-title">' +
      '<h3 class="learn-section-title" id="' + escapeHtml(id) + '-title">' + escapeHtml(title) + '</h3>' +
      (lead ? '<p class="learn-section-lead">' + lead + '</p>' : '') +
      body +
      '</section>';
  }

  function exampleBlock(title, body) {
    return '<div class="learn-example">' +
      '<div class="learn-example-label">' + escapeHtml(title) + '</div>' +
      '<div class="learn-example-body">' + body + '</div></div>';
  }

  function renderBasics() {
    return sectionHtml('learn-basics', '1. Qué es el Texas Hold\'em cash',
      'Juegas con dos cartas privadas y cinco comunitarias. El objetivo no es ganar cada mano: es tomar buenas decisiones a largo plazo.',
      '<ul class="learn-list">' +
      '<li><strong>Cash 6-max</strong> — mesa de hasta 6 jugadores; la variante que practica PokerForgeAI.</li>' +
      '<li><strong>Ciegas</strong> — apuestas obligatorias que se ponen <em>antes</em> de repartir las cartas. Fuerzan acción en cada mano: siempre hay fichas en el bote que merece la pena disputar. Sin ciegas, todos podrían esperar manos perfectas y la mesa se pararía.</li>' +
      '<li><strong>Ciega pequeña (SB)</strong> — pone la mitad de la unidad (p. ej. 0,05 € si la ciega grande es 0,10 €). Actúa primero postflop.</li>' +
      '<li><strong>Ciega grande (BB)</strong> — pone 1 unidad completa (la “bb”). Suele ser el precio mínimo para ver el flop si nadie ha subido.</li>' +
      '<li><strong>bb</strong> — unidad estándar: medimos stacks, apuestas y resultados en big blinds (ciegas grandes).</li>' +
      '<li><strong>Stack</strong> — tus fichas. En cash típico entrenamos ~100 bb.</li>' +
      '</ul>' +
      exampleBlock('Ejemplo rápido',
        'Si la ciega grande (BB) es 0,10 €, un stack de 100 bb son 10 €. Un raise a 2,5 bb son 0,25 €. La ciega pequeña habría puesto 0,05 € al empezar la mano.')
    );
  }

  function renderHandRanks() {
    var rows = HAND_RANKS.map(function (h, i) {
      return '<li class="learn-hand-rank">' +
        '<span class="learn-hand-rank-num">' + (i + 1) + '</span>' +
        '<span class="learn-hand-rank-body"><strong>' + escapeHtml(h.name) + '</strong> — ' + escapeHtml(h.tip) + '</span>' +
        '</li>';
    }).join('');
    return sectionHtml('learn-hands', '2. Manos y su prioridad',
      'Al showdown gana la mejor combinación de cinco cartas (usando tus dos cartas privadas y las del board). De más fuerte a más débil:',
      '<ol class="learn-hand-ranks">' + rows + '</ol>' +
      exampleBlock('Empates',
        'Si dos jugadores tienen la misma categoría (p. ej. pareja de ases), se comparan los kickers (cartas de desempate). Si las cinco cartas empatan, se reparte el bote.')
    );
  }

  function renderPositions() {
    return sectionHtml('learn-positions', '3. Posiciones en la mesa',
      'Cuanto más tarde actúas, más información tienes. La posición es una de las ventajas más importantes del póker.',
      '<div class="learn-positions">' +
      '<div class="learn-pos"><span class="learn-pos-code">UTG</span><span>Under the Gun — primero en actuar preflop; rango más cerrado.</span></div>' +
      '<div class="learn-pos"><span class="learn-pos-code">HJ / CO</span><span>Hijack y Cutoff — empiezas a abrir más manos.</span></div>' +
      '<div class="learn-pos"><span class="learn-pos-code">BTN</span><span>Button — la mejor posición; actúa último postflop.</span></div>' +
      '<div class="learn-pos"><span class="learn-pos-code">SB / BB</span><span>Ciegas — pagan obligatorio; la BB defiende el bote ya invertido.</span></div>' +
      '</div>' +
      exampleBlock('Idea clave',
        'Con la misma mano (p. ej. KTo) suele ser fold UTG y open desde BTN. El valor cambia con la posición.')
    );
  }

  function renderActions() {
    return sectionHtml('learn-actions', '4. Acciones y calles',
      'En cada calle eliges fold, check, call, bet o raise. El entrenador evalúa si tu elección se acerca a una estrategia equilibrada.',
      '<ul class="learn-list">' +
      '<li><strong>Preflop</strong> — antes del flop. Abrir (RFI), 3-bet, call o fold.</li>' +
      '<li><strong>Flop / Turn / River</strong> — tras 3, 4 y 5 cartas comunitarias.</li>' +
      '<li><strong>RFI</strong> — Raise First In: ser el primero en subir el bote.</li>' +
      '<li><strong>3-bet</strong> — subir de nuevo sobre un open (la tercera apuesta de la secuencia).</li>' +
      '<li><strong>C-bet</strong> — continuation bet: apostar el flop como agresor preflop.</li>' +
      '<li><strong>Pot odds</strong> — precio que te dan para continuar; relacionan call y tamaño del bote.</li>' +
      '</ul>' +
      exampleBlock('Ejemplo 3-bet',
        'CO abre a 2,5 bb. En BTN con AQs puedes 3-betear a ~8–9 bb: ganas valor, priorizas posición y reduces el campo.')
    );
  }

  function renderGto() {
    return sectionHtml('learn-gto', '5. Qué es el GTO',
      'GTO significa <em>Game Theory Optimal</em>: una estrategia equilibrada que no se deja explotar de forma sistemática, aunque el rival juegue perfecto.',
      '<div class="learn-gto-grid">' +
      '<div class="learn-gto-card">' +
      '<h4>No es “la jugada única”</h4>' +
      '<p>A menudo el GTO mezcla acciones (p. ej. 70 % call / 30 % raise). Entrenar te enseña <em>frecuencias</em>, no solo un botón correcto.</p>' +
      '</div>' +
      '<div class="learn-gto-card">' +
      '<h4>Sirve como referencia</h4>' +
      '<p>En microlímites casi nadie juega GTO perfecto. Aun así, aprender bases GTO evita leaks graves (fold demasiado, call sin odds, bluffs sin coherencia).</p>' +
      '</div>' +
      '<div class="learn-gto-card">' +
      '<h4>En PokerForgeAI</h4>' +
      '<p>El entrenador y el IA Coach usan <strong>estimaciones</strong> orientativas (no un solver exacto en vivo). Son herramientas de estudio, no oráculos.</p>' +
      '</div>' +
      '</div>' +
      exampleBlock('Traducción simple',
        'GTO ≈ “juego sólido y equilibrado”. Exploit ≈ “adaptarte a los errores del rival”. Primero construye base GTO; luego explota fish.')
    );
  }

  function renderPath() {
    return sectionHtml('learn-path', '6. Cómo usar la app si empiezas de cero',
      'Sigue este orden antes de analizar sesiones reales o preguntar al coach sobre spots difíciles.',
      '<ol class="learn-steps">' +
      '<li><strong>Lee esta guía</strong> y anota términos que no entiendas.</li>' +
      '<li><strong>Activa el avisador en vivo</strong> al configurar el entrenador. Te muestra qué ocurre en la mesa, la acción recomendada y una explicación <em>antes</em> de decidir: ideal para aprender sin ir a ciegas.</li>' +
      '<li><strong>Haz un mini entrenamiento</strong> de RFI o 3-bet (abajo) con rivales fish — ya llevan el avisador activado.</li>' +
      '<li><strong>Revisa el feedback</strong> tras cada mano: frecuencia GTO y EV estimado.</li>' +
      '<li><strong>Pregunta al IA Coach</strong> al final de esta página cuando tengas dudas concretas.</li>' +
      '<li>Cuando tengas base, importa sesiones y mira estadísticas / leaks.</li>' +
      '</ol>' +
      exampleBlock('Consejo',
        'En Configurar sesión busca la casilla <strong>Avisador en vivo</strong>. Déjala marcada las primeras sesiones; cuando te sientas más seguro, puedes desactivarla y decidir solo.')
    );
  }

  function renderDrills() {
    var cards = MINI_DRILLS.map(function (d) {
      return '<button type="button" class="learn-drill" data-learn-drill="' + escapeHtml(d.id) + '">' +
        '<span class="learn-drill-title">' + escapeHtml(d.title) + '</span>' +
        '<span class="learn-drill-desc">' + escapeHtml(d.desc) + '</span>' +
        '<span class="learn-drill-cta">Empezar práctica →</span>' +
        '</button>';
    }).join('');
    return sectionHtml('learn-drills', '7. Mini entrenamiento dirigido',
      'Cuatro rutinas cortas con la configuración ya preparada (incluye avisador en vivo). Empieza por RFI si nunca has entrenado.',
      '<div class="learn-drills">' + cards + '</div>'
    );
  }

  function renderCoachMount() {
    var chips = SUGGESTED_QUESTIONS.map(function (q) {
      return '<button type="button" class="learn-ask-chip" data-learn-ask="' + escapeHtml(q) + '">' +
        escapeHtml(q) + '</button>';
    }).join('');
    return sectionHtml('learn-coach', '8. Pregunta al IA Coach',
      'Resuelve dudas de conceptos o de cómo entrenar. Cada pregunta consume consulta del plan (estudio / coach), salvo que tengas bonos.',
      '<div class="learn-ask-chips" aria-label="Preguntas sugeridas">' + chips + '</div>' +
      '<div id="learn-coach-mount" class="learn-coach-mount"></div>'
    );
  }

  function bindDrills(root) {
    root.querySelectorAll('[data-learn-drill]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-learn-drill');
        var drill = MINI_DRILLS.find(function (d) { return d.id === id; });
        if (!drill) return;
        if (typeof global.startGuidedTraining === 'function') {
          global.startGuidedTraining(drill.config);
        } else if (typeof global.goToTab === 'function') {
          global.goToTab('play', { setup: true });
        }
      });
    });
  }

  function bindSuggestedAsks(root) {
    root.querySelectorAll('[data-learn-ask]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = btn.getAttribute('data-learn-ask') || '';
        var mount = root.querySelector('#learn-coach-mount');
        if (!mount) return;
        var input = mount.querySelector('[data-ai-question-input]');
        var form = mount.querySelector('[data-ai-question-form]');
        var toggle = mount.querySelector('[data-ai-question-toggle]');
        if (form && form.hidden && toggle) toggle.click();
        if (input) {
          input.value = q;
          input.dispatchEvent(new Event('input'));
          input.focus();
        }
      });
    });
  }

  function mountCoach(root) {
    var host = root.querySelector('#learn-coach-mount');
    if (!host || !global.PTAIReport || !global.PTAIReport.mount) return;
    host.innerHTML = '';
    global.PTAIReport.mount(host, {
      scope: 'learn',
      hideReport: true,
      openQuestionForm: true,
      questionToggleLabel: 'Hacer una pregunta',
      userName: firstName(),
      getData: function () {
        var Store = global.Store;
        var stats = Store && Store.getStats ? Store.getStats() : {};
        return {
          beginner: true,
          stats: stats,
          leaks: [],
          weekly: [],
          sessionLeaks: [],
          sessionsTotal: null
        };
      },
      persist: { kind: 'learn' }
    });
  }

  function render(container) {
    if (!container) return;
    var name = firstName();
    var hello = name ? ('Hola, ' + name + '. ') : '';
    container.innerHTML =
      '<div class="learn-page">' +
      '<header class="learn-hero">' +
      '<p class="learn-eyebrow">Guía para principiantes</p>' +
      '<h2 class="learn-title">' + escapeHtml(hello) + 'Empieza aquí antes del entrenador</h2>' +
      '<p class="learn-lead">Si nunca has jugado o aún no controlas conceptos (ciegas, manos, posiciones, 3-bets, GTO…), esta guía te da la base y un mini entrenamiento con avisador en vivo. Luego podrás preguntar dudas al IA Coach.</p>' +
      '<nav class="learn-toc" aria-label="Contenidos">' +
      '<a href="#learn-basics">Reglas</a>' +
      '<a href="#learn-hands">Manos</a>' +
      '<a href="#learn-positions">Posiciones</a>' +
      '<a href="#learn-actions">Acciones</a>' +
      '<a href="#learn-gto">GTO</a>' +
      '<a href="#learn-path">Ruta</a>' +
      '<a href="#learn-drills">Práctica</a>' +
      '<a href="#learn-coach">IA Coach</a>' +
      '</nav>' +
      '</header>' +
      renderBasics() +
      renderHandRanks() +
      renderPositions() +
      renderActions() +
      renderGto() +
      renderPath() +
      renderDrills() +
      renderCoachMount() +
      '</div>';

    bindDrills(container);
    bindSuggestedAsks(container);
    mountCoach(container);
  }

  global.PTBeginnerGuide = {
    render: render,
    MINI_DRILLS: MINI_DRILLS
  };
})(window);
