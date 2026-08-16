'use strict';

/**
 * Contenido pedagógico — Laboratorio de Rangos R-01…R-21.
 * Solo concept / theory / examples / aiQuestions (sin route, plan, xp…).
 * Voz: profesor ES-ES; glosar término la 1ª vez; «hacer call»; «limpear».
 */
module.exports = {
  lessons: {
    "R-01": {
      concept:
        "Antes de memorizar un open, aprende a leer la matriz 13×13 del menú Rangos: cada celda es una mano y el color o el % te dice con qué frecuencia se juega.",
      theory: [
        {
          title: "Qué es la matriz",
          body:
            "La matriz (o range chart) es una cuadrícula de 13 filas × 13 columnas con los ranks de A a 2. Cada celda representa una combinación de dos cartas. Ábrela en el menú Rangos de la app: ahí verás RFI, defensa y más por posición, no solo un dibujo estático."
        },
        {
          title: "Suited, offsuit y pares",
          body:
            "Los pares (AA, KK… 22) viven en la diagonal. Las manos suited (mismo palo, p. ej. AKs) suelen estar a un lado de la diagonal; las offsuit (palos distintos, AKo) al otro. Localiza primero AA y 72o: si no sabes dónde caen, aún no “lees” el chart."
        },
        {
          title: "Frecuencias, no solo sí/no",
          body:
            "Un color o un porcentaje en la celda indica frecuencia: no todo es “siempre open” o “nunca”. Una mano al 40 % se mezcla (a veces se juega, a veces no). Compara RFI BTN con RFI UTG en el menú Rangos: el botón es mucho más wide (más manos)."
        },
      ],
      examples: [
        {
          title: "Localizar tres celdas",
          body:
            "En el menú Rangos, RFI BTN: encuentra 99 (diagonal), ATs (suited) y KJo (offsuit). Si las tres te salen a la primera, ya orientas la matriz."
        },
        {
          title: "BTN vs UTG a simple vista",
          body:
            "Mismo chart tipo RFI: UTG tiene pocas celdas “encendidas”; BTN muchas más. El mensaje del profesor: posición late = rango más ancho, no “cualquier dos”."
        },
        {
          title: "Leer un %",
          body:
            "Si K9s aparece al 65 %, no es “siempre open”: en dos de cada tres veces se abre y en una se fold. El chart habla en frecuencias, no en absolutos."
        },
      ],
      aiQuestions: [
        "¿Dónde están los pares en la matriz 13×13?",
        "¿Qué diferencia visual ves entre RFI BTN y RFI UTG en el menú Rangos?",
        "¿Qué significa un porcentaje en una celda?",
      ]
    },

    "R-02": {
      concept:
        "Construir el RFI del botón en sesenta segundos no es memorizar píxeles: es tener bandas mentales (pares, broadway, suited connectors) y luego contrastarlas con el menú Rangos.",
      theory: [
        {
          title: "Qué es RFI BTN",
          body:
            "RFI (raise first in) es subir primero el bote cuando nadie ha entrado. Desde BTN (botón) tu rango de open es el más wide de las posiciones late: muchas manos tienen fold equity (posibilidad de que todos tiren) y, si hacen call, juegas el flop en posición."
        },
        {
          title: "Bandas en 60 segundos",
          body:
            "Cronómetro: di en voz alta categorías, no celdas sueltas. Ejemplo de mapa: 22+, A2s+, ATo+, K9s+, KTo+, QTs+, J9s+, T8s+, 98s–65s, y algunas suited gapers. Luego abre el menú Rangos y marca qué te faltó o qué sobró."
        },
        {
          title: "Trampa del “cualquier dos”",
          body:
            "Wide no significa limpear (igualar la ciega grande para entrar) ni openear 93o “porque soy botón”. El objetivo es un mapa usable bajo presión, no un permiso para spew. Si no puedes nombrar bandas, no tienes rango: solo intuición."
        },
      ],
      examples: [
        {
          title: "Drill de un minuto",
          body:
            "Cierra los ojos: “Pares todos; ases suited casi todos; broadway offsuit selectivo; conectores suited medios.” Abre el chart RFI BTN y anota tres manos que olvidaste."
        },
        {
          title: "Contraste con CO",
          body:
            "Repite el drill para CO: verás menos manos (más tight). Si tu mapa mental BTN y CO son idénticos, aún no discriminas por posición."
        },
        {
          title: "Manos frontera",
          body:
            "K9o, Q8s, 54s: ¿dentro o fuera de tu banda BTN? Decide en cinco segundos y comprueba el % en el menú Rangos. Ahí se entrena el borde del rango, no solo el centro."
        },
      ],
      aiQuestions: [
        "¿Qué bandas nombrarías en 60 s para RFI BTN?",
        "¿Por qué wide en BTN no autoriza openear basura total?",
        "¿Cómo usas el menú Rangos después del drill mental?",
      ]
    },

    "R-03": {
      concept:
        "Dado un flop, estima qué porcentaje del rango rival conectó pareja, proyecto o aire: la textura decide la ventaja de rango y, con ella, tu plan de c-bet.",
      theory: [
        {
          title: "Conectar un board",
          body:
            "“Qué % del rango conecta” pregunta cuántas combinaciones del rango preflop mejoraron a pareja, dos pares, trío, straight/flush draw, etc. No hace falta un solver: piensa en categorías. Un rango BTN wide en K♠7♦2♣ rainbow conecta top pair menos que en J♥T♥9♦."
        },
        {
          title: "Textura y range advantage",
          body:
            "La textura (seco, wet, monotone) cambia quién “encaja” mejor. Range advantage (ventaja de rango) significa que tu distribución de manos fuertes supera a la del rival en ese board. En A-high seco el agresor RFI suele tener ventaja; en bajos conectados el caller recupera mucho."
        },
        {
          title: "Enlace con el c-bet",
          body:
            "Si tu rango conecta más (o el rival falla más), el c-bet (apuesta de continuación tras haber subido preflop) tiene más sentido, a menudo a sizing pequeño. Si el board favorece al que solo hizo call, reduces frecuencia y cedes más. Enlace directo con Cash M2 (C-14…C-16)."
        },
      ],
      examples: [
        {
          title: "BTN wide en K72r",
          body:
            "Rango de open BTN vs BB. Flop K♠7♦2♣: muchas manos del BB fallan; tú tienes Ax, Kx y overpairs. Estimas: rival conectó poco → c-bet frecuente."
        },
        {
          title: "Mismo rango en JT9",
          body:
            "Flop J♥T♠9♦: el BB con suited connectors y broadway media conecta draws y pares fuertes. Tu ventaja se reduce → menos autocbet, más selectividad."
        },
        {
          title: "Pregunta de profesor",
          body:
            "Antes de pulsar bet: “¿Este board ayuda más a mi rango de agresor o al de defensa?” Si no sabes responder, aún no estimaste el % que conectó."
        },
      ],
      aiQuestions: [
        "¿Cómo cambia el % que conecta un rango wide entre K72r y JT9?",
        "¿Qué es range advantage en una frase?",
        "¿Cómo enlazas esa estimación con tu frecuencia de c-bet?",
      ]
    },

    "R-04": {
      concept:
        "Tus cartas quitan combinaciones del rango rival: eso son blockers. Contar qué combos eliminas cambia cuándo faroleas y cuándo haces call con bluff-catchers.",
      theory: [
        {
          title: "Blockers = eliminación de combos",
          body:
            "Un combo es una combinación concreta (p. ej. A♠K♥). Si tú tienes el A♠, el rival ya no puede tener AA con ese as ni AKs del palo de picas. Blockers (bloqueadores) son tus cartas vistas que reducen las manos fuertes o los bluff-catchers del villano."
        },
        {
          title: "Faroles con buen blocker",
          body:
            "Por eso Axs (as suited) aparece mucho como farol de 3-bet o de river: bloqueas AA y AKx del mismo palo y a menudo tienes equity de respaldo. Antes de farolear, pregunta: “¿qué combos de value quito? ¿qué bluff-catchers dejo vivos?”"
        },
        {
          title: "Trampa sin blockers",
          body:
            "Farolear river en boards pesados sin blocker de nuts (la mejor mano posible) es spew frecuente: dejas intactas las manos que te pagan y las que te ganan. Practica en voz alta: “quito X, no quito Y” antes de meter fichas."
        },
      ],
      examples: [
        {
          title: "3-bet farol con A5s",
          body:
            "Vs open BTN, A♠5♠: bloqueas AA y muchos AKo/AKs de picas. El farol tiene historia; K9o offsuit no bloquea lo mismo y suele ser peor candidato (enlace con C-08)."
        },
        {
          title: "River: as de picas en board de color",
          body:
            "Board con tres picas; tú tienes A♠x sin color. Bloqueas la nuts de color: a veces farol o semi-farol tiene más sentido que con 7♦6♣, que no bloquea nada relevante."
        },
        {
          title: "Bluff-catcher y blockers",
          body:
            "Con Kx en un river donde el rival apuesta polar, tener el as del palo del flush posible puede justificar hacer call: reduces combos de color value y dejas más faroles en su rango."
        },
      ],
      aiQuestions: [
        "¿Qué combos quita A♠X del rango rival?",
        "¿Por qué Axs es farol frecuente de 3-bet?",
        "¿Qué pregunta te haces antes de farolear un river?",
      ]
    },

    "R-05": {
      concept:
        "Tras una línea completa (preflop → river), no pongas al rival en “una mano”: recorta su rango calle a calle y acaba preguntándote qué combos siguen vivos.",
      theory: [
        {
          title: "Cada calle elimina manos",
          body:
            "Asignar rango es ir capeando (recortando) combinaciones imposibles en cada calle. Quien hace open RFI no tiene 72o. Quien hace call a un c-bet en flop seco ya no es el RFI entero. Quien apuesta river tras tres calles de agresión densifica value y faroles creíbles; muchas medias sticky ya se quedaron atrás."
        },
        {
          title: "Lee la línea, luego elige un combo",
          body:
            "Ejercicio de profesor: narra preflop → flop → turn → river en voz alta. En el river lista 2–3 manos tipo de value, 2–3 medias y 2–3 aires que llegan a esa línea. Luego elige UN combo concreto que sobreviva. Si solo puedes imaginar la nuts que te gana, estás sesgado."
        },
        {
          title: "Quiz final: ¿qué crees que tiene?",
          body:
            "Antes de ver las cartas del villano, elige entre tres manos creíbles de preflop: la que encaja con toda la línea y dos que abren/defienden pero mueren en flop, turn o river (check-check que elimina AA, pot-control que saca underpairs, etc.). Si solo descartas basura de open, el ejercicio es demasiado fácil."
        },
      ],
      examples: [
        {
          title: "Triple barrel en A-high seco",
          body:
            "BTN open, BB call, flop check-call, turn check-call, river bet. El BTN en river ya no es el RFI entero: se densificó en Ax value y algunos faroles con blockers; 72o nunca abrió y muchas basuras checkearon atrás en turn."
        },
        {
          title: "Check-raise en flop",
          body:
            "BB check-raisea un c-bet en board seco. Historia típica: sets, dos pares, a veces faroles con blockers. QJ sin pareja queda fuera del value; no digas “me tiene AK” sin mirar la línea."
        },
        {
          title: "Drill de tres opciones",
          body:
            "Al final de cada mano de práctica verás tres combos. Pregunta: ¿cuál sigue vivo tras open + call flop + bet turn + bet river? Las otras dos deben tener una frase de descarte clara."
        },
      ],
      aiQuestions: [
        "¿Qué manos elimina un check-raise de flop del rango “solo call”?",
        "¿Cómo evitas poner al rival siempre en la nuts tras un river bet?",
        "Antes de ver las cartas del villano, ¿qué pregunta te haces?",
      ]
    },

    "R-06": {
      concept:
        "En un nodo GTO las acciones suelen mezclarse: bet 70 / check 30 no es indecisión, es frecuencia. Entender el mix te evita exigir “siempre” o “nunca”.",
      theory: [
        {
          title: "Frecuencias de nodo",
          body:
            "Un nodo es un punto de decisión (p. ej. c-bet flop IP en A72r). GTO (game theory optimal) asigna frecuencias: la misma mano o el mismo rango puede apostar a veces y checkear otras. El chart del menú Rangos o del solver habla en %; tú en mesa eliges una acción concreta."
        },
        {
          title: "Node locking mental",
          body:
            "Node locking mental es decirte: “aquí el mix sano es ~70 % bet / 30 % check” aunque en esta mano ejecutes solo una línea. Sirve para no tiltar cuando el chart “a veces checkea” con una mano que tú siempre apostarías, y para no rigidizar spots que el solver mezcla."
        },
        {
          title: "Trampa del 100 % o 0 %",
          body:
            "Exigir pure strategies (siempre bet o siempre check) en todos los spots te pelea con el mix. En live/online eliges una acción; en estudio respetas que el equilibrio a menudo es frecuencia. Enlace natural con C-30 en Pro Cash."
        },
      ],
      examples: [
        {
          title: "C-bet 70 / check 30",
          body:
            "Flop seco IP: el nodo puede mandar c-bet ~70 %. Tú con KQo apuestas esta mano; la próxima vez similar podrías checkear otra combinación. El estudio enseña el mix; la mesa ejecuta una muestra."
        },
        {
          title: "Misma mano, dos frecuencias",
          body:
            "A5s en un 3-bet: a veces value/pressure, a veces fold vs 4-bet. No es contradicción: son nodos distintos con frecuencias distintas según el tamaño y la posición."
        },
        {
          title: "Frase de mesa",
          body:
            "En vez de “siempre c-bet”, di “aquí c-beteo la mayoría”. Ese lenguaje de frecuencias es el puente entre el laboratorio de rangos y el juego real."
        },
      ],
      aiQuestions: [
        "¿Qué significa bet 70 / check 30 en un nodo?",
        "¿Para qué sirve el node locking mental si en mesa solo eliges una acción?",
        "¿Por qué es un error exigir 100 % o 0 % en todos los spots?",
      ]
    },

    "R-07": {
      concept:
        "El set (trío con pareja de bolsillo) es value polar clásico: check-raise, donk o triple barrel. Entrena a leer tríos y fulls claros tras la línea completa.",
      theory: [
        {
          title: "Set = trío con pocket",
          body:
            "Cuando el flop trae una carta de tu pareja de bolsillo, tienes set. Esa mano justifica raise polar: no es un call sticky de top pair."
        },
        {
          title: "Líneas típicas",
          body:
            "Check-raise flop, donk en paired boards y barrels largos densifican sets. AKo y underpairs defienden preflop pero mueren en flop sin conexión."
        },
        {
          title: "Quiz: ¿qué crees que tiene?",
          body:
            "Elige el combo que sobrevive a toda la línea. Las otras dos abren o defienden preflop, pero no raisean ni barrela así en flop/turn/river."
        },
      ],
      examples: [
        {
          title: "Check-raise J72",
          body:
            "JJ set explica el check-raise de flop; AKo y TT defienden BB pero no raisean J72 por value en esa calle."
        },
        {
          title: "Donk 982",
          body:
            "99 set cuadra el donk de flop; KQo y ATs check-callearian y no lideran tres calles sin conexión."
        },
        {
          title: "Slowplay paired",
          body:
            "55 o 66 checkean flop paired y delayed barrela turn/river; AA casi nunca checkea ese flop."
        },
      ],
      aiQuestions: [
        "¿Qué líneas densifican sets?",
        "¿Por qué AKo no check-raisea J72?",
        "Antes de revelar, ¿qué pregunta te haces?",
      ]
    },

    "R-08": {
      concept:
        "Dos pares y fulls explican raises y floats que top pair no sostiene. Lee la línea hasta el river y elige el combo de dos pares o boat que sigue vivo.",
      theory: [
        {
          title: "Dos pares vs top pair",
          body:
            "Raise flop o float más bet grande de river suele ser dos pares o más, no solo Kx sticky que pot-controla turn."
        },
        {
          title: "Full house",
          body:
            "En boards paired, el full (boat) justifica barrels que underpairs pot-controlan en turn y river."
        },
        {
          title: "Descartes duros",
          body:
            "QQ y AA a menudo raisean antes; medias sin conexión no meten bet grande de river tras float."
        },
      ],
      examples: [
        {
          title: "Float AK7",
          body:
            "A7s dos pares explica float y presión river; QQ raisearía antes y QJs no mete river grande sin showdown."
        },
        {
          title: "Raise JT3",
          body:
            "JTs dos pares raisea flop; AKo y 88 defienden BB pero no polarizan ese flop por value."
        },
        {
          title: "Boat lento",
          body:
            "99 en double paired: check turn y bet river; overpairs suelen betear turn, no esa línea lenta."
        },
      ],
      aiQuestions: [
        "¿Cuándo un river grande huele a dos pares?",
        "¿Cómo se juega un boat lento?",
        "¿Qué elimina AA del check-check flop?",
      ]
    },

    "R-09": {
      concept:
        "Monotone y two-tone: el color hecho barrela; sin el palo, overpairs pot-controlan. Entrena flushes claros tras la línea completa.",
      theory: [
        {
          title: "Monotone",
          body:
            "Tres del mismo palo en flop: quien raisea o triple-barrela suele tener el color hecho; sin el palo, el overpair pot-controla turn."
        },
        {
          title: "Blocker de nuts",
          body:
            "El as del palo explica value y algunos faroles; sin ninguna del palo, el barrel largo de color en river es raro."
        },
        {
          title: "Quiz de color",
          body:
            "En el quiz, descarta KK o QQ sin el palo y broadway rainbow: abren, pero no barrela monotone como flush hecho."
        },
      ],
      examples: [
        {
          title: "Triple barrel picas",
          body:
            "JTs color explica tres calles; KK sin picas pot-controla turn y no barrela como flush."
        },
        {
          title: "Raise hearts",
          body:
            "97s color raisea flop monotone; AKo rainbow call o fold, no raise polar de color."
        },
        {
          title: "Donk clubs",
          body:
            "KTo color donkea monotone; AKo sin club check-callearía en vez de liderar tres calles."
        },
      ],
      aiQuestions: [
        "¿Qué elimina un overpair sin el palo?",
        "¿Por qué Axs barrela monotone?",
        "¿Qué es un flush draw que sí completa?",
      ]
    },

    "R-10": {
      concept:
        "Boards conectados: la escalera hecha raisea y barrela; overpairs pot-controlan. Lee straights claros calle a calle hasta el river.",
      theory: [
        {
          title: "Conectores y gapers",
          body:
            "T9s en 876 o Q8s en JT9: la escalera hecha justifica raise polar y barrels, no un call sticky de pareja media."
        },
        {
          title: "Overpair ≠ escalera",
          body:
            "AA o KK en board connected a menudo pot-controlan o raisean distinto: no triple-barrela como si tuvieran la escalera."
        },
        {
          title: "Donk en broadway",
          body:
            "En QJT, K9o con escalera puede donkear por value; AQo sin straight check-callearía y no lidera esa línea."
        },
      ],
      examples: [
        {
          title: "Raise 876",
          body:
            "T9s escalera raisea flop; AKo sin conexión call o fold, no raise polar de escalera."
        },
        {
          title: "Barrel al 8",
          body:
            "J7s completa al turn 8 y barrela; KK suele pot-controlar en vez de lineales de straight."
        },
        {
          title: "Slowplay JT9",
          body:
            "KQo escalera tras check-check flop; AA casi siempre c-betea ese board connected."
        },
      ],
      aiQuestions: [
        "¿Qué board favorece escaleras?",
        "¿Por qué QQ pot-controla 765?",
        "¿Cómo descartas AKo en raise de 987?",
      ]
    },

    "R-11": {
      concept:
        "Antes de draws fallidos, clava value limpio: Ax, Kx y sets obvios tras triple barrel o delayed. Misma mecánica de quiz que R-05.",
      theory: [
        {
          title: "Value limpio",
          body:
            "Triple barrel en A-high suele ser Ax; delayed en K-high suele ser Kx; check-raise seco suele ser set."
        },
        {
          title: "Descartes",
          body:
            "Underpairs pot-controlan turn; aire sin as o rey abandona la presión antes del river en líneas de value."
        },
        {
          title: "Puente a M3",
          body:
            "Cuando domines value limpio, M3 mete flush draws y OESD que no completan y se quedan en farol."
        },
      ],
      examples: [
        {
          title: "Triple barrel A-high",
          body:
            "AQo value limpio; TT pot-controla turn y QJs sin as deja de meter presión."
        },
        {
          title: "Delayed K-high",
          body:
            "KJo delayed value; AA betearía flop y QJo sin rey no dobla barrel turn y river."
        },
        {
          title: "Thin river tras check turn",
          body:
            "AJo thin tras check turn; KK suele betear turn y QJo sin as no cobra river."
        },
      ],
      aiQuestions: [
        "¿Qué densifica un triple barrel seco?",
        "¿Qué elimina el check-check flop?",
        "¿Cómo preparas M3 (draws fallidos)?",
      ]
    },

    "R-12": {
      concept:
        "El rival barrela two-tone y el river es blank: a menudo flush draw fallido convertido en farol. Distínguelo del color hecho de M2.",
      theory: [
        {
          title: "Draw → farol",
          body:
            "KsQs en Js9s2c con river seco: la línea de semi-bluff se queda en aire y aun así puede apostar river."
        },
        {
          title: "Quién no barrela",
          body:
            "Underpairs pot-controlan turn; broadway sin flush draw abandona la presión cuando el color no llega."
        },
        {
          title: "No confundir con flush",
          body:
            "Si el river completa el palo, vuelve a R-09; aquí el color NO llega y el villano farolea la historia del draw."
        },
      ],
      examples: [
        {
          title: "Triple barrel blank",
          body:
            "KQs flush draw fallido explica el barrel; 88 pot-controla y QJo sin draw no farolea tres calles."
        },
        {
          title: "Raise flop + blank",
          body:
            "QJs raisea con draw y sigue sin completar; AQo sin draw no raisea flop two-tone."
        },
        {
          title: "Delayed farol",
          body:
            "A8s draw fallido tras check turn; JJ betearía turn y no check-turn + bet-river farol."
        },
      ],
      aiQuestions: [
        "¿Qué es un flush draw fallido?",
        "¿Por qué 88 no triple-barrela el blank?",
        "¿Cómo lo distingues de un color hecho?",
      ]
    },

    "R-13": {
      concept:
        "OESD y gutshots que barrela y fallan: farol creíble. Overpairs pot-controlan; sin draw no hay tres calles de aire en river blank.",
      theory: [
        {
          title: "OESD fallido",
          body:
            "Q9s en JT4 con river que no completa: farol creíble tras haber metido presión con equity de escalera."
        },
        {
          title: "Raise de draw",
          body:
            "T7s raisea 982 con OESD y sigue sin completar; AKo sin draw no raisea ese flop por value ni por semi-bluff."
        },
        {
          title: "Vs value limpio",
          body:
            "Aquí el villano NO tiene la escalera hecha de R-10: la línea parece de draw y el river no llega."
        },
      ],
      examples: [
        {
          title: "Barrel JT4",
          body:
            "Q9s OESD fallido barrela river blank; 88 pot-controla y A9o sin draw no farolea tres calles."
        },
        {
          title: "Raise 982",
          body:
            "T7s OESD fallido tras raise flop; AKo y JJ no construyen raise polar sin set ni draw."
        },
        {
          title: "Float T87",
          body:
            "J9s OESD float y bet river sin completar; AA raisearía antes y 66 sin draw no mete river."
        },
      ],
      aiQuestions: [
        "¿Qué es un OESD fallido?",
        "¿Por qué AKo no raisea 982 sin draw?",
        "¿Cómo lo distingues de una escalera hecha?",
      ]
    },

    "R-14": {
      concept:
        "Semi-bluff (raise o donk con equity) que no mejora: en river es farol puro. Lee la historia de equity, no solo el showdown value.",
      theory: [
        {
          title: "Semi-bluff",
          body:
            "Raise flop con flush draw u OESD: tienes equity ahora y presión después; si no mejoras, el river es aire."
        },
        {
          title: "River blank",
          body:
            "Sin mejora, la mano es aire; igual puede apostar si la línea cuenta la historia del draw de flop y turn."
        },
        {
          title: "Merge vs polar",
          body:
            "M4 afina sizing merge frente a polar; aquí identifica primero el draw que murió en el river."
        },
      ],
      examples: [
        {
          title: "XR hearts fallido",
          body:
            "T9s check-raise con hearts y falla; AKo sin draw no raisea y TT flats sin set."
        },
        {
          title: "Float clubs fallido",
          body:
            "QJs float con clubs y bet river blank; AA betearía distinto y 77 sin draw no farolea river."
        },
        {
          title: "Donk draw fallido",
          body:
            "T8s donk con draw y falla; AKo sin draw no donkea y TT no mete tres calles sin completar."
        },
      ],
      aiQuestions: [
        "¿Qué es un semi-bluff?",
        "¿Cuándo un semi-bluff se vuelve farol puro?",
        "¿Qué manos no fabrican esa historia?",
      ]
    },

    "R-15": {
      concept:
        "Overbets y check-raises densifican polar: nuts o set frente a aire. El medio del rango (overpairs sticky) suele quedarse atrás.",
      theory: [
        {
          title: "Polar",
          body:
            "Pocas manos muy fuertes más faroles; pocos bluff-catchers en el medio del rango tras overbet o check-raise."
        },
        {
          title: "Overbet river",
          body:
            "Sizing grande empuja a value fuerte o aire, no a thin merge de pareja media que betea pequeño."
        },
        {
          title: "Blockers (puente R-16)",
          body:
            "Axs aparece como farol o nut flush: el blocker del palo cuenta; M3 cierra con R-16 de blockers."
        },
      ],
      examples: [
        {
          title: "XR K72",
          body:
            "KK set polar explica check-raise; AJo y TT no raisean K72 sin set ni equity clara."
        },
        {
          title: "Overbet A-high",
          body:
            "AKo polar value; QQ pot-controla sizing y 55 no overbetea river tras underpair."
        },
        {
          title: "Delayed overbet",
          body:
            "KJo delayed polar tras check-check; AA betearía flop y QTo sin J no overbetea turn y river."
        },
      ],
      aiQuestions: [
        "¿Qué es un rango polar?",
        "¿Qué sizing sugiere polar?",
        "¿Qué hace un overpair en esa línea?",
      ]
    },

    "R-16": {
      concept:
        "En monotone y two-tone, el as o rey del palo bloquea nuts y justifica value o farol. Sin el palo, el barrel de color es raro.",
      theory: [
        {
          title: "Blocker de nuts",
          body:
            "Ah en hearts: nut flush o farol que bloquea el nut del rival; cuenta combos eliminados antes de meter fichas."
        },
        {
          title: "Sin blocker ni flush",
          body:
            "KK sin heart no triple-barrela monotone como si tuviera color; pot-controla turn en vez de farolear el blank."
        },
        {
          title: "Enlace M4",
          body:
            "M4 mezcla boats, overbets y thin value; aquí clavas el blocker de color antes de afinar sizing."
        },
      ],
      examples: [
        {
          title: "Monotone hearts",
          body:
            "ATs nut flush barrela; KK y 88 sin heart no construyen triple barrel de color."
        },
        {
          title: "Raise spades",
          body:
            "KJs color con blocker de K; AQo rainbow y 99 sin spade no raisean monotone."
        },
        {
          title: "Slowplay clubs",
          body:
            "A8o flush tras check-check; AA betearía flop y QJo sin club no delayed barrela color."
        },
      ],
      aiQuestions: [
        "¿Qué combos quita el as del palo?",
        "¿Por qué KK sin flush no barrela monotone?",
        "¿Cuándo el blocker justifica farol?",
      ]
    },

    "R-17": {
      concept:
        "Boards double paired: boat frente a boat. La línea (raise, donk o lenta) distingue 99 de 44 y de overpairs que pot-controlan.",
      theory: [
        {
          title: "Double paired",
          body:
            "99 en 9944: boat que barrela tres calles; QQ sin boat pot-controla turn en vez de gritar full."
        },
        {
          title: "Boat lento",
          body:
            "Check turn y bet river: full que no grita; overpairs suelen betear turn y no eligen esa línea lenta."
        },
        {
          title: "Donk boat",
          body:
            "88 en 882: donk más presión; broadway sin 8 check-callearía y no lidera boat."
        },
      ],
      examples: [
        {
          title: "Triple barrel 9944",
          body:
            "99 boat sobre 44; QQ pot-controla y AJo sin 9 no barrela full."
        },
        {
          title: "Raise 773",
          body:
            "77 boat raisea flop paired; AKo sin 7 no raisea y JJ flats sin full."
        },
        {
          title: "Raise turn KK55",
          body:
            "55 boat raisea turn cuando parea el rey; AQo sin 5 no raisea turn."
        },
      ],
      aiQuestions: [
        "¿Cómo lees un board double paired?",
        "¿Qué hace un overpair sin boat?",
        "¿Boat lento vs boat gritado?",
      ]
    },

    "R-18": {
      concept:
        "Small-small-overbet y overbets sueltos: polar fino. El sizing cuenta tanto como la calle a la hora de asignar rango.",
      theory: [
        {
          title: "Small-small-overbet",
          body:
            "Ax nuts o farol; medias y underpairs no convierten c-bets pequeños en overbet de river."
        },
        {
          title: "Overbet tras float",
          body:
            "Qx fuerte o aire; AA raiseó antes y no elige float pasivo más overbet de river."
        },
        {
          title: "Donk grande + overbet",
          body:
            "Boat 88: el sizing grita polar; broadway sin 8 no donkea grande ni overbetea river."
        },
      ],
      examples: [
        {
          title: "Overbet A-high",
          body:
            "AKo tras small-small; QQ sizing medio y 55 no overbetea river underpair."
        },
        {
          title: "Float overbet Q",
          body:
            "QTo overbet value; AA raisearía antes y 77 sin Q no overbetea tras float."
        },
        {
          title: "XR grande + overbet",
          body:
            "JJ set con sizing polar; AKo sin pareja no check-raisea grande ese flop."
        },
      ],
      aiQuestions: [
        "¿Qué cuenta el sizing además de la calle?",
        "¿Quién no hace small-small-overbet?",
        "¿Overbet = siempre nuts?",
      ]
    },

    "R-19": {
      concept:
        "Bet pequeño river tras pot-control: thin value (Ax o Kx), no polar. Distínguelo del overbet de R-18 por el sizing.",
      theory: [
        {
          title: "Thin value",
          body:
            "Bet pequeño cobra peores pares y folds basura; no busca stacks enteros como el overbet polar."
        },
        {
          title: "Check turn + bet pequeño",
          body:
            "Ax thin clásico tras pot-control turn; KK suele betear turn y no elige esa línea de thin."
        },
        {
          title: "Vs overbet",
          body:
            "Si fuera polar, el sizing sería otro: aquí el bet pequeño señala value fino, no nuts o aire."
        },
      ],
      examples: [
        {
          title: "A8s thin",
          body:
            "Tras check turn en A-high; KK betearía turn y QJo sin as no cobra river thin."
        },
        {
          title: "JTo delayed thin",
          body:
            "Tras check-check flop; AA betearía flop y ATo sin J no delayed thin."
        },
        {
          title: "KJo thin barrels",
          body:
            "Sizing pequeño en K-high; QQ sizing distinto y 66 no barrela thin de Kx."
        },
      ],
      aiQuestions: [
        "¿Qué es thin value?",
        "¿Cómo lo distingues de un overbet polar?",
        "¿Qué hace KK en esa línea?",
      ]
    },

    "R-20": {
      concept:
        "Donk más check turn, XR más check turn más bet river, raise river: historias raras pero legibles. El combo correcto encaja en la rareza.",
      theory: [
        {
          title: "Donk + check turn",
          body:
            "Set que pisa el freno en scare card de turn y retoma presión en river; broadway sin set no donkea flop."
        },
        {
          title: "XR + check + bet",
          body:
            "Set que mezcla timing: raise flop, check turn y bet river; underpairs no fabrican esa rareza."
        },
        {
          title: "Raise river",
          body:
            "Dos pares o Kx fuerte que eligieron línea pasiva hasta el final; premiums check-check no llegan así."
        },
      ],
      examples: [
        {
          title: "Donk 982 + river",
          body:
            "99 donk raro y bet river tras check turn; AKo y JTs no donkean 982 sin conexión."
        },
        {
          title: "Delayed A-high",
          body:
            "AQo tras check-check flop; QQ betearía flop A-high y T8s sin as no delayed value."
        },
        {
          title: "Raise river Kx",
          body:
            "KQo raise river tras check flop; AA no checkea K-high y QJo sin K no raisea river."
        },
      ],
      aiQuestions: [
        "¿Por qué una línea rara sigue siendo legible?",
        "¿Qué descarta un donk en 982?",
        "¿Raise river vs bet river?",
      ]
    },

    "R-21": {
      concept:
        "Sizing medio = merge (value más algunos faroles), no solo polar extremo. Cierra el laboratorio leyendo merge frente a overbet y thin.",
      theory: [
        {
          title: "Merge",
          body:
            "Bet medio: Ax o Kx value y faroles mezclados; no solo nuts frente a aire como en overbet polar."
        },
        {
          title: "Vs polar (R-15/R-18)",
          body:
            "Overbet no es merge; thin pequeño tampoco: el sizing medio es la pista de rango merge."
        },
        {
          title: "Cierre de ruta",
          body:
            "Integra sets, colores, draws fallidos y boats con el sizing para asignar rango en vivo."
        },
      ],
      examples: [
        {
          title: "Merge A-high",
          body:
            "AJo bet medio tres calles; QQ pot-controla distinto y 55 no barrela merge underpair."
        },
        {
          title: "Merge float Q",
          body:
            "QJo float y bet medio; AA raisearía antes y 77 sin Q no mete river merge."
        },
        {
          title: "Merge XR set",
          body:
            "JJ raise flop y bet medio; AKo sin J no raisea y 88 underpair no polariza flop."
        },
      ],
      aiQuestions: [
        "¿Qué es un rango merge?",
        "¿Cómo lo distingues de polar y thin?",
        "¿Qué sizing esperas en merge?",
      ]
    },

  }
};
