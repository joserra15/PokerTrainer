'use strict';

/**
 * Contenido pedagógico — Pro Cash C-26…C-31.
 * Solo concept / theory / examples / aiQuestions (sin route, plan, xp…).
 * Voz: profesor ES-ES; glosar término la 1ª vez; «hacer call»; «limpear».
 * C-31: examen checklist, sin jerga nueva.
 */
module.exports = {
  lessons: {
    'C-26': {
      concept:
        'El 4-bet —y el cold 4-bet cuando aún no has entrado— es la capa después del 3-bet: value premium por un lado y faroles con blockers por el otro, más tight si entras en frío.',
      theory: [
        {
          title: 'Qué es un 4-bet',
          body:
            'Tras un open y un 3-bet (resubida), el 4-bet es la siguiente subida. Separar value (manos fuertes que quieren stack o un bote grande: a menudo KK+, AK) de faroles (manos que bloquean premium y se tiran ante mucha presión: ases suited selectivos). Sin esa separación, el 4-bet se vuelve spew.'
        },
        {
          title: 'Cold 4-bet',
          body:
            'Cold 4-bet significa subir a 4-bet sin haber entrado antes en la mano (no abriste ni hiciste call al open): llegas “en frío” frente a open + 3-bet. Tu rango debe ser más tight que el del que ya abrió: menos faroles, más claridad de value, porque no tienes fold equity de “continuar tu historia” de open.'
        },
        {
          title: 'Posición del 3-bet y trampas',
          body:
            'Vs 3-bet desde early (UTG/HJ) 4-beteas menos light que vs 3-bet del botón: el rango de 3-bet temprano es más fuerte. Trampa clásica: 4-bet spew con KQo offsuit o “porque ya metí fichas”. Si no es value claro ni farol con blocker bueno, fold o, a veces, hacer call en posición con manos jugables — no inventes 4-bets de orgullo.'
        }
      ],
      examples: [
        {
          title: 'Value claro',
          body:
            'Abres BTN, BB 3-betea. Con KK o AK: 4-bet de value. Quieres que paguen de más o que stackeen peor; no “slow-play” eterno por miedo.'
        },
        {
          title: 'Farol con blocker',
          body:
            'Misma línea, A5s: candidato a 4-bet farol porque bloqueas AA/AK. K9o no bloquea lo mismo — suele ser fold, no hero 4-bet.'
        },
        {
          title: 'Cold 4-bet desde ciegas',
          body:
            'UTG open, BTN 3-bet, tú en BB sin haber entrado: cold 4-bet. Aquí QQ+/AK entran; Axs light se reduce mucho respecto a si tú fueras el opener enfrentando el 3-bet.'
        }
      ],
      aiQuestions: [
        '¿Qué diferencia un 4-bet de value de un 4-bet farol?',
        '¿Qué es un cold 4-bet y por qué suele ser más tight?',
        '¿Vs qué 3-bet 4-beteas menos light?'
      ]
    },

    'C-27': {
      concept:
        'En un single-raised pot fuera de posición a stacks deep construyes check-call y check-raise con plan: pot control importa porque quedan muchas calles por delante.',
      theory: [
        {
          title: 'SRP OOP deep',
          body:
            'SRP (single-raised pot) es un bote con una sola subida preflop (open + call, sin 3-bet). OOP (out of position, fuera de posición) significa actuar antes que el rival en las calles postflop. Deep (stacks profundos, p. ej. 100 bb+) multiplica el coste de un error: hay turn y river con mucho dinero detrás.'
        },
        {
          title: 'Líneas: check-call y check-raise',
          body:
            'Check-call (pasar y luego hacer call) protege medias y algunas fuertes que no quieren bote hinchado aún. Check-raise (pasar y resubir) polariza: value fuerte y faroles elegidos. No autocbetees OOP en boards wet solo por ser el agresor (recuerda C-16): a menudo el plan es ceder la iniciativa y decidir en turn. En la práctica juegas flop, turn y river: cada calle evalúa si tu check-call o check-raise era correcto.'
        },
        {
          title: 'Pot control y trampa donk',
          body:
            'Pot control es mantener el bote manejable cuando tu mano es media o el board es peligroso. Trampa: donk bet (apostar de primero OOP sin plan) o hinchar con segunda pareja sticky. Deep, un donk spew te mete en rivers imposibles; prefiere líneas de check que cuenten una historia.'
        }
      ],
      examples: [
        {
          title: 'Medias en seco',
          body:
            'BB vs BTN, flop K72r, tú con 99: check-call frecuente. No check-raiseas “para ver si va”; controlas el bote y reevalúas turn.'
        },
        {
          title: 'Check-raise polar',
          body:
            'Mismo spot, set de sietes o farol con A♠x en board que bloquea: check-raise tiene historia. QJ sin pareja no es check-raise de value.'
        },
        {
          title: 'Wet OOP',
          body:
            'Flop 9♠8♠7♥ tras tu open desde SB: muchas manos checkean. Autocbet aquí es la fuga típica; pot control y selectividad ganan más EV a 100 bb.'
        }
      ],
      aiQuestions: [
        '¿Qué es un SRP y por qué duele más OOP deep?',
        '¿Cuándo prefieres check-call frente a check-raise?',
        '¿Por qué el donk bet sin plan es peligroso a 100 bb?'
      ]
    },

    'C-28': {
      concept:
        'Mismo spot, dos rivales: contra fish cobras value más fino; contra reg eliges faroles con blockers y sueltas el thin loco. La población manda más que un GTO ciego.',
      theory: [
        {
          title: 'Fish vs reg',
          body:
            'Fish (jugador recreacional, paga de más y foldea mal) y reg (regular, defiende mejor y castiga líneas flojas) piden estrategias distintas. Explotación es desviarte del mix equilibrado para ganar más contra el error típico de esa población — sin inventar jugadas que solo funcionan en el vacío.'
        },
        {
          title: 'Value thin y faroles selectivos',
          body:
            'Vs fish: value thin (cobrar con manos decentes que un reg no pagaría) y menos faroles en river — te pagan el value y no tirarán lo suficiente al farol. Vs reg: faroles con blockers buenos, menos thin crazy, y respeto a sus raises. No juegues “un solo GTO” ignorando quién tienes enfrente.'
        },
        {
          title: 'Trampa vs calling station',
          body:
            'Farolear rivers vs calling station (alguien que hace call de más) es regalar fichas. Si te han mostrado que pagan con segunda pareja, deja de farolear y empieza a value-betear manos medias. La explotación correcta a veces es aburrida: cobras, no inventas.'
        }
      ],
      examples: [
        {
          title: 'River value thin vs fish',
          body:
            'Tú con top pair kicker medio en un river seco: vs fish, bet de value. Vs reg tight que solo paga fuertes, a veces check-back gana más.'
        },
        {
          title: 'Farol vs reg con blocker',
          body:
            'Missed draw con as del palo del flush posible vs un reg que overfoldea rivers: candidato a farol. Misma mano vs fish pegajoso: check y rinde.'
        },
        {
          title: 'Misma línea, distinto plan',
          body:
            'Flop c-bet + turn barrel: vs fish busca value en river con manos medias; vs reg evalúa si tu historia de farol es creíble y si él tiene bluff-catchers que tirará.'
        }
      ],
      aiQuestions: [
        '¿Qué cambia en river value thin entre fish y reg?',
        '¿Cuándo dejo de farolear aunque “GTO diga mix”?',
        '¿Qué error cometo faroleando a una calling station?'
      ]
    },

    'C-29': {
      concept:
        'Ejercicio guiado: dado un board y una línea, describe el rango rival en bandas (value / medias / aire), no como una sola mano — el mismo músculo que R-05, ahora en modo quiz.',
      theory: [
        {
          title: 'Range vs range',
          body:
            'Pensar range vs range es comparar tu distribución de manos con la del villano en ese nodo, no “mi mano contra la suya”. El quiz te obliga a escribir bandas: qué value llega, qué medias sobreviven, qué aire aún farolea. Sin eso, cada decisión se vuelve adivinanza de una carta.'
        },
        {
          title: 'Cómo responder el ejercicio',
          body:
            'Narrativa corta: posición, acciones preflop y postflop, textura del board. Luego tres columnas. Contrasta con el menú Rangos si hay chart del spot. Si tu columna de aire está vacía ante un bet polar, estás sesgado hacia “siempre value”.'
        },
        {
          title: 'Trampa de la nuts fija',
          body:
            'Poner al hero o al villano “siempre en la nuts” mata el ejercicio. Oblígate a nombrar al menos un farol creíble y una media. El profesor no busca la mano exacta: busca una historia de rango coherente con la línea.'
        }
      ],
      examples: [
        {
          title: 'Plantilla de respuesta',
          body:
            '“BTN open, BB call; flop A72r check-check; turn 2 bet BTN; river 8 bet. Value: Ax fuerte, trips. Medias: Kx, mid pair. Aire: missed broadway con blocker.” Esa forma aprueba el quiz.'
        },
        {
          title: 'Quiz express',
          body:
            'Te dan: CO open, BTN 3-bet, CO call; flop K93r; CO check, BTN bet, CO raise. Escribe rangos de CO en el raise antes de mirar cualquier chart.'
        },
        {
          title: 'Autocorrección',
          body:
            'Si tu lista de value del rival no incluye ninguna mano que tú también podrías tener en su silla, revisa: o te falta realismo o estás inventando monstruos.'
        }
      ],
      aiQuestions: [
        '¿Cómo describes un rango rival en tres bandas?',
        '¿Por qué “siempre la nuts” invalida el ejercicio?',
        '¿Qué datos mínimos necesitas antes de asignar el rango (línea + board)?'
      ]
    },

    'C-30': {
      concept:
        'Lleva el node locking mental a la mesa de cash: piensa en frecuencias (“aquí c-beteo ~70 %”) aunque ejecutes una sola acción — así no tiltas cuando el chart a veces checkea.',
      theory: [
        {
          title: 'Frecuencias en la práctica',
          body:
            'En Pro Cash no juegas un solver en vivo, pero sí internalizas nodos: “en este flop seco IP el mix sano es c-bet frecuente”. Elegir bet o check hoy es una muestra de ese mix. Enlace con R-06: el laboratorio enseña el %; esta lección lo convierte en hábito de mesa.'
        },
        {
          title: 'Para qué sirve el locking mental',
          body:
            'Sirve para no pelearte con la realidad del chart (“¿por qué checkea AQo a veces?”) y para no rigidizar tu juego a pure strategies. También te ayuda a estudiar: cuando revises una mano, pregunta qué frecuencia tenía sentido, no solo si tu acción fue “la única correcta”.'
        },
        {
          title: 'Trampa de la pure strategy',
          body:
            'Exigir siempre bet o siempre check en todos los spots te hace predecible y te enfada con el material de estudio. Acepta el mix: en nodos mezclados, dos acciones pueden ser razonables; lo que falla es la tercera (sizing loco, donk spew, hero-call sin historia).'
        }
      ],
      examples: [
        {
          title: 'Frase en mesa',
          body:
            'Antes del c-bet: “Aquí apuesto la mayoría, no el 100 %.” Si checkeas una media borderline, no es traición al plan: es una muestra del 30 %.'
        },
        {
          title: 'Estudio post-sesión',
          body:
            'Marca tres nodos de tu sesión (c-bet flop, face raise, river). Anota qué frecuencia intuías. Compárala con el menú Rangos o con notas de clase — calibración, no castigo.'
        },
        {
          title: 'Vs explotación',
          body:
            'El mix GTO es el punto de partida; vs fish puedes “lockear” más value bets (C-28). El locking mental no te impide explotar: te impide mentirte sobre qué estás haciendo.'
        }
      ],
      aiQuestions: [
        '¿Qué frase de frecuencias usarías en un c-bet seco IP?',
        '¿Cómo te ayuda el node locking al revisar una mano?',
        '¿Cuándo tiene sentido desviarte del mix hacia explotación?'
      ]
    },

    'C-31': {
      concept:
        'Examen Pro Cash: certifica que aplicas 4-bet, SRP OOP, explotación fish/reg y lectura de rangos con el checklist de esta ruta — sin introducir teoría nueva.',
      theory: [
        {
          title: 'Qué se evalúa',
          body:
            'Repasas lo ya visto en C-26…C-30 y el músculo de rangos (R-05/R-06): value vs farol en 4-bet, pot control OOP deep, fish vs reg en river, bandas de rango y frecuencias mentales. No hay glosario nuevo: solo aplicación.'
        },
        {
          title: 'Checklist de profesor',
          body:
            'Antes de cada decisión del examen: (1) ¿qué capa preflop es — open, 3-bet, 4-bet o cold? (2) ¿SRP u OOP deep — cuál es mi línea de check? (3) ¿rival fish o reg — value thin o farol selectivo? (4) ¿puedo describir el rango rival en bandas? (5) ¿estoy pensando en frecuencia o en “siempre”?'
        }
      ],
      examples: [
        {
          title: 'Mini checklist 4-bet',
          body:
            '¿Value premium o farol con blocker? ¿Cold o ya abrí? ¿El 3-bet viene de early o de BTN? Si no respondes las tres, no pulses 4-bet.'
        },
        {
          title: 'Mini checklist river',
          body:
            '¿Me pagan de más (fish) o defienden bien (reg)? ¿Mi mano es value thin, bluff-catcher o aire con blocker? Una pregunta de población evita el spew.'
        },
        {
          title: 'Antes de pulsar',
          body:
            'Di en voz alta la banda del rival (value / medias / aire) y tu plan en una frase. Si la frase es solo “voy”, aún no estás listo para el examen.'
        }
      ],
      aiQuestions: [
        'Resume 4-bet value vs farol en una frase de profesor.',
        '¿Qué cambia en river value entre fish y reg?',
        '¿Cuáles son las cinco preguntas del checklist Pro Cash?'
      ]
    }
  }
};
