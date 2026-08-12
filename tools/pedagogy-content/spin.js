/**
 * Pedagogy patch map — Spins S-03…S-17 (+ teachBacks iso/push).
 * Spanish (Spain), teacher voice. Theory bullets: { title, body }.
 * Do not include S-00…S-02 (already good on main).
 */
'use strict';

module.exports = {
  lessons: {
    'S-03': {
      concept:
        'Repaso M0 sin vocabulario nuevo: anatomía del Spin (fichas ≠ euros), steal desde BTN/SB a ~20 bb y defensa desde BB. Aplica el checklist con calma antes de cada clic.',
      theory: [
        {
          title: 'Identifica el spot',
          body:
            'El examen mezcla dos trabajos mentales que ya viste. O estás robando ciegas (steal: abres tú para que SB y BB se tiren) o estás defendiendo la ciega grande cuando te abren. Antes de actuar, nombra en voz baja qué spot es: no uses el mismo rango mental para ambos.'
        },
        {
          title: 'Stack en bb, no en cash',
          body:
            'Mide el stack en ciegas grandes (bb). A ~20 bb los opens y los 3-bets son más agresivos que en cash a 100 bb: hay más fold equity (probabilidad de que el rival se tire) y menos margen para jugar postflop cómodo. Si piensas «como en cash», te vas a quedar corto de plan.'
        },
        {
          title: 'Acción limpia',
          body:
            'Las respuestas típicas son fold, open (subir primero) o 3-bet — a menudo shove (all-in). Recuerda: en un Spin perder el stack suele ser perder el torneo. No inventes min-raises raros ni hero-calls «porque puedo ganar».'
        },
        {
          title: 'Checklist rápido',
          body:
            'Orden mental: posición → stack en bb → ¿busco fold equity o valor? → ejecuta sin spew (tirar fichas sin plan). Si dudas entre una jugada fancy y la jugada simple del chart, elige la simple.'
        }
      ],
      examples: [
        {
          title: 'Antes de clicar',
          body:
            'Lee posición y stack antes de la mano. «BTN 22 bb, folds a ti» pide un rango de steal; «BB 20 bb vs steal BTN» pide defensa selectiva. Misma profundidad, distinto trabajo.'
        },
        {
          title: 'Error típico del examen',
          body:
            'Min-open con 99 o AKo a 20 bb «como en cash», o hacer call light desde BB con basura dominada. En M0 Spins, premium corto suele ir shove; basura se tira.'
        },
        {
          title: 'Una frase para aprobar',
          body:
            'Si eres el primero en entrar a ~20 bb, piensa steal (shove o open ~2,5 bb). Si te abren en BB, piensa fold / hacer call / 3-bet shove — no overdefiendas.'
        }
      ]
    },

    'S-04': {
      concept:
        'Si alguien limpea (iguala la ciega grande para entrar sin subir), aíslas con un iso-raise: subes para jugar heads-up (1 vs 1) con manos fuertes. A stack corto no overiso con basura ni limpeas tú sin plan.',
      theory: [
        {
          title: 'Qué es limpear e iso',
          body:
            'Limpear es igualar la BB para ver flop barato, sin iniciativa. Iso (aislar) es subir por encima del limp para que, idealmente, solo el limper pague y tú lleves la iniciativa heads-up. Castigas el limp recreativo y evitas el pot multiway (varios jugadores) fuera de posición.'
        },
        {
          title: 'Sizing y profundidad',
          body:
            'El iso debe ser lo bastante grande para aislar, pero a 15–20 bb no metas el stack entero «sin querer». Buscas un pot manejable con una mano que domina rangos de limp wide (Ax suited, broadways, pares medios+). Si el sizing te deja committed con basura, el plan ya falló preflop.'
        },
        {
          title: 'Qué manos iso (y cuáles no)',
          body:
            'Iso con manos que quieres heads-up con ventaja: AJs, KQs, 99+, broadways fuertes. Fold con basura (72o, Q8o): no aísles «porque estás en BTN». Overiso trash te deja multiway dominado o pagando un shove sin equity real.'
        },
        {
          title: 'Trampa: limpear tú detrás',
          body:
            'Limpear detrás de un limp a stack corto suele regalar ciegas o meterte multiway OOP (fuera de posición). Si la mano no merece iso, fold. Open/iso o tirar — no «ver barato» sin plan en un Spin.'
        }
      ],
      examples: [
        {
          title: 'Iso clásico desde BTN',
          body:
            'SB limpea, tú BTN con AJs a ~20 bb: iso a ~3–4 bb. Quieres heads-up contra un rango de limp débil, con iniciativa y una mano que domina muchas de sus combinaciones.'
        },
        {
          title: 'Fold correcto vs limp',
          body:
            'BTN con 72o vs limp SB: fold. No hay valor en aislar: no dominas nada, y si te pagan o entra alguien más el pot se complica sin equity.'
        },
        {
          title: 'KQs desde SB vs limp',
          body:
            'BTN limpea corto y tú SB con KQs: iso por valor. Mano fuerte, quieres bote heads-up con iniciativa — no hacer call flat detrás del limp.'
        }
      ]
    },

    'S-05': {
      concept:
        'Con stacks cortos (~10–15 bb), el 3-bet correcto suele ser shove (all-in), no una resubida pequeña que te deja en calle sin stack útil. Flat (hacer call al open) casi no existe aquí.',
      theory: [
        {
          title: 'Umbral de stack-off',
          body:
            'Por debajo de ~15–20 bb (según el spot), un 3-bet pequeño te deja con poquísimas bb detrás y decisiones imposibles en turn/river. El 3-bet shove es más limpio: o doblas, o el rival se tira, o vas all-in con un plan cerrado preflop.'
        },
        {
          title: 'Shove value y farol',
          body:
            'Shove por valor con Ax fuerte, pares medios+ y premiums. Algunos Ax suited (con blockers: cartas que restan combinaciones fuertes al rival) entran como shove de presión. Flat — hacer call al open para ver flop barato — solo tiene sentido con manos que realmente quieren flop barato; a esta profundidad casi no las hay.'
        },
        {
          title: 'Open shove y push/fold',
          body:
            'Desde BTN/SB a ~10 bb entras en zona push/fold (lo profundizamos en S-09): no min-raisees «como en cash». Un open min a 10 bb suele ser leak: poco fold equity y mal committed si te 3-betean.'
        },
        {
          title: 'Trampas a evitar',
          body:
            '3-bet pequeño spew (fichas sin plan) o flat dominado vs open short: te quedas con 5 bb OOP y sin fold equity. Si no es shove claro ni fold claro, no inventes el medio.'
        }
      ],
      examples: [
        {
          title: '3-bet shove vs open',
          body:
            'Alguien abre a 12 bb y tú BTN con 99: shove suele ser mejor que 3-bet a 3 bb. Quieres doblar limpio o que folden; no quieres un pot extraño con stack residual inútil.'
        },
        {
          title: 'No flat dominado',
          body:
            'Steal a 14 bb, tú BB con K9o: fold o, como mucho, shove muy selectivo según el rival. Hacer call OOP con mano dominada rara vez es correcto a esta profundidad.'
        },
        {
          title: 'Premium = all-in',
          body:
            'BB vs steal SB con AKo a 15 bb: 3-bet shove. Un 3-bet pequeño deja al rival hacer call wide y a ti jugando un stack corto sin salida clara.'
        }
      ]
    },

    'S-06': {
      concept:
        'Chip lead (más fichas que los rivales): puedes presionar ciegas y opens flojos, pero no pagues shoves light solo porque «tengo más fichas». Recuerda fichas ≠ euros (ICM).',
      theory: [
        {
          title: 'Cover vs short',
          body:
            'Si eres el stack más grande (cover), aplicas presión: steals, iso, 3-bets. Quieres robar ciegas o poner al short en decisiones difíciles. El lead te da fold equity extra porque el rival arriesga su torneo al pegarte.'
        },
        {
          title: 'No suicides el lead',
          body:
            'Hacer call shove light vs short «porque soy favorito en equity» puede ser ICM suicide: pierdes el torneo y el 2.º puesto no paga igual que el 1.º. Chip EV (valor solo en fichas) no es lo mismo que € esperados según el payout.'
        },
        {
          title: 'Objetivo con cover',
          body:
            'Acumula fichas sin regalar dobles fáciles. Presiona spots donde el short folda mucho; foldea cuando su shove representa value claro. El lead se usa para robar, no para hero-call por orgullo.'
        },
        {
          title: 'Trampa mental',
          body:
            'Confundir «tengo más fichas» con «debo pagar todo» es el leak clásico del chip leader en Spins. El payout manda: a veces fold con cover es la jugada profesional.'
        }
      ],
      examples: [
        {
          title: 'Presión con cover',
          body:
            'Short tiene 8 bb, tú 25 bb en BTN: steal wide. El short no puede defenderte todas las manos; muchas veces te regala las ciegas sin showdown.'
        },
        {
          title: 'Fold con cover',
          body:
            'Short shove 10 bb desde SB, tú BB cover con A9o cerca del dinero: a menudo fold es correcto. Eliminarlo es bonito en fichas, pero bustarte a ti mismo cuesta el premio.'
        },
        {
          title: 'Cuándo sí pagas',
          body:
            'Short shove 7 bb y tú BB con 99 o AKo: ahí sí haces call — equity alta y eliminar rival acerca al 1.º. No es light; es value claro.'
        }
      ]
    },

    'S-07': {
      concept:
        'Short stack (pocas bb): necesitas fichas para llegar al payout, pero no cualquier all-in. Elige double-up (doblar) claros con fold equity o equity decente; evita panic shove.',
      theory: [
        {
          title: 'Short vs cover',
          body:
            'El rival tiene más fichas y puede eliminarte. Tu shove debe ser selectivo: manos que foldan a menudo (fold equity) o que van razonablemente bien cuando te pagan. No eres un cash game a 100 bb — cada all-in decide el torneo.'
        },
        {
          title: 'Sobrevive y elige spots',
          body:
            'A veces fold es correcto aunque «necesites fichas». Perder todo en un flip malo = 0 €. Survive + pick spots: esperas un shove con historia (posición, fold equity, mano decent) en lugar de tirarte con basura por ansiedad.'
        },
        {
          title: 'Fold equity del short',
          body:
            'Si shoveas y todos folden, ganas el bote sin showdown — vital cuando eres short. Por eso BTN/SB a 8–12 bb shovean más wide que en early: las ciegas ya están en juego y el fold equity paga.'
        },
        {
          title: 'Trampa: panic shove',
          body:
            'Panic shove con basura vs un cover que paga wide te elimina sin EV real. Si la mano no tiene fold equity ni equity, fold y espera el siguiente spot — aunque duela el reloj de ciegas.'
        }
      ],
      examples: [
        {
          title: 'Shove con fold equity',
          body:
            '10 bb en BTN, folds hasta ti: shove A5s. Si folden, ganas ciegas; si te pagan, aún tienes equity y blockers. Es un double-up candidato, no desesperación.'
        },
        {
          title: 'Fold para sobrevivir',
          body:
            '8 bb en BB, cover shove desde SB: fold 65o aunque «necesites fichas». Estás dominado, sin fold equity (él ya está all-in) y el call es solo orgullo.'
        },
        {
          title: 'No min-raise short',
          body:
            'Con 9 bb en SB no abras a 2 bb «por ver». Push/fold: shove manos del chart o fold. El open min te deja sin plan si hacen call o te resuben.'
        }
      ]
    },

    'S-08': {
      concept:
        'Repaso M1: iso vs limp, 3-bet shove, chip lead y short vs cover. Examen = mezcla de esos spots sin teoría nueva. Más decisiones binarias (shove/fold) que en M0.',
      theory: [
        {
          title: '¿Hay limp en mesa?',
          body:
            'Si alguien limpea, iso con manos fuertes y fold basura. No regales pot multiway ni overiso trash. La pregunta útil es si quieres heads-up con esa mano, no si «puedes ver flop» barato.'
        },
        {
          title: '¿Te abren en zona corta?',
          body:
            'A ~10–15 bb responde con 3-bet shove o fold. Evita el 3-bet pequeño que te deja sin stack útil. Flat (hacer call) dominado OOP es trampa de examen.'
        },
        {
          title: '¿Eres cover o short?',
          body:
            'Cover: presiona steals e iso; no hero-call shoves light. Short: elige shoves con fold equity o equity, no panic. El rol (quién tiene más fichas) cambia el plan aunque la mano sea la misma.'
        },
        {
          title: 'Antes de actuar',
          body:
            'Anota mentalmente: stack en bb + posición + rol (steal / defensa / iso / push) + ¿cover o short? Luego ejecuta. Si no puedes nombrar el rol en una frase, párate un segundo.'
        }
      ],
      examples: [
        {
          title: 'Checklist del examen',
          body:
            'Lee stack y si hay limp u open antes de clicar. M1 Spins premia acciones binarias claras: iso o fold, shove o fold — menos «inventar» que en cash profundo.'
        },
        {
          title: 'Misma mano, distinto rol',
          body:
            'A9o: como cover vs short shove cerca del dinero a menudo fold; como short en BTN a 10 bb a menudo shove. El examen mira si leíste el contexto, no solo las cartas.'
        },
        {
          title: 'Error M1 típico',
          body:
            'Iso con Q8o «porque limp», o 3-bet a 2,5× con 99 a 12 bb. Ambos son leaks que M1 castiga: basura no se aísla; corto se shovea o se tira.'
        }
      ]
    },

    'S-09': {
      concept:
        'Entre 12 y 8 bb entras en push/fold: casi no hay open pequeño. Decides shove (all-in) o fold según charts de stack corto — el min-raise estilo cash es leak.',
      theory: [
        {
          title: 'Qué es push/fold',
          body:
            'Con stack muy corto, un min-raise deja poco fold equity y te commitea mal si te resuben. La regla práctica es binaria: all-in o fold. Shove = poner todas las fichas de una vez; no confundas con open a 2 bb.'
        },
        {
          title: 'Posición en 3-max',
          body:
            'BTN shovea más wide que las posiciones «tempranas» del Spin (quien habla primero). Desde BTN vs blinds el steal es el más loose; desde SB aún shoveas wide pero el BB defiende mejor. Usa el menú Rangos / charts push-fold como referencia.'
        },
        {
          title: 'Por qué no min-raise a 10 bb',
          body:
            'Open min a 10 bb «como cash» y fold al 3-bet: pierdes ciegas e iniciativa. Si la mano merece entrar, suele merecer shove; si no, fold. El medio te deja con 7–8 bb y sin plan.'
        },
        {
          title: 'Trampa de zona gris',
          body:
            'Manos medias offsuit en primera voz (equivalente UTG/HJ en 3-max) a menudo son fold aunque en BTN serían shove. Peor fold equity y peor precio cuando te pagan. No copies el chart de BTN a todas las sillas.'
        }
      ],
      examples: [
        {
          title: 'Push desde BTN',
          body:
            '10 bb BTN, folds a ti: shove KTs. O robas las ciegas, o vas all-in con equity decente si hacen call. Open a 2 bb aquí suele ser peor.'
        },
        {
          title: 'Fold en zona gris',
          body:
            '9 bb first-in (no BTN): Q9o often fold. Tienes peor fold equity que en botón y muchas manos te dominan cuando te pagan.'
        },
        {
          title: 'Par medio = shove value',
          body:
            '99 a 10–12 bb en BTN: shove por valor claro. Quieres doblar o robar; no «ver flop barato» con un open min que te deja mal stacked.'
        }
      ]
    },

    'S-10': {
      concept:
        'Cuando te shovean, el call correcto suele ser más tight que el «chip EV» (valor solo en fichas): el ICM castiga arriesgar tu torneo por un flip. Overfold vs shove suele ser correcto en Spins.',
      theory: [
        {
          title: 'Chip EV vs ICM',
          body:
            'Chip EV mira solo fichas ganadas o perdidas a largo plazo. ICM (Independent Chip Model) traduce stacks y payout (primero, segundo, tercero) a euros esperados. En Spins, un call que gana fichas en promedio puede perder € porque el bust te deja a cero.'
        },
        {
          title: 'Qué manos hacen call',
          body:
            'Haces call shove con manos fuertes: pares altos, Ax fuerte. Fold muchas manos medias que en cash a 100 bb pagarías (A9o, KQo marginal). Hero-call — pagar «porque puedo ganar» sin mirar el payout — es la trampa ICM.'
        },
        {
          title: 'Short vs cover al shove',
          body:
            'Vs shove del short a veces pagas un poco más wide: eliminarlo te da € y arriesgas menos de tu stack relativo. Vs shove del cover, más tight: te juegas el torneo entero contra un stack que te elimina.'
        },
        {
          title: 'Regla práctica',
          body:
            'Si dudas entre hacer call y fold cerca del dinero, inclínate a fold salvo que la mano sea claramente fuerte. En Spins el overfold vs shove no es «debilidad»: es disciplina de payout.'
        }
      ],
      examples: [
        {
          title: 'Fold ICM correcto',
          body:
            'Cover te shovea, tú con 22 bb y AJo: a veces fold es mejor que flip. Quedarte vivo hacia el 2.º paga algo; bust = 0 € aunque fueras favorito en fichas.'
        },
        {
          title: 'Call vs short',
          body:
            'Short shove 7 bb, tú BB con 99: hacer call claro. Equity alta y eliminar rival acerca al 1.º — aquí chip EV e ICM apuntan al mismo lado.'
        },
        {
          title: 'No hero-call',
          body:
            'Shove desde BTN a 12 bb, tú BB con KTo: fold típico. Dominada, sin odds de payout claras — «puedo ganar» no es argumento ICM.'
        }
      ]
    },

    'S-11': {
      concept:
        'A veces un call gana fichas en promedio (+EV chips) pero pierde dinero de torneo (−EV $). Aprende a oler esos spots antes de pagar: el pay jump decide.',
      theory: [
        {
          title: '+EV chips / −EV $',
          body:
            'Ganas fichas a largo plazo pero reduces tu premio esperado en euros porque arriesgas eliminación cerca del dinero. El spot se ve «correcto» en equity de cartas y es incorrecto en payout. Spins viven de detectar esa trampa.'
        },
        {
          title: 'Pay jump',
          body:
            'Pay jump es el salto de premio entre puestos (segundo vs primero, o cobrar vs bust). Cuanto mayor el salto, más caro es flippear. En 3-max cada eliminación mueve € de verdad, no solo fichas de vanity.'
        },
        {
          title: 'Prioriza supervivencia cuando pesa',
          body:
            'Cuando el payout aprieta, fold manos que «van bien en fichas» pero no justifican el bust. No necesitas ser el favorito al 55 % si perder te saca del dinero grande.'
        },
        {
          title: 'ICM suicide',
          body:
            'ICM suicide: hacer call shove light porque «soy 55 % favorito» ignorando que bust = perder la entrada entera. No preguntes solo si ganas el flip; pregunta cuánto € arriesgas frente a cuánto ganas.'
        }
      ],
      examples: [
        {
          title: 'Spot +EV chips / −EV $',
          body:
            '3-max, el 2.º ya tiene sentido de premio, tú mid-stack con 18 bb haces call al shove de cover con A8s: puede ser +chips y −€ si el bust te cuesta el segundo premio grande.'
        },
        {
          title: 'Oler el mal spot',
          body:
            'Si tu argumento para pagar es solo «tengo outs / soy ligero favorito» y no has mirado stacks ni multiplicador, párate. Ese olor suele ser −EV $ disfrazado de valentía.'
        },
        {
          title: 'Cuándo sí está alineado',
          body:
            'Short shove tiny, tú con TT+ o AK: chip EV e ICM suelen coincidir. El problema son los calls marginales (A9o, KQo, pares bajos) cerca del pay jump.'
        }
      ]
    },

    'S-12': {
      concept:
        'Payout 5× (premio total cinco veces las entradas) aprieta más que 2×/3×: juegas más tight — el 1.º pesa mucho y perder el 2.º duele más. Misma mano, distinto multiplicador.',
      theory: [
        {
          title: 'Multiplicador y € en juego',
          body:
            'La ruleta del Spin (2× / 3× / 5×) cambia cuánto dinero hay en el prize pool. En 5× el 1.º se lleva una parte mayor: el ICM es más fuerte. Guarda ese dato mental desde la mano 1; no es decoración de lobby.'
        },
        {
          title: 'Cómo ajustar',
          body:
            'En 5×: menos steals locos, más tight vs shove, menos flips marginales. En 2×: algo más de chip EV permitido — aún no es cash, pero el castigo ICM es menor. El error caro es jugar igual el spin de 2× que el de 5×.'
        },
        {
          title: 'Misma mano, distinto payout',
          body:
            'AJo haciendo call a un shove puede ser razonable en 2× y fold en 5×. No cambian tus cartas: cambia el precio en euros de equivocarte. Entrena esa pregunta: «¿qué multiplicador salió?».'
        },
        {
          title: 'Trampa de lobby',
          body:
            'Ignorar el multiplicador y repetir el mismo chart mental en todos los Spins es leak muy caro en lobbies reales. Mira la ruleta; luego elige tightness.'
        }
      ],
      examples: [
        {
          title: '5× más tight',
          body:
            'La ruleta mostró 5× antes de empezar: si dudas entre shove marginal y fold, inclínate a fold. Si dudas entre hacer call marginal y fold vs shove, fold otra vez.'
        },
        {
          title: '2× un poco más flexible',
          body:
            'En 2× puedes robar y pagar un poco más wide que en 5×, pero sigue sin ser cash: bust = 0 €. Flexibilidad no es spew.'
        },
        {
          title: 'Checklist pre-mano',
          body:
            'Antes del primer steal del torneo: ¿2×, 3× o 5×? Ese número fija cuánto aprietas calls y shoves grises el resto de la mesa.'
        }
      ]
    },

    'S-13': {
      concept:
        'Examen ICM Spins: push/fold, call shove, spots +EV chips vs −EV $ y ajuste por payout 2×/3×/5×. Sin teoría nueva — solo aplicar el checklist de M2.',
      theory: [
        {
          title: 'Fichas o euros',
          body:
            'Pregunta clave en cada spot: ¿decido mirando solo fichas (chip EV) o el premio en euros (ICM)? Si no puedes responder en una frase, no hagas call todavía.'
        },
        {
          title: '¿Stack ≤12 bb?',
          body:
            'Entra push/fold: shove (all-in) o fold. No min-raise estilo cash. El examen castiga el open pequeño que te deja sin plan ante un 3-bet.'
        },
        {
          title: '¿Multiplicador?',
          body:
            '2×/3× vs 5× cambia tightness en calls y steals marginales. En 5×, ante la duda, fold. El multiplicador no es opcional: es parte del spot.'
        },
        {
          title: 'Checklist del examen',
          body:
            'Stack en bb → rol cover/short → payout → fold / shove / hacer call. Nombra el rango rival en una frase antes de pagar un shove. Cero vocabulario nuevo: solo disciplina.'
        }
      ],
      examples: [
        {
          title: 'Antes del examen',
          body:
            'Repasa S-09…S-12: push/fold limpio, overfold vs shove, oler −EV $, 5× más tight. Si esos cuatro bloques están claros, el examen es aplicación.'
        },
        {
          title: 'Spot trampa del examen',
          body:
            'Te shovean, tienes A9o, eres mid-stack, payout 5×: muchas veces fold aunque «en fichas» el call se vea decente. El examen mira si leíste ICM, no solo equity.'
        },
        {
          title: 'Spot limpio',
          body:
            '10 bb BTN first-in con ATs o 99: shove. No hay drama ICM que justifique min-raise. Binario y limpio.'
        }
      ]
    },

    'S-14': {
      concept:
        'Bubble factor (presión de «burbuja»): mide cuánto duele arriesgar fichas cerca de un salto de pago. En Spin 3-max el heads-up (HU) ya es un pay jump decisivo — no flippees barato el 2.º.',
      theory: [
        {
          title: 'Qué es bubble en 3-max',
          body:
            'Bubble es la zona donde un bust te deja sin € (o te baja de premio) mientras otro jugador cobra. En Spin 3-max, pasar de tercero a segundo o de segundo a primero ya es bubble mental: no hace falta mesa de 100 runners para sentir la presión.'
        },
        {
          title: 'Pay jump heads-up',
          body:
            'En heads-up (dos jugadores) el premio del primero frente al segundo puede repartir cerca de 70/30 según multiplicador. No es indiferente flippear: un 50/50 en fichas puede ser un mal negocio en euros si el salto de premio es grande.'
        },
        {
          title: 'Bubble factor alto',
          body:
            'Cuando el bubble factor es alto → fold más, shove más selectivo. No regales el second place barato por «ganar el flip». Presiona spots baratos; evita all-ins que deciden el torneo sin edge claro.'
        },
        {
          title: 'Trampa final',
          body:
            'Ignorar el payout en el all-in que decide el torneo. Un flip puede costarte € aunque sea 50/50 en fichas. Antes de shove o hacer call HU, nombra el pay jump en voz baja.'
        }
      ],
      examples: [
        {
          title: 'HU pay jump',
          body:
            'Heads-up: el 1.º gana mucho más que el 2.º. Un flip innecesario con A9o vs shove wide puede costarte la diferencia en € aunque ganes fichas a coin-flip.'
        },
        {
          title: 'Presión correcta en bubble',
          body:
            'Eres cover en 3-max cerca de eliminar al short: roba ciegas y fuerza decisiones. No hace falta hero-call su shove con manos medias — la presión ya trabaja por ti.'
        },
        {
          title: 'Fold que duele y paga',
          body:
            'HU, rival shove, tú con KJo en payout alto: a menudo fold. Duele, pero preservar el 2.º (o forzar mejor spot) vale más que el ego del call.'
        }
      ]
    },

    'S-15': {
      concept:
        'Range vs range: antes de shove o hacer call, piensa en bandas de manos (rangos), no solo «mi carta es bonita». Tu AK se mide contra el rango de shove rival, no contra «creo que tiene QQ».',
      theory: [
        {
          title: 'Qué es un rango',
          body:
            'Rango es el conjunto de manos que el rival puede tener en ese spot. Ejemplo: «BTN shove 10 bb» suele ser más wide (más manos) que «BB hace call vs ese shove». Nombrar el rango evita pelear contra una mano concreta imaginaria.'
        },
        {
          title: 'Tu shove vs su call',
          body:
            'Antes de shovear pregunta: ¿qué manos peores me pagan? ¿qué manos mejores me tienen? Si estás dominado a menudo cuando te hacen call, el shove era vanity. Fold equity + equity vs rango de call = la cuenta real.'
        },
        {
          title: 'Call vs rango de shove',
          body:
            'Range vs range en call shove: tu A5o desde BB no se mide vs «tal vez tenga 72o»; se mide vs el rango real de shove BTN (muchas Ax, pares, conectadas). A5o often fold — dominada por Ax mejores y por pares.'
        },
        {
          title: 'Trampa de sensación',
          body:
            'Decidir solo por «me gusta mi mano» sin nombrar el rango rival. En Spins cortos esa sensación te hace hero-call y panic shove. Oblígate a una frase: «él shovea X; yo contra X hago Y».'
        }
      ],
      examples: [
        {
          title: 'Nombrar rangos',
          body:
            'BTN shove 10 bb: muchas Ax, pares, suited connectors. BB call: más tight — pares medios+, Ax fuerte. Por eso A5o BB vs shove BTN often fold, y 99 hace call.'
        },
        {
          title: 'AK vs rango, no vs QQ',
          body:
            'Rival shove desde SB a 12 bb. Tu AKo no pregunta «¿y si tiene QQ?»; pregunta equity vs su rango de shove SB (que incluye muchas peores Ax y Kx). Suele ser call/shove value, no terror a una mano concreta.'
        },
        {
          title: 'Shove con blockers',
          body:
            'A5s shove desde BTN bloquea AA/AK del rival: ganas fold equity y algo de equity cuando te pagan. Ese razonamiento es range-based, no «me gusta el as».'
        }
      ]
    },

    'S-16': {
      concept:
        'Explotación: vs nit (folda mucho) stealeas más; vs maniac (juega muchas manos agresivo) defiendes tighter y value-shoveas más limpio. Ajusta al rival real, no solo al chart ciego.',
      theory: [
        {
          title: 'Vs nit',
          body:
            'Nit: se tira demasiado vs steals y abre tight. Puedes abrir/steal más wide — cada fold suyo es fichas gratis hacia el payout. No necesitas GTO perfecto si el rival tira el 80 % de las ciegas.'
        },
        {
          title: 'Vs maniac',
          body:
            'Maniac: paga y shovea wide. Reduce faroles, value-shove más grueso (TT+, Ax fuerte) y no hagas bluffcatch light (pagar faroles con manos medias). Contra alguien que nunca folda, el bluff pierde sentido.'
        },
        {
          title: 'Ajuste > chart ciego',
          body:
            'Observa 10–20 manos del rival en lobby si puedes: ¿folda BTN steal? ¿paga light? ¿shovea cualquier Ax? El chart GTO es base; la explotación es el € extra cuando el leak es obvio.'
        },
        {
          title: 'Trampa de libro',
          body:
            'Jugar GTO de manual vs nit o maniac obvios deja dinero en la mesa. Si ves el leak y no ajustas, estás regalando EV por «parecer equilibrado» en un Spin de tres manos decisivas.'
        }
      ],
      examples: [
        {
          title: 'Vs nit',
          body:
            'SB folda ~80 % vs steal BTN: abre wider. Cualquier fold es fichas hacia el payout sin showdown — castiga la pasividad.'
        },
        {
          title: 'Vs maniac',
          body:
            'BB paga y 3-betea light: aprieta opens marginales, shove value (TT+, AQo+) más often y deja de farolear thin. Que él spewee; tú cobra value.'
        },
        {
          title: 'Lectura rápida',
          body:
            'Tras dos steals: si ambos foldan, marca nit-leaning. Si te pagan o te shovean light, marca maniac-leaning. Ajusta la tercera mano — en Spins no hay 200 manos para confirmar.'
        }
      ]
    },

    'S-17': {
      concept:
        'Certificación Spin Pro: integra anatomía (fichas ≠ €), steal/defensa, iso, push/fold, ICM, payout y explotación. Sin vocabulario nuevo — plan completo en una mesa corta.',
      theory: [
        {
          title: 'Mapa del spot',
          body:
            'Repaso mental: ¿cuántas bb tengo? ¿Es steal, defensa BB, iso vs limp o push/fold? Si no puedes etiquetar el spot, no actúes todavía. El Pro nombra el trabajo antes de clicar.'
        },
        {
          title: 'Cover, short y multiplicador',
          body:
            '¿Soy cover (más fichas) o short? ¿El multiplicador fue 2×/3× o 5×? Eso cambia tightness de steals, shoves y calls. El mismo A9o no se juega igual en todos esos mundos.'
        },
        {
          title: 'Fichas vs euros + rangos',
          body:
            '¿Decido en fichas (chip EV) o en euros (ICM)? ¿Nombré el rango rival antes de hacer call o shove? Range vs range + payout > sensación de «carta bonita».'
        },
        {
          title: 'Checklist final',
          body:
            'Posición → stack bb → payout → cover/short → acción sin spew ni hero-call. Sobrevive al payout correcto, presiona con cover, shove/fold limpio de short, overfold ICM cuando el pay jump duele.'
        }
      ],
      examples: [
        {
          title: 'Plan Pro en una frase',
          body:
            'Sobrevive al payout correcto, presiona con cover, shove/fold limpio de short, overfold ICM cuando el pay jump duele, y explota nit/maniac cuando el leak es obvio.'
        },
        {
          title: 'Pregunta de certificación',
          body:
            'Te shovean en 5× con KQo mid-stack: ¿chip EV o ICM? Si respondes ICM y fold (salvo reads maniac extremos), estás pensando Pro. Si solo dices «puedo ganar», aún no.'
        },
        {
          title: 'Spot de cierre',
          body:
            '10 bb BTN, payout 3×, ATs: shove. No es examen de filosofía — es push/fold limpio. El Pro también sabe cuándo el spot es simple.'
        }
      ]
    }
  },

  teachBacks: {
    's04-01':
      'AJs en BTN vs limp de SB: iso (aislar). Subes para jugar heads-up contra el limper con una mano fuerte que domina muchos limps wide. No hagas call flat detrás — quieres iniciativa, no multiway.',
    's04-02':
      '72o vs limp: fold. No overiso (aislar de más) con basura: o te dejan en pot multiway o te pagan dominado. A stack corto ese error duele entero el torneo.',
    's04-03':
      'KQs vs limp corto: iso por valor. Mano fuerte — quieres bote heads-up con iniciativa, no limpear detrás ni hacer call pasivo. Castiga el limp y juega con ventaja.',
    's04-04':
      'Q8o vs limp: fold frecuente. No aísles manos frágiles que no mejoran bien postflop y se dominan fácil. Si no merecería open sin limp, tampoco merece iso.',
    'sp-01':
      'ATs con ~12 bb en BTN: shove (all-in) candidato. A esta profundidad un open pequeño suele ser peor que ir all-in o fold: ganas fold equity o vas a doblar con equity decente si te pagan.',
    'sp-02':
      '72o a ~12 bb: fold. No hagas panic shove (all-in por desesperación): no tienes fold equity real ni equity cuando te pagan. Espera un spot con historia.',
    'sp-03':
      'KJs SB ~10 bb: shove frecuente. Stack corto + ciegas ya en juego = zona push/fold. No abras min «como cash»; o all-in o fold.',
    'sp-04':
      '99 a 10–12 bb: shove por valor claro. Par medio fuerte en push/fold — quieres doblar o robar ciegas, no open min que te deja mal stacked ante un 3-bet.'
  }
};
