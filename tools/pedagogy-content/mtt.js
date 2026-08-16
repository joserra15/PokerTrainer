'use strict';

/**
 * MTT Escuela — voz pedagógica (España) para T-00…T-22 + teachBacks de spots.
 * Solo texto didáctico: concept, theory[{title,body}], examples, aiQuestions.
 * Call = «hacer call». Limp = «limpear». Glosa término+ancla la 1ª vez en cada lección.
 */
module.exports = {
  lessons: {
    'T-00': {
      concept:
        'Un MTT (torneo multi-mesa) se juega por fases: early, mid, short, push y burbuja. El ante (pago extra obligatorio cada mano) y tu stack en bb (ciegas grandes) cambian el plan mucho antes de mirar las cartas.',
      theory: [
        {
          title: 'Mapa de fases',
          body:
            'Early suele ser 40–60+ bb: juego parecido al cash, con paciencia. Mid baja hacia 25–35 bb y empiezas a robar más. Short (aprox. 20–12 bb) fuerza opens o shoves; push (aprox. 12–8 bb) es casi solo shove o fold. Bubble (burbuja) es cuando faltan pocos para cobrar: el ICM (valor en dinero real de tus fichas según el payout) manda.'
        },
        {
          title: 'Ante y bote muerto',
          body:
            'El ante engorda el bote sin que nadie haya abierto. Eso sube la recompensa de un steal (robar ciegas) exitoso y hace que pasar de largo cueste más a largo plazo. No juegues "sin ante" cuando la mesa ya paga ante cada mano.'
        },
        {
          title: 'Cuenta en bb, no en fichas absolutas',
          body:
            '"Tengo 12.000 fichas" no decide nada hasta que divides por la ciega grande. Diez bb a ciegas altas es un short stack; cuarenta bb es early profundo. Antes de cada nivel, ancla: fase + stack en bb + quién es big/mid/short en tu mesa.'
        },
        {
          title: 'Honestidad del curso',
          body:
            'Aquí entrenamos principios de fases e ICM, no un solver de field de cientos de jugadores. Si entiendes el mapa mental, luego afinamos números; si no, las charts no te salvan.'
        }
      ],
      examples: [
        {
          title: 'Misma mano, distinta fase',
          body:
            'K9o en BTN a 50 bb early: open estándar cash-like. La misma K9o a 11 bb en push: a menudo shove (ir all-in) o fold según chart — ya no es un open de 2,5 bb "para ver flop".'
        },
        {
          title: 'Ante que empuja el robo',
          body:
            'Sin ante, robar SB+BB vale poco relativo a tu stack profundo. Con ante, el dead money (fichas ya en el bote) justifica steals más wide desde CO/BTN antes de entrar en zona corta.'
        },
        {
          title: 'Lectura rápida de mesa',
          body:
            'Antes de la mano: "Estoy mid a 22 bb, hay un short a 9 bb y un cover a 55 bb". Ese mapa decide si presionas, sobrevives o buscas doble — no solo si "te gusta" la mano.'
        }
      ],
      aiQuestions: [
        '¿Cómo sé si estoy en early, mid, short o push solo mirando bb?',
        '¿Por qué el ante cambia mi plan de robos?',
        '¿Qué es ICM en una frase y cuándo empieza a importar?'
      ]
    },

    'T-01': {
      concept:
        'En early (stacks profundos, a menudo 40–60+ bb) juegas spots claros y con paciencia: construyes stack sin coin flips inútiles ni spew (regalar fichas en spots −EV). El objetivo es llegar a mid con un stack jugable, no "hacer acción" en la primera ciega.',
      theory: [
        {
          title: 'Cash-like, no cash idéntico',
          body:
            'Con muchas bb el preflop se parece al cash: open o fold desde early, rangos más wide en late, sin limpear (igualar la ciega grande para entrar sin subir) en mesas modernas. Aun así el objetivo es supervivencia y stack usable más adelante, no maximizar cada pot como si pudieras cash-out.'
        },
        {
          title: 'Evita spew early',
          body:
            'Spew típico: 3-bet wars sin necesidad, faroles sin plan postflop, hero-calls "porque estoy deep". Las fichas early se defienden mejor: un error grande aquí te deja short mucho antes de la burbuja.'
        },
        {
          title: 'Trampa de mentalidad',
          body:
            'Jugar "como final table" en la primera órbita es un leak: no hay ICM de FT ni presión de burbuja. Sé selectivo, acumula sin drama y guarda energía mental para mid y short.'
        }
      ],
      examples: [
        {
          title: 'Open claro BTN',
          body:
            'ATo o 99 en BTN a ~40 bb: open estándar. Quieres pot manejable o robar ciegas; no necesitas all-in ni inventar líneas raras.'
        },
        {
          title: 'Fold UTG con paciencia',
          body:
            'Q8o UTG early: fold. Hay mucha gente detrás y la mano no juega bien multiway. Early no se "fuerza" basura solo porque te aburres.'
        },
        {
          title: 'HJ marginal',
          body:
            'A5o HJ early: a menudo fold. El as offsuit bajo se domina mucho y no tiene la jugabilidad de A5s; no es spot para spew buscando acción.'
        }
      ],
      aiQuestions: [
        '¿Qué cambia en early respecto al cash 100 bb?',
        '¿Por qué no debo forzar manos mediocres UTG early?',
        'Dame un ejemplo de spew típico en early MTT'
      ]
    },

    'T-02': {
      concept:
        'Antes de mirar solo tu mano, lee antenas de stack: quién es big stack, mid o short. Eso decide quién puede aplicar presión, quién necesita doble y a quién no conviene chocar. Piensa en bb efectivas (y en M si te ayuda), no en fichas absolutas.',
      theory: [
        {
          title: 'M y bb efectivas',
          body:
            'M (o M-ratio) resume cuántas órbitas te quedan pagando ciegas y antes. En la práctica del día a día, contar bb efectivas suele bastar: stack ÷ ciega grande (ajustando si el rival tiene menos). Lo importante es clasificar roles, no memorizar fórmulas.'
        },
        {
          title: 'Roles en la mesa',
          body:
            'Big stacks pueden abrir más y forzar folds. Short stacks buscan spots de doble o shove. Mid stacks a menudo sobreviven: no quieren coin flips grandes vs covers. No trates a todos igual solo porque "tienes la misma mano".'
        },
        {
          title: 'Trampa: ceguera de stack',
          body:
            'Jugar solo tu combo e ignorar covers/shorts es un leak clásico. Un open wide vs un short desperate o un call light vs un big que te puede eliminar cambian el EV aunque la equity de la mano sea similar.'
        }
      ],
      examples: [
        {
          title: 'Cover vs short',
          body:
            'Tú 45 bb, short 11 bb en BTN: su shove es más wide por desesperación. Tú no pagas light "porque soy cover"; primero preguntas si el call mejora tu prize o solo tus fichas.'
        },
        {
          title: 'Mid entre dos fuegos',
          body:
            'Tú 22 bb, big 60 bb a tu izquierda y short 8 bb: opens flojos vs el big te meten en spots feos. Mejor spots claros o dejar que el short se juegue la vida.'
        },
        {
          title: 'Misma mano, distinto rival',
          body:
            '99 vs open de un mid a 28 bb no es lo mismo que 99 vs shove de un short a 9 bb. El stack relativo cambia fold equity, rangos y riesgo de eliminación.'
        }
      ],
      aiQuestions: [
        '¿Cómo clasifico big, mid y short en mi mesa?',
        '¿Para qué sirve pensar en M o en bb efectivas?',
        '¿Por qué no juego igual vs un cover que vs un short?'
      ]
    },

    'T-03': {
      concept:
        'Examen M0: repasas fases del torneo y early con paciencia. Sin teoría nueva — solo checklist de cómo revisar cada decisión antes de clicar.',
      theory: [
        {
          title: 'Paso 1',
          body:
            'Identifica la fase: ¿early profundo, mid, o ya cerca de short? Mira tu stack en bb y el de los rivales relevantes. Si estás early, prioriza spots claros y evita spew.'
        },
        {
          title: 'Paso 2',
          body:
            'Lee posición y antenas: UTG no es BTN. Pregunta quién puede castigarte detrás y si tu mano tiene plan si te 3-betean. Early: open o fold; no limpees ni forces basura.'
        },
        {
          title: 'Paso 3',
          body:
            'Ejecuta sin inventar drama de final table. Si la mano es clara (99 BTN open, 72o fold), hazlo. Si es marginal early desde early position, fold suele ser disciplina, no cobardía.'
        }
      ],
      examples: [
        {
          title: 'Antes de la sesión',
          body:
            'Repasa en voz alta: fase → stack bb → posición → ¿open claro o fold? El examen mezcla spots early; no busques "jugadas de burbuja" aquí.'
        },
        {
          title: 'Señal de alarma',
          body:
            'Si te pillas pensando "voy all-in porque me aburro" a 45 bb, párate. Eso es spew early, no estrategia de torneo.'
        },
        {
          title: 'Checklist de 5 segundos',
          body:
            '¿Estoy early? ¿Hay mucha gente detrás? ¿La mano juega bien si me pagan? Si dos respuestas son no, fold y siguiente mano.'
        }
      ],
      aiQuestions: [
        'Repásame el checklist de early antes del examen',
        '¿Qué errores típicos de M0 debo evitar?'
      ]
    },

    'T-04': {
      concept:
        'Antes de entrar en zona corta, en mid (a menudo ~25–35 bb) robás ciegas con steals (opens desde late) desde CO, BTN y SB. El ante engorda el premio del robo; no llegues a 12 bb sin haber intentado acumular fichas baratas.',
      theory: [
        {
          title: 'Steal mid-late',
          body:
            'Steal: open-raise esperando que folden ciegas y antes. Aún no estás obligado a shove: abres a sizing estándar y eliges manos con plan si te 3-betean (fold, call o 4-bet según stack y rival).'
        },
        {
          title: 'Manos con plan',
          body:
            'Buenas candidatas: broadways, Ax suited, suited connectors y pares. Basura total (72o) no se convierte en steal solo por estar en BTN. Si te 3-betean, sabes si te tiras o continúas — no abras "y ya veremos".'
        },
        {
          title: 'Trampa de pasividad',
          body:
            'Pasar de largo todas las órbitas hasta 12 bb te deja short sin fichas robadas. Mid es la ventana para engordar el stack con fold equity antes del push/fold.'
        }
      ],
      examples: [
        {
          title: 'K9o BTN mid',
          body:
            'BTN ~25 bb, K9o: steal razonable. Si las ciegas foldean mucho, ganas dead money; si te 3-betean fuerte, foldeas sin drama.'
        },
        {
          title: 'A5s CO',
          body:
            'A5s CO mid: open/steal OK. Tiene blockers de as y jugabilidad; no es basura, pero tampoco es shove obligatorio a estas bb.'
        },
        {
          title: 'J8o CO fold',
          body:
            'J8o CO: fold típico. Domina poco, te castigan detrás y postflop duele. Steal no significa "cualquier dos cartas en late".'
        }
      ],
      aiQuestions: [
        '¿Desde qué posiciones stealeo en mid y con qué manos?',
        '¿Qué hago si me 3-betean tras un steal a 25 bb?',
        '¿Por qué no debo esperar pasivo hasta 12 bb?'
      ]
    },

    'T-05': {
      concept:
        'A mid stacks, el 3-bet polar (mezcla de manos fuertes por valor y faroles elegidos) aplica presión frente a opens late. No es solo QQ+: también usas blockers y fold equity, sin spew (3-betear basura sin plan).',
      theory: [
        {
          title: 'Qué significa polar',
          body:
            'Polar: tu rango de 3-bet se concentra en value (manos que quieren acción o stack-off) y en faroles con blockers (cartas que quitan al rival combinaciones fuertes), no en manos medias "ni fu ni fa". El stack decide si cabe un 3-bet non-all-in o si el spot pide shove.'
        },
        {
          title: 'Vs late vs early',
          body:
            'Vs open late (CO/BTN) puedes 3-betear más light: su rango es wide y fold equity sube. Vs open early (UTG/HJ) priorizas value: ellos abren tight y pagan o 4-betean más a menudo.'
        },
        {
          title: 'Trampa spew',
          body:
            '3-betear Q9o "porque sí" mid sin fold equity ni blockers útiles es spew. Si no tienes historia clara postflop o plan vs 4-bet, fold o hacer call selectivo — no inventes polaridad falsa.'
        }
      ],
      examples: [
        {
          title: 'AKo value',
          body:
            'BTN stealea, tú BB con AKo: 3-bet por valor. Quieres aislar o ir hacia stack-off favorable; no es un farol.'
        },
        {
          title: 'A4s polar/farol',
          body:
            'Misma situación con A4s: 3-bet polar frecuente. Blocker de as + equity si te pagan; si te 4-betean, a menudo te tiras según stack y rival.'
        },
        {
          title: 'Q9o no spew',
          body:
            'Q9o vs steal: fold o a veces defensa pasiva — no 3-bet spew. Es mano media, dominada, sin blockers limpios de premium.'
        }
      ],
      aiQuestions: [
        '¿Qué es un 3-bet polar en mid stacks?',
        '¿Cuándo 3-beteo light vs open late?',
        'Dame un ejemplo de 3-bet spew que debo evitar'
      ]
    },

    'T-06': {
      concept:
        'Resteal: 3-betear (a veces shove) al steal del late para ganar el bote muerto o aislar. Defense: desde ciegas no overfoldeas todo vs robos, pero tampoco overdefiendes basura — eliges fold, hacer call o 3-bet según stack y rival.',
      theory: [
        {
          title: 'Resteal con intención',
          body:
            'Cuando BTN o CO stealea wide, SB/BB pueden restealear: value claro (AK, pares fuertes) y faroles elegidos con blockers. A mid stacks aún cabe 3-bet non-all-in; si el stack se acorta, el resteal se acerca a shove.'
        },
        {
          title: 'Defense equilibrada',
          body:
            'Defense no es "pagar todo". Haces call con manos que juegan bien postflop o tienen odds; 3-beteas polar; foldeas dominadas. Vs UTG open tight, resteal loco es leak — no es un steal wide.'
        },
        {
          title: 'Trampas de extremos',
          body:
            'Never-defend (tirar casi todo) regala ciegas+ante gratis. Resteal maníaco vs opens early te elimina mid sin necesidad. Busca el medio: castiga steals, respeta ranges tight.'
        }
      ],
      examples: [
        {
          title: 'Resteal vs BTN',
          body:
            'BTN open steal a 25 bb, tú BB con A4s o TT: 3-bet (resteal) tiene sentido. Castigas el rango wide y tomas la iniciativa.'
        },
        {
          title: 'Fold correcto',
          body:
            'CO open, tú BB con 72o: fold. No hay defense heroica con basura; overdefend mid también es spew.'
        },
        {
          title: 'No resteal vs UTG',
          body:
            'UTG open tight, tú SB con K9o: fold frecuente. Aquí no hay el mismo fold equity que vs un steal de BTN.'
        }
      ],
      aiQuestions: [
        '¿Qué es un resteal y cuándo lo uso?',
        '¿Cómo defiendo ciegas sin overdefender?',
        '¿Por qué no restealeo igual vs UTG que vs BTN?'
      ]
    },

    'T-07': {
      concept:
        'Examen Mid: repasas steal, 3-bet polar y resteal/defense. Sin vocabulario nuevo — checklist de cómo leer el spot mid antes de actuar.',
      theory: [
        {
          title: 'Paso 1',
          body:
            '¿Eres el que abre (steal) o el que responde (defense/resteal)? Mira posición: CO/BTN/SB no son lo mismo, y BB vs steal no es BB vs UTG.'
        },
        {
          title: 'Paso 2',
          body:
            'Stack en bb mid: ¿cabe open estándar o el spot pide 3-bet/shove? Elige manos con plan si te resuben. Basura: fold. Value y polar limpio: presión.'
        },
        {
          title: 'Paso 3',
          body:
            'Evita los extremos del examen: passivity total (nunca robar) y spew (3-betear medias sin blockers). Roba late, castiga steals, foldea lo dominado.'
        }
      ],
      examples: [
        {
          title: 'Antes de clicar',
          body:
            'Di en una frase el job: "Steal BTN", "3-bet polar BB vs BTN" o "fold basura". Si no puedes nombrarlo, no inventes acción.'
        },
        {
          title: 'Señal polar vs spew',
          body:
            'A4s vs steal puede ser 3-bet polar. Q9o vs steal casi nunca. El examen premia esa distinción, no la agresión ciega.'
        },
        {
          title: 'Checklist rápido',
          body:
            'Posición → stack bb → ¿steal o defense? → ¿value, farol limpio o fold? Ejecuta y pasa a la siguiente.'
        }
      ],
      aiQuestions: [
        'Repásame steal vs resteal en mid',
        '¿Qué errores de mid debo vigilar en el examen?'
      ]
    },

    'T-08': {
      concept:
        'Entre ~20 y 12 bb ya no eres deep: eliges open-raise o shove (ir all-in) según mano, posición y quién queda detrás. Min-raisear manos que deberían ir shove te mete en spots peores.',
      theory: [
        {
          title: 'Zona de umbrales',
          body:
            'En short (aprox. 20–12 bb) aparecen thresholds: algunas manos open a sizing reducido, otras shove directo, el resto fold. Depende de bb exactas, posición y stacks detrás — no de "me gusta el flop imaginario".'
        },
        {
          title: 'Por qué no open/fold roto',
          body:
            'Abrir flojo y foldear siempre al shove rival es un leak: regalas fold equity y te dejan sin stack. Si la mano no aguanta presión, a menudo era fold pre; si es fuerte, considera shove limpio.'
        },
        {
          title: 'Trampa del miedo',
          body:
            'Min-raisear AK/99 "por miedo a ir all-in" a 14 bb suele ser peor: te comprometes sin maximizar fold equity. En esta zona, commit consciente > open tímido.'
        }
      ],
      examples: [
        {
          title: 'Shove candidato',
          body:
            'A5o BTN a ~12 bb: shove candidato frecuente. Open pequeño te deja mal vs 3-bet; shove toma el dead money o vas a equity.'
        },
        {
          title: 'Open aún viable',
          body:
            'Algunas manos medias a ~18–20 bb desde BTN aún abren sin shove. La clave es saber qué harás si te resuben — no open automático sin plan.'
        },
        {
          title: 'Fold basura',
          body:
            '72o a 15 bb: fold. Zona corta no justifica panic open; sin equity ni fold equity real, solo spew.'
        }
      ],
      aiQuestions: [
        '¿Cuándo open y cuándo shove entre 20 y 12 bb?',
        '¿Por qué es malo open flojo y fold al shove?',
        '¿Qué miró además de mi mano en esta zona?'
      ]
    },

    'T-09': {
      concept:
        'A ~12–8 bb el plan base es push/fold: shove (all-in) o fold según chart y posición. Como en Spins cortos, el open min suele ser un error; quieres fold equity inmediata o ir a equity vs call.',
      theory: [
        {
          title: 'Push/fold simplifica',
          body:
            'Push/fold: o vas all-in o te tiras. Usa charts (menú Rangos / push-fold) como referencia, no como religión ciega: ajusta a rivals que overfolden o overcallen, pero no reinventes opens de cash a 10 bb.'
        },
        {
          title: 'Posición ensancha el rango',
          body:
            'BTN shoves más wide que CO; SB vs BB tiene dinámica propia. Early positions quedan más tight: hay más gente detrás que puede despertar con value.'
        },
        {
          title: 'Trampa open small',
          body:
            'Open a 2 bb con 10 bb de stack te deja en tierra de nadie: poco fold equity y commitment accidental. Si el chart dice shove, shove; si dice fold, fold.'
        }
      ],
      examples: [
        {
          title: 'A5o BTN shove',
          body:
            'A5o BTN ~10–12 bb: shove candidato. As + fold equity; open min aquí suele ser peor que push/fold limpio.'
        },
        {
          title: 'KTs SB',
          body:
            'KTs SB corto: shove frecuente. Estás obligado a actuar; el dead money de ciegas/antes justifica presión.'
        },
        {
          title: '99 value shove',
          body:
            '99 a 10–12 bb: shove por valor claro. Quieres que paguen peor o que folden; no min-raise "para ver flop barato".'
        }
      ],
      aiQuestions: [
        '¿Cómo uso un chart de push/fold sin robotizarme?',
        '¿Por qué BTN shoves más wide que UTG a 10 bb?',
        '¿Qué error es abrir pequeño a 10 bb?'
      ]
    },

    'T-10': {
      concept:
        'Antes del ICM fino, aprendes a hacer call vs shove mirando chip EV: ¿tienes equity suficiente contra el rango de all-in para que el call gane fichas a largo plazo? Es la base; luego apretamos con dinero real.',
      theory: [
        {
          title: 'Chip EV primero',
          body:
            'Chip EV (valor esperado en fichas): comparas la equity de tu mano vs el rango de shove con el precio que pagas. Si el call es +EV en fichas, en un mundo sin premios sería automático; en MTT es el suelo sobre el que luego aplicas ICM.'
        },
        {
          title: 'Manos y precios',
          body:
            'Manos fuertes (TT+, AQ+) suelen pagar shoves cortos. Manos medias dependen de posición, sizing (aquí all-in) y de lo wide que sea el shove. No "ves flop": vs shove ya estás en showdown equity.'
        },
        {
          title: 'Trampas de extremos',
          body:
            'Call light "para ver" con basura es spew. Fold panic con AQ vs shove corto también: a veces el chip EV es claramente positivo y el miedo te roba fichas.'
        }
      ],
      examples: [
        {
          title: 'Call claro chip EV',
          body:
            'Short shove 10 bb desde BTN, tú BB con AQo: hacer call suele ser +chip EV vs un rango wide. No necesitas ICM aún para ver que es fuerte.'
        },
        {
          title: 'Fold chip EV',
          body:
            'Mismo shove, tú con J9o: fold. Equity insuficiente vs el rango; "quiero ver" no es argumento.'
        },
        {
          title: 'Zona gris',
          body:
            'AJo vs shove CO a 12 bb puede ser call o fold según lo wide del rival. Entrena el hábito: estima rango → equity → precio, antes de inventar narrativa.'
        }
      ],
      aiQuestions: [
        '¿Qué es chip EV al hacer call vs un shove?',
        '¿Por qué no debo hacer call light "para ver"?',
        '¿Cuándo AQ es call claro vs shove corto?'
      ]
    },

    'T-11': {
      concept:
        'Con ICM (el valor en dinero real de tus fichas según el payout), hacer call vs shove es más tight que en chip EV puro: el $EV castiga arriesgar tu stack cerca de premios. Overfold (foldear de más vs chip EV) es a menudo correcto.',
      theory: [
        {
          title: 'De fichas a dinero',
          body:
            '$EV (valor esperado en dinero de torneo) no es lo mismo que chip EV. Doblar fichas no duplica tu prize esperado; quedarte fuera cerca de la burbuja o de un pay jump duele más que "perder un pot" en cash.'
        },
        {
          title: 'Calls más tight',
          body:
            'Manos que eran call claros en fichas pueden ser fold en $EV si hay muchos shorts que pueden eliminarse o si tú eres mid vs cover. Pregunta: ¿este call mejora mi dinero esperado o solo mi ego de equity?'
        },
        {
          title: 'Honestidad',
          body:
            'Usamos principios ICM, no un cálculo exacto de field completo. Si internalizas "cerca de premios, paga menos light", ya evitas el leak más caro del módulo.'
        }
      ],
      examples: [
        {
          title: 'Overfold correcto',
          body:
            'Burbuja, tú mid 18 bb, big shove 22 bb con cobertura: AJo que era call chip EV puede ser fold $EV. Dejas que otros se eliminen.'
        },
        {
          title: 'Aún pagas value',
          body:
            'ICM no significa fold forever. QQ vs shove corto sigue siendo call en casi todos los spots razonables: el value es demasiado fuerte.'
        },
        {
          title: 'Contraste mental',
          body:
            'Entrena la frase: "+EV chips, −EV dinero → fold". Si no puedes decir por qué el ICM aprieta, no uses ICM como excusa para foldear premiums.'
        }
      ],
      aiQuestions: [
        '¿Por qué el ICM hace los calls más tight?',
        '¿Cuándo overfoldear vs shove es correcto?',
        '¿Chip EV y $EV pueden discrepar en el mismo spot?'
      ]
    },

    'T-12': {
      concept:
        'Examen Short: repasas zona 20–12, push/fold y calls vs shove (chip EV e ICM básico). Sin teoría nueva — checklist de cómo revisar cada decisión short.',
      theory: [
        {
          title: 'Paso 1',
          body:
            'Cuenta bb: ¿20–12 (open/shove thresholds) o 12–8 (push/fold)? La herramienta cambia. No juegues 10 bb como si tuvieras 40.'
        },
        {
          title: 'Paso 2',
          body:
            'Si abres: ¿open, shove o fold? Si te shovena: ¿call por chip EV o ya aprieta el ICM? Nombra el criterio antes de clicar.'
        },
        {
          title: 'Paso 3',
          body:
            'Evita open small basura, panic shove 72o y call light "porque equity". En short, la disciplina de umbrales vale más que la creatividad.'
        }
      ],
      examples: [
        {
          title: 'Pregunta ancla',
          body:
            'Antes de cada mano del examen: "¿Qué zona de bb estoy?" Si no lo sabes, no elijas sizing de cash.'
        },
        {
          title: 'Vs shove',
          body:
            'Primero chip EV mental; luego, si hay olor a burbuja o pay jump, aprieta el call. El examen premia ese orden, no adivinar.'
        },
        {
          title: 'Señal de leak',
          body:
            'Si min-raiseas a 9 bb "para ver", corrige en caliente: push/fold o fold — no tierra de nadie.'
        }
      ],
      aiQuestions: [
        'Repásame open/shove vs push/fold',
        '¿Cómo decido call vs shove en el examen short?'
      ]
    },

    'T-13': {
      concept:
        'En burbuja (bubble) cada rol tiene un plan distinto: el big stack presiona, el mid sobrevive y el short busca spots de ladder (subir peldaños de payout). Identificar tu rol vale más que enamorar una mano concreta.',
      theory: [
        {
          title: 'Tres roles, tres jobs',
          body:
            'Big: aplica presión y fuerza folds ICM. Mid: evita coin flips grandes vs covers; deja que los shorts se eliminen. Short: necesita doble o robos selectivos, no min-raise suicida.'
        },
        {
          title: 'ICM en burbuja',
          body:
            'El ICM (valor en dinero real según payout) está en máximo dramático: un call malo te saca sin cobrar mientras otros entran ITM (in the money). Por eso los mids overfoldean vs bigs más que en chip EV.'
        },
        {
          title: 'Trampa de rol confuso',
          body:
            'Mid que hero-callea al big "porque tengo equity" es el leak clásico de burbuja. Juega tu job, no el del short desesperado ni el del cover rico en fichas.'
        }
      ],
      examples: [
        {
          title: 'Big presiona',
          body:
            'Cover 50 bb abre wide vs mids a 20 bb: ellos no pueden defender todo. La presión es open/shove selectivo, no call light a shorts.'
        },
        {
          title: 'Mid sobrevive',
          body:
            'Mid 18 bb foldea A9o vs shove del big en burbuja. Doloroso en fichas, a menudo correcto en $EV.'
        },
        {
          title: 'Short pick spot',
          body:
            'Short 9 bb espera BTN/SB o un fold equity claro; no shoves UTG basura solo por pánico.'
        }
      ],
      aiQuestions: [
        '¿Cómo sé si soy short, mid o big en burbuja?',
        '¿Qué debe hacer cada rol?',
        '¿Por qué el mid overfoldea vs el big?'
      ]
    },

    'T-14': {
      concept:
        'Como big stack en burbuja, abres y shoves más para aplicar presión ICM: haces que los mids se tiren. Presión no significa hacer call light a los shorts — no regalas dobles fáciles sin fold equity.',
      theory: [
        {
          title: 'Presión ≠ pagar todo',
          body:
            'Tu arma es el fold equity: opens wide, 3-bets y shoves que ponen a los mids en dilemas $EV. Si el short ya está all-in, tú decides con rango; "porque puedo" no es razón para pagar basura.'
        },
        {
          title: 'Aislar y castigar',
          body:
            'Busca spots donde el mid no puede defenderse: late position, stacks que temen eliminarse. Castiga overfolds; no te suicides en flips innecesarios vs otro cover.'
        },
        {
          title: 'Trampa del cover generoso',
          body:
            'Pagar shove light del short "para eliminarlo" puede ser −$EV si tu call es flojo: le das vida barata o te expones sin necesidad. Eliminar con buena mano, no con ego.'
        }
      ],
      examples: [
        {
          title: 'Steal de cover',
          body:
            'Tú 55 bb BTN, mids 20 bb en ciegas: steal wide. Ellos foldean de más; tú recoges antes y ciegas sin showdown.'
        },
        {
          title: 'Fold con cover',
          body:
            'Short shove 11 bb, tú BB con KTo: a menudo fold. No necesitas ese flip; tu presión futura vale más.'
        },
        {
          title: 'Value cuando toca',
          body:
            'Mismo shove, tú con JJ: call/shove claro. Big stack tampoco foldea la joyería — solo deja de spew calls medios.'
        }
      ],
      aiQuestions: [
        '¿Cómo presiono siendo big stack sin spew?',
        '¿Por qué no pago light al short solo por eliminarlo?',
        '¿Qué spots de mid son más explotables?'
      ]
    },

    'T-15': {
      concept:
        'Mid stack en burbuja: prioridad no chocarte con el big stack. Sobrevives dejando que los shorts se eliminen; evitas spots −$EV aunque sean +chip EV. Pick spots claros, no open spew vs covers.',
      theory: [
        {
          title: 'Fold equity baja vs big',
          body:
            'Vs un cover, tus robos se respetan menos y tus calls duelen más: él puede eliminarte y tú no le haces el mismo daño ICM. Por eso mid survival = menos guerras vs el chip leader.'
        },
        {
          title: 'Deja que el short se juegue',
          body:
            'Si hay shorts por debajo, cada órbita que sobreviven sin chocarte mejora tu ladder esperado. No hace falta ser el héroe que elimina a todos a la fuerza.'
        },
        {
          title: 'Trampa open spew',
          body:
            'Open flojo mid vs big a tu izquierda es invitar al resteal ICM. Preferible folds o manos con plan claro; la paciencia aquí es skill, no pasividad ciega vs todos.'
        }
      ],
      examples: [
        {
          title: 'Fold $EV',
          body:
            'Big shove 25 bb, tú mid 20 bb con AJo: fold frecuente en burbuja. Chip EV puede gustar; $EV a menudo no.'
        },
        {
          title: 'Spot vs short',
          body:
            'Short 8 bb shove a tu BB, tú mid con AQo: más dispuesto a pagar — el ICM vs short duele menos que vs cover.'
        },
        {
          title: 'No spew open',
          body:
            'CO mid, big en BTN: K9o a menudo fold. Abrir para que el cover te meta presión es regalarte un dilema.'
        }
      ],
      aiQuestions: [
        '¿Por qué el mid sobrevive en burbuja?',
        '¿Cuándo sí hago call siendo mid?',
        '¿Qué opens evito vs el big stack?'
      ]
    },

    'T-16': {
      concept:
        'Short stack en burbuja: necesitas ladder (subir un peldaño de payout) con shoves selectivos y timing. No min-raise suicida ni panic shove UTG con basura — elige spots con fold equity o equity decente.',
      theory: [
        {
          title: 'Doble con criterio',
          body:
            'Sí, necesitas fichas; no, no cualquier mano en cualquier asiento. Prioriza late position, folds delante y rivales mid que overfoldean por ICM. UTG basura es el antitexto.'
        },
        {
          title: 'Ladder mental',
          body:
            'Cada eliminación ajena te acerca a cobrar o a un salto. A veces fold + esperar un mejor spot sube más tu $EV que un flip feo ahora. Equilibra urgencia de ciegas con calidad del spot.'
        },
        {
          title: 'Trampa panic',
          body:
            'Shove panic porque "me comen las ciegas" con 72o UTG suele ser −EV en ambos mundos. Si estás muerto de fichas, al menos elige manos con blockers o equity real.'
        }
      ],
      examples: [
        {
          title: 'Shove late',
          body:
            '9 bb BTN, folds delante, A5o: shove selectivo típico. Fold equity vs mids + equity si te pagan.'
        },
        {
          title: 'Fold UTG',
          body:
            '9 bb UTG, J8o: fold. Aunque estés short, este spot no laddera — solo spew.'
        },
        {
          title: 'Timing vs cover',
          body:
            'Big en BB que paga light: aprieta tu rango de shove. Mid en BB que overfoldea: puedes ir más wide. Lee el rol, no solo el chart estático.'
        }
      ],
      aiQuestions: [
        '¿Cómo elijo spots de shove siendo short en burbuja?',
        '¿Qué es el ladder en payout?',
        '¿Por qué no panic shove desde UTG?'
      ]
    },

    'T-17': {
      concept:
        'Tras el ITM (ya cobras algo), los pay jumps (saltos de premio entre puestos) siguen importando: no "ya estoy pagado, all-in light". El ICM continúa; cada eliminación puede subir tu prize.',
      theory: [
        {
          title: 'ITM no apaga el ICM',
          body:
            'Cobrar el mínimo no iguala tu $EV al chip EV. Entre el min-cash y la mesa final hay escalones: arriesgar stack light regala jumps a otros. Sigue pensando roles y covers.'
        },
        {
          title: 'Ajusta la agresión',
          body:
            'Puedes abrir más que en burbuja extrema, pero no spew post-bubble. Los jumps grandes (cerca de FT o de pagos altos) aprietan otra vez los calls y los flips innecesarios.'
        },
        {
          title: 'Trampa "ya cobré"',
          body:
            'Mentalidad de spew tras el min-cash es leak caro: conviertes un buen resultado en mediocre. Celebra el ITM fuera de la mesa; dentro, sigue el plan de saltos.'
        }
      ],
      examples: [
        {
          title: 'Jump cerca',
          body:
            'Quedan 12, pagan fuerte de 9 en adelante: mid vs big shove con AJo puede ser fold otra vez. El jump importa más que el min-cash ya asegurado.'
        },
        {
          title: 'Presión razonable',
          body:
            'Cover post-ITM puede robar a mids que aún temen saltos. Misma lógica de burbuja, algo menos extrema.'
        },
        {
          title: 'No flip gratis',
          body:
            'Dos mids con stacks similares cerca de un salto grande: evita coin flip marginal. Espera un mejor edge o un short que se elimine.'
        }
      ],
      aiQuestions: [
        '¿Por qué el ICM sigue tras el ITM?',
        '¿Qué es un pay jump y cómo cambia mis calls?',
        '¿Qué leak evita la mentalidad "ya estoy pagado"?'
      ]
    },

    'T-18': {
      concept:
        'Examen Bubble: repasas roles short/mid/big, presión, supervivencia y ladder. Sin teoría nueva — checklist de cómo revisar cada spot de burbuja.',
      theory: [
        {
          title: 'Paso 1',
          body:
            '¿Soy short, mid o big? Clasifica stacks en bb relativos a la mesa. Si no sabes tu rol, no elijas línea: el job cambia la respuesta correcta.'
        },
        {
          title: 'Paso 2',
          body:
            '¿Presiono o sobrevivo? Big → presión con fold equity. Mid → evita covers, pick spots. Short → shove selectivo, no panic. Nombra el job en una frase.'
        },
        {
          title: 'Paso 3',
          body:
            'Separar chip EV de $EV: si el spot es +fichas y −dinero, fold suele ganar el examen. No hero-call de mid vs big "por equity".'
        }
      ],
      examples: [
        {
          title: 'Ancla de rol',
          body:
            'Antes de cada mano: "Soy mid, big a la izquierda, short debajo". Esa frase evita el 50 % de leaks de burbuja.'
        },
        {
          title: 'Señal de spew',
          body:
            'Si siendo mid pagas shove del cover con mano media, párate. El examen castiga ese heroísmo.'
        },
        {
          title: 'Checklist rápido',
          body:
            'Rol → presión/supervivencia/ladder → ¿ICM aprieta? → actúa. Sin vocabulario nuevo, solo aplicación.'
        }
      ],
      aiQuestions: [
        'Repásame los tres roles de burbuja',
        '¿Qué errores ICM debo evitar en el examen?'
      ]
    },

    'T-19': {
      concept:
        'En final table (FT) el ICM se intensifica: pay jumps grandes, covers que aplastan y shorts extremos. Los principios de burbuja escalan — no prometemos un solver completo de FT, sí un mapa mental usable.',
      theory: [
        {
          title: 'FT = ICM a máximo volumen',
          body:
            'Los saltos entre puestos de FT suelen ser enormes. Covers presionan; mids cuidan stacks; shorts pick spots. Un flip mal elegido destroza horas de torneo en un click.'
        },
        {
          title: 'Covers y malas estructuras',
          body:
            'Si un chip leader tiene covers sobre varios, puede abrir muy wide. Si tú eres mid con otro mid similar, a menudo preferís que el short se elimine antes de chocaros.'
        },
        {
          title: 'Límite honesto',
          body:
            'No calculamos ICM de 9-handed exacto en cada mano. Si aplicas roles + jumps + "no spew vs cover", ya juegas FT por encima del recreativo medio.'
        }
      ],
      examples: [
        {
          title: 'Cover FT',
          body:
            'Chip leader 80 bb vs mesa de 15–25 bb: steal y presión constantes. Los mids no pueden despertar con medias.'
        },
        {
          title: 'Dos mids',
          body:
            'Dos stacks 22 bb, short 6 bb: ambos evitan all-in mutuo hasta que el short se juegue. Ladder compartido.'
        },
        {
          title: 'Short FT',
          body:
            'Short 7 bb espera fold equity en late; no open min. Misma lección de ladder, con jumps más caros.'
        }
      ],
      aiQuestions: [
        '¿Qué cambia el ICM en final table vs burbuja?',
        '¿Cómo deben actuar cover, mid y short en FT?',
        '¿Por qué dos mids evitan chocarse con un short vivo?'
      ]
    },

    'T-20': {
      concept:
        'Entrenas a separar "gano fichas" (chip EV) de "gano dinero de torneo" ($EV). Si el spot es +EV en chips y −EV en dinero — típico en burbuja/FT — fold es a menudo correcto; no idolatres solo la equity.',
      theory: [
        {
          title: 'Dos respuestas posibles',
          body:
            'Ante un shove, puedes tener call chip EV y fold $EV. El drill es verbalizar ambas: "En fichas pago; en dinero me tiro porque…" Sin esa frase, confundes valentía con spew.'
        },
        {
          title: 'Cuándo coinciden',
          body:
            'Premiums fuertes y spots vs shorts desesperados suelen alinear chip EV y $EV: pagas. La discrepancia aparece en medias vs covers cerca de jumps.'
        },
        {
          title: 'Trampa equity-only',
          body:
            '"Tengo 35 % y el precio es 30 %" no cierra el caso en MTT. El prize risk puede hacer que ese 5 % de edge en fichas sea −$EV. Equity es input, no veredicto.'
        }
      ],
      examples: [
        {
          title: 'Discrepancia clásica',
          body:
            'Burbuja, mid vs big shove, AJo: call chip EV / fold $EV. El drill correcto nombra las dos lecturas y elige dinero.'
        },
        {
          title: 'Alineación',
          body:
            'QQ vs shove short 10 bb en FT: call en ambos marcos. No uses ICM para foldear la joyería.'
        },
        {
          title: 'Frase de entrenamiento',
          body:
            'Di en voz alta: "+chips −$ → fold; +ambos → call; −ambos → fold". Si no encaja, reestima rango y rol.'
        }
      ],
      aiQuestions: [
        '¿Cómo separo chip EV de $EV en un call vs shove?',
        '¿Cuándo coinciden y cuándo discrepan?',
        'Dame un ejemplo +chip EV y −$EV'
      ]
    },

    'T-21': {
      concept:
        'En burbuja/FT asignas rangos de shove y de call según rol y stack, no solo según "tu mano te gusta". Range reading: qué shoves este short, qué paga este mid, qué foldea este big — luego encajas tu combo.',
      theory: [
        {
          title: 'Preguntas de rango',
          body:
            'Antes de actuar: ¿qué % shoves este short desde BTN? ¿Este mid overfoldea vs cover? ¿El big paga light por ego? Esas respuestas definen si tu mano es value, bluff-catcher malo o fold automático.'
        },
        {
          title: 'No leas como cash deep',
          body:
            'Hand-reading de cash a 100 bb (líneas multi-street, sizes raros) no es el job aquí. En burbuja priorizas stack, rol e ICM: rangos de push/call polarizados, no pot control fancy.'
        },
        {
          title: 'Trampa combo-centrismo',
          body:
            'Enamorarte de KJo sin preguntar el rango rival es leak. La misma KJo es call vs short wide y fold vs cover tight en burbuja. El combo es el último paso, no el primero.'
        }
      ],
      examples: [
        {
          title: 'Short wide',
          body:
            'Short 8 bb BTN shove: rango amplio (Ax, broadways, suited). Tu A9o en BB mid gana más peso de call que vs un shove UTG desesperado pero más tight.'
        },
        {
          title: 'Mid overfold',
          body:
            'Estimás que el mid foldea todo menos QQ+ vs tu shove de cover: puedes ir más wide. Si paga ATo+, aprietas value.'
        },
        {
          title: 'Big ego-call',
          body:
            'Cover que odia foldear: no bluff-shoves light contra él; value más limpio. Lee tendencias de rol + player type.'
        }
      ],
      aiQuestions: [
        '¿Qué preguntas hago para leer rangos en burbuja?',
        '¿Por qué no sirvo el hand-reading de cash deep aquí?',
        '¿Cómo cambia KJo vs short wide o vs cover?'
      ]
    },

    'T-22': {
      concept:
        'Examen Pro MTT: certificación de fases, short/push, burbuja e ICM de FT. Sin teoría nueva — checklist de cómo revisar spots de torneo de punta a punta.',
      theory: [
        {
          title: 'Paso 1',
          body:
            'Fase y bb: early/mid/short/push/bubble/FT. Si fallas la fase, fallas el sizing y el rol. Ancla stack en bb antes de la mano.'
        },
        {
          title: 'Paso 2',
          body:
            'Rol y job: ¿robo, presión de cover, supervivencia mid, ladder short? Resume bubble roles en una frase y aplícalos también en FT con jumps mayores.'
        },
        {
          title: 'Paso 3',
          body:
            'Chip EV vs $EV en una frase: si discrepan cerca de premios, prioriza dinero. No spew calls medios vs covers; no foldees premiums claros vs shorts.'
        }
      ],
      examples: [
        {
          title: 'Certificación mental',
          body:
            'Antes del pack: "Fase → rol → ¿chips o dinero?". Esa tríada es la rúbrica del examen Pro.'
        },
        {
          title: 'Resume roles',
          body:
            'Big presiona, mid sobrevive, short ladder. Si tu línea contradice el rol sin motivo, corrige.'
        },
        {
          title: 'Frase $EV',
          body:
            'Practica: "Call chip EV, fold $EV → me tiro". Si no puedes decirlo, no uses ICM como muletilla.'
        }
      ],
      aiQuestions: [
        'Repásame el checklist Pro: fase, rol y $EV',
        '¿Cómo resumo bubble roles en una frase?',
        '¿Qué errores matan una certificación MTT?'
      ]
    }
  },

  teachBacks: {
    't01-01':
      'ATo en BTN early (~40 bb): open cash-like claro. Estás en late con una broadway fuerte; quieres robar o jugar un pot manejable, no limpear ni ir all-in sin necesidad.',
    't01-02':
      'Q8o UTG early: fold. Hay mucha gente detrás y la mano se domina fácil; early pide paciencia, no forzar basura desde early position.',
    't01-03':
      'KJs CO early: open estándar. Buena broadway suited en late-ish; construyes stack con iniciativa sin spew.',
    't01-04':
      '72o: fold siempre aquí. Sin equity real ni jugabilidad; abrirlo early es spew puro.',
    't01-05':
      '99 BTN early: open claro. Par medio fuerte en posición — quieres robar ciegas o ver flop barato con iniciativa, no limpear.',
    't01-06':
      'A5o HJ early: a menudo fold. El as offsuit bajo se domina mucho y no tiene la jugabilidad de A5s; no spewees buscando acción.',
    't04-01':
      'K9o BTN mid (~25 bb): steal razonable. Robas ciegas+ante con fold equity; si te 3-betean fuerte, te tiras sin drama.',
    't04-02':
      '72o BTN: fold. Steal no es "cualquier dos cartas"; sin equity ni plan vs 3-bet, solo regalas fichas.',
    't04-03':
      'A5s CO mid: steal/open OK. Blocker de as y jugabilidad postflop; buen candidato a robar antes de zona corta.',
    't04-04':
      'QTs SB mid: open/steal frecuente. Desde SB quieres dead money; la mano juega mejor que basura offsuit si te igualan.',
    't04-05':
      'J8o CO: fold típico. Domina poco, te pueden castigar detrás y postflop duele — no es steal automático.',
    't04-06':
      '87s BTN mid: steal con jugabilidad. Suited connector roba bien y tiene plan si te hacen call; sigue sin ser shove obligatorio a 25 bb.',
    't05-01':
      'AKo vs steal: 3-bet por valor. Mano premium — quieres aislar o ir a stack-off favorable, no hacer call pasivo sin iniciativa.',
    't05-02':
      'A4s vs steal: 3-bet polar/farol frecuente. Blocker de as + equity si te pagan; si te 4-betean, a menudo fold según stack.',
    't05-03':
      '72o vs open: fold. No overdefiendas ni 3-betees basura; sin blockers útiles ni valor, te tiras.',
    't05-04':
      'Q9o vs steal: no 3-bet spew — fold (o defensa muy selectiva). Es mano media dominada, no farol polar limpio.',
    't09-01':
      'A5o BTN a ~10–12 bb: shove candidato. En push/fold quieres fold equity o ir a equity; open min suele ser peor.',
    't09-02':
      '72o a stack corto: fold. No panic shove — sin equity ni fold equity real solo te eliminas.',
    't09-03':
      'KTs SB corto: shove frecuente. Ciegas/antes en juego + posición obligada: push/fold limpio, no open pequeño.',
    't09-04':
      '99 a ~10–12 bb: shove por valor claro. Par medio fuerte en zona push/fold — quieres que folden o que paguen peor.'
  }
};
