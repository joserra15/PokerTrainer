'use strict';

/**
 * Contenido pedagógico — Laboratorio de Rangos R-01…R-21.
 * Voz: profesor ES-ES; «hacer call»; «limpear».
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
        "Tras una línea completa, no adivines “una mano”: recorta el rango calle a calle y elige el combo que todavía encaja. En la práctica verás sets, colores, escaleras y faroles mezclados — la pista está en la línea, no en el título.",
      theory: [
        {
          title: "Cada calle elimina combos",
          body:
            "Open, call, check-check, raise o barrel van sacando manos del rango. Narra preflop → river antes de elegir el combo."
        },
        {
          title: "Tres opciones creíbles",
          body:
            "Las tres abren o defienden preflop; solo una sobrevive a toda la línea. Las otras mueren en flop, turn o river."
        },
        {
          title: "Sin atajos de categoría",
          body:
            "No busques “la respuesta típica de esta lección”: el villano puede tener valor hecho o aire con historia creíble."
        },
      ],
      examples: [
        {
          title: "Drill de voz alta",
          body:
            "Di: “¿qué value llega? ¿qué medias se fueron? ¿qué faroles quedan?” Luego elige un combo concreto."
        },
        {
          title: "Check-check que habla",
          body:
            "Un premium que checkea flop A-high casi siempre miente: esa calle ya eliminó AA o KK en muchos spots."
        },
        {
          title: "Raise polar",
          body:
            "Un check-raise de flop no es “cualquier Ax”: densifica sets, dos pares y algunos faroles con equity."
        },
      ],
      aiQuestions: [
        "¿Qué elimina un check-check de flop?",
        "¿Por qué las tres opciones deben ser creíbles preflop?",
        "¿Qué preguntas te haces antes de elegir?",
      ]
    },

    "R-08": {
      concept:
        "Misma mecánica que Lectura I: línea completa + quiz. Sigue mezclando value y faroles. Entrena a descartar con una frase clara por calle.",
      theory: [
        {
          title: "Frase de descarte",
          body:
            "Cada opción incorrecta necesita un motivo postflop (“pot-controla turn”, “no raisea sin set”). Si solo dices “no abre”, el ejercicio es demasiado fácil."
        },
        {
          title: "Value vs media",
          body:
            "Tras tres calles de presión, las medias sticky suelen haberse quedado atrás; densificas value y faroles creíbles."
        },
        {
          title: "Board + línea",
          body:
            "La textura importa, pero la secuencia de acciones importa más: el mismo board admite dos historias distintas según la línea."
        },
      ],
      examples: [
        {
          title: "Triple barrel seco",
          body:
            "Ax value o farol con plan; underpair pot-controla turn y no mete tres calles por valor."
        },
        {
          title: "Delayed barrel",
          body:
            "Check flop + bet turn: a menudo Kx o Qx que no quiso c-bet; AA casi nunca checkea ese flop."
        },
        {
          title: "Float + bet river",
          body:
            "Pasivo dos calles y presión final: dos pares o farol polar, rara vez overpair puro que raisearía antes."
        },
      ],
      aiQuestions: [
        "¿Qué es una frase de descarte útil?",
        "¿Qué densifica un triple barrel?",
        "¿Qué elimina AA del check-check?",
      ]
    },

    "R-09": {
      concept:
        "Sube la precisión: mismas reglas, combos más finos. Sigue sin tipificar la lección — mira la línea, no el módulo.",
      theory: [
        {
          title: "Combos, no etiquetas",
          body:
            "“Tiene color” es vago; “K♠J♠ en monotone” es un combo que puedes confrontar con blockers y con las acciones de cada calle."
        },
        {
          title: "Blockers ligeros",
          body:
            "Tus cartas quitan combos del villano. Úsalos al final del razonamiento, no como primera pista del quiz."
        },
        {
          title: "Historia creíble",
          body:
            "Si la línea es donk más barrel, el combo debe querer liderar ese flop; si no tiene motivo, descártalo."
        },
      ],
      examples: [
        {
          title: "Donk + barrels",
          body:
            "Liderar flop y seguir: fuerte hecho o semi-bluff con plan; broadway sin conexión no donkea."
        },
        {
          title: "Raise flop + presión",
          body:
            "Polar: hecho fuerte o equity clara; underpair casi nunca raisea ese flop por value."
        },
        {
          title: "Check turn + bet river",
          body:
            "Thin value o farol delayed; overpair suele haber betado turn en vez de pot-controlar."
        },
      ],
      aiQuestions: [
        "¿Por qué hablar en combos ayuda?",
        "¿Cuándo miras blockers?",
        "¿Qué manos donkean un flop seco?",
      ]
    },

    "R-10": {
      concept:
        "Sigue el drill de tres opciones. La dificultad sube porque los distractores también “casi” encajan hasta una calle concreta.",
      theory: [
        {
          title: "Distractores duros",
          body:
            "La mala opción abre BTN y c-betea flop, pero muere en turn: ahí está el entrenamiento de lectura de línea."
        },
        {
          title: "Scare cards",
          body:
            "Un as o un blank cambia qué value barrela y qué farol se rinde; incorpóralo a tu narración de la línea."
        },
        {
          title: "No ancles la nuts",
          body:
            "Si solo imaginas la mano que te gana, estás sesgado: lista value, medias y aires antes de elegir."
        },
      ],
      examples: [
        {
          title: "Blank river",
          body:
            "Pregunta quién sigue metiendo presión sin mejorar y quién se habría quedado atrás en turn."
        },
        {
          title: "Parea el board",
          body:
            "Fulls y pot-control: la línea distingue boat de overpair que no quiere meter tres calles."
        },
        {
          title: "Connected board",
          body:
            "Escalera hecha vs draw que falla: la acción del river y si completa el board lo dicen."
        },
      ],
      aiQuestions: [
        "¿Qué hace duro a un distractor?",
        "¿Cómo usas una scare card?",
        "¿Cómo evitas anclarte a la nuts?",
      ]
    },

    "R-11": {
      concept:
        "Cierre de M2: consolida el método. En M3 los faroles de draw fallido y el polar serán más frecuentes — el método no cambia.",
      theory: [
        {
          title: "Método en 20 s",
          body:
            "1) Narra la línea 2) Lista 2–3 value 3) Lista 2–3 faroles 4) Elige un combo 5) Descarta las otras dos con una frase."
        },
        {
          title: "Puente a M3",
          body:
            "Cuando el color o la escalera no llegan, la misma línea puede ser farol: no asumas siempre value hecho."
        },
        {
          title: "Autocheck",
          body:
            "Si tu respuesta “solo encaja porque es esta lección”, está mal planteada: la pista debe salir de la línea."
        },
      ],
      examples: [
        {
          title: "Repaso mixto",
          body:
            "Sets, colores, escaleras y dos pares aparecen mezclados en el mismo bloque de práctica a propósito."
        },
        {
          title: "Misma línea, otra textura",
          body:
            "Cambia el board mentalmente: ¿sigue vivo tu combo con esa historia de acciones?"
        },
        {
          title: "Tres calles vs dos",
          body:
            "Menos agresión deja más medias en el rango; más agresión densifica polar value y faroles."
        },
      ],
      aiQuestions: [
        "¿Cuáles son los 5 pasos del método?",
        "¿Qué cambia si el draw no completa?",
        "¿Cómo detectas un atajo de lección?",
      ]
    },

    "R-12": {
      concept:
        "Misma pregunta, más faroles creíbles: draws que no completan, semi-bluffs y presión que se queda en aire. El título no te dice qué buscar.",
      theory: [
        {
          title: "Equity que muere",
          body:
            "Quien raisea flop con draw y barrela river blank a menudo farolea: la historia era equity, no showdown value."
        },
        {
          title: "Value que sigue",
          body:
            "Hechos fuertes también barrela blank. Distingue por líneas previas (raise polar vs call sticky sin equity)."
        },
        {
          title: "Sin spoiler de módulo",
          body:
            "Mezclamos hechos y faroles a propósito: lee la línea, no el temario del módulo."
        },
      ],
      examples: [
        {
          title: "Raise + blank",
          body:
            "Semi-bluff fallido vs set: pregunta quién raisea ese flop por value o por equity."
        },
        {
          title: "Triple barrel two-tone",
          body:
            "Flush hecho vs flush draw fallido: mira si el river completa el palo o no."
        },
        {
          title: "Float + bet",
          body:
            "Aire con historia o dos pares: mira si en flop/turn había plan de equity o showdown."
        },
      ],
      aiQuestions: [
        "¿Qué es equity que muere?",
        "¿Cómo distingues farol de value en blank?",
        "¿Por qué el módulo no tipifica la mano?",
      ]
    },

    "R-13": {
      concept:
        "Más presión en river y sizing que polariza. Sigue descartando con frases postflop, no con “no abre”.",
      theory: [
        {
          title: "Sizing como pista",
          body:
            "Overbet suele ser polar (fuerte o aire); bet pequeño suele ser thin o merge. No es regla absoluta: contrástalo con la línea previa."
        },
        {
          title: "Blockers en polar",
          body:
            "El as del palo reduce nuts de color: a veces justifica farol o call. Úsalo al final del razonamiento."
        },
        {
          title: "Medias fuera",
          body:
            "Tras tres calles grandes, QJ sin pareja rara vez llega: el rango se polarizó y las medias se fueron."
        },
      ],
      examples: [
        {
          title: "Overbet river",
          body:
            "Nuts o set o aire; overpair medio encaja peor en overbet que en bet medio."
        },
        {
          title: "Check-raise + barrels",
          body:
            "Polar clásico de value fuerte o farol con equity; underpair no raisea flop así."
        },
        {
          title: "Delayed overbet",
          body:
            "Check flop + overbet tarde: value específico o farol raro — AA casi no checkea."
        },
      ],
      aiQuestions: [
        "¿Qué sugiere un overbet?",
        "¿Cuándo entran los blockers?",
        "¿Qué pasa con las medias sticky?",
      ]
    },

    "R-14": {
      concept:
        "Distractores más pegados: las dos malas opciones también tienen historia hasta turn. El river decide.",
      theory: [
        {
          title: "Muere en river",
          body:
            "La opción mala c-betea y barrela turn, pero el river blank no justifica su bet final: ahí la descartas."
        },
        {
          title: "Hecho vs fallido",
          body:
            "Misma línea aparente: una completa el color o la escalera, la otra no. Lee el board final con cuidado."
        },
        {
          title: "No inventes",
          body:
            "Si no puedes explicar por qué ese combo apuesta river tras esa línea, no lo elijas."
        },
      ],
      examples: [
        {
          title: "OESD fallido",
          body:
            "Raise flop connected + river blank: farol con historia de escalera que no llegó."
        },
        {
          title: "Flush fallido",
          body:
            "Two-tone + blank: farol o color hecho según si el river completa el palo."
        },
        {
          title: "Set lento",
          body:
            "Check flop + presión tarde: ¿slowplay de set o delayed farol? La calle intermedia decide."
        },
      ],
      aiQuestions: [
        "¿Qué significa “muere en river”?",
        "¿Cómo lees un blank final?",
        "¿Qué te exige explicar un combo?",
      ]
    },

    "R-15": {
      concept:
        "Consolida polar: value fuerte, faroles con historia, medias fuera. Preparación de M4 (sizing fino y líneas raras).",
      theory: [
        {
          title: "Lista polar",
          body:
            "Antes de elegir: anota 2 value fuertes y 2 faroles con equity previa. Si no sales, estás anclado a una sola mano."
        },
        {
          title: "Call ≠ raise",
          body:
            "Defender BB no autoriza check-raise sin set o draw: esa es la trampa clásica del distractor."
        },
        {
          title: "Puente a M4",
          body:
            "En M4 el sizing y las líneas raras afinarán el mismo método de narrar y descartar calle a calle."
        },
      ],
      examples: [
        {
          title: "XR flop seco",
          body:
            "Set o farol con equity; AKo limpio sin pareja no check-raisea ese flop por value."
        },
        {
          title: "Donk + presión",
          body:
            "Hecho que quiere liderar o draw con plan; broadway sin conexión no donkea flop."
        },
        {
          title: "Small-small-overbet",
          body:
            "Polar fino: Ax fuerte o farol; underpair no convierte c-bets pequeños en overbet."
        },
      ],
      aiQuestions: [
        "¿Cómo armas una lista polar?",
        "¿Por qué call no implica raise?",
        "¿Qué añade M4 al método?",
      ]
    },

    "R-16": {
      concept:
        "Cierre M3: mezcla final de hechos y faroles. Si aciertas sin mirar la línea, estás usando atajos — cámbialo.",
      theory: [
        {
          title: "Autocheck anti-atajo",
          body:
            "Pregúntate: “¿lo elegí porque la línea lo dice o porque en esta lección suele ser X?” Solo vale lo primero."
        },
        {
          title: "Resumen de descartes",
          body:
            "Practica decir en una frase por qué mueren las dos opciones incorrectas antes de revelar."
        },
        {
          title: "Listo para M4",
          body:
            "Boats, thin value y líneas raras: misma pregunta del quiz, más sutileza en sizing y timing."
        },
      ],
      examples: [
        {
          title: "Repaso mixto M3",
          body:
            "Draws fallidos, colores, polar y algún hecho claro aparecen mezclados a propósito."
        },
        {
          title: "Una frase cada una",
          body:
            "Escribe mentalmente el descarte de las opciones b y c antes de pulsar tu respuesta."
        },
        {
          title: "Tempo de spot",
          body:
            "20–30 s por spot: narra la línea, lista value y faroles, elige un combo."
        },
      ],
      aiQuestions: [
        "¿Qué es un atajo de lección?",
        "¿Cómo resumes un descarte?",
        "¿Qué cambia en M4?",
      ]
    },

    "R-17": {
      concept:
        "Boats, thin value y líneas raras mezclados con faroles. El sizing y el timing cuentan tanto como la categoría de mano.",
      theory: [
        {
          title: "Sizing + timing",
          body:
            "Bet pequeño tras check turn no es lo mismo que overbet tras check-raise. Misma “presión”, distinto rango implicado."
        },
        {
          title: "Double paired",
          body:
            "Boat vs overpair: quien barrela tres calles suele tener el full, no solo KK sin boat."
        },
        {
          title: "Líneas raras",
          body:
            "Donk + check turn + bet river sigue siendo legible si el combo quiere esa historia de timing."
        },
      ],
      examples: [
        {
          title: "Boat lento",
          body:
            "Check turn + bet river en double paired: full que no grita; overpair suele betear turn."
        },
        {
          title: "Thin pequeño",
          body:
            "Ax thin tras pot-control; no es polar de overbet ni farol sin historia."
        },
        {
          title: "Donk raro",
          body:
            "Lidera flop, frena en scare card y retoma river: set o hecho que mezcla timing."
        },
      ],
      aiQuestions: [
        "¿Qué aporta el sizing?",
        "¿Cómo lees double paired?",
        "¿Cuándo una línea rara es legible?",
      ]
    },

    "R-18": {
      concept:
        "Más sutileza: merge vs polar, thin vs farol. Sigue sin tipificar — el quiz mezcla todo a propósito.",
      theory: [
        {
          title: "Merge",
          body:
            "Bet medio: value más algunos faroles. Ni overbet polar extremo ni thin mínimo de una sola calle."
        },
        {
          title: "Thin value",
          body:
            "Cobra peores pares y no busca stacks. Si el sizing es pequeño tras pot-control, piensa thin value."
        },
        {
          title: "Farol con historia",
          body:
            "Sin equity ya en river, pero la línea previa (draw o raise) hace creíble el farol."
        },
      ],
      examples: [
        {
          title: "Bet medio tres calles",
          body:
            "Merge de Ax o Kx con algunos faroles; no es overbet de nuts."
        },
        {
          title: "Overbet vs thin",
          body:
            "Compara sizing en spots similares: el tamaño cambia el rango que asignas."
        },
        {
          title: "Raise river",
          body:
            "Pasivo hasta el final y raise: fuerte específico, no media sticky sin motivo."
        },
      ],
      aiQuestions: [
        "¿Qué es merge?",
        "¿Cómo distingues thin de polar?",
        "¿Qué pide un raise river?",
      ]
    },

    "R-19": {
      concept:
        "Distractores casi perfectos hasta river. Una sola calle o un sizing te da el descarte correcto.",
      theory: [
        {
          title: "Una calle decide",
          body:
            "Las tres opciones llegan a turn; solo una justifica el river. Ahí está el descarte fino."
        },
        {
          title: "Pot-control vs presión",
          body:
            "Overpair que pot-controla no se convierte de pronto en overbet sin scare card clara."
        },
        {
          title: "No fuerces el combo",
          body:
            "Si tu combo “podría” pero no “quiere” esa línea, descártalo: la historia debe ser natural."
        },
      ],
      examples: [
        {
          title: "Casi set",
          body:
            "Underpair que flats no es set que raisea flop: el raise polar lo distingue."
        },
        {
          title: "Casi flush",
          body:
            "Draw fallido vs color hecho: el board final dice si el palo completó."
        },
        {
          title: "Casi thin",
          body:
            "Farol que imita thin sizing: mira si había equity previa que justifique la presión."
        },
      ],
      aiQuestions: [
        "¿Qué significa que una calle decide?",
        "¿Cuándo pot-control elimina un combo?",
        "¿Qué es “quiere” la línea?",
      ]
    },

    "R-20": {
      concept:
        "Líneas raras y boats finos. El método de M2 sigue siendo la base aunque el sizing sea más sutil.",
      theory: [
        {
          title: "Vuelve al método",
          body:
            "Narra la línea, lista value y faroles, elige un combo y descarta las otras dos con una frase clara."
        },
        {
          title: "Timing mixto",
          body:
            "Check-raise flop + check turn + bet river: set que mezcla timing, no AKo sin pareja."
        },
        {
          title: "Boat vs boat",
          body:
            "En double paired, la agresión suele ser el boat alto o el de la pareja del flop, no un overpair limpio."
        },
      ],
      examples: [
        {
          title: "XR + check + bet",
          body:
            "Set con timing raro: raisea flop, frena turn y cobra river."
        },
        {
          title: "Donk turn",
          body:
            "Cambia quién lidera a mitad de mano: el combo debe querer ese donk de turn."
        },
        {
          title: "Full house",
          body:
            "Línea lenta o gritada: ambas posibles; mira check-turn vs triple barrel."
        },
      ],
      aiQuestions: [
        "¿Cuál es el método base?",
        "¿Qué sugiere XR más check más bet?",
        "¿Cómo piensas boat vs boat?",
      ]
    },

    "R-21": {
      concept:
        "Cierre de la ruta Rangos: quiz mixto de máxima sutileza. Si enganchas, es porque lees la línea — no porque el título spoilera la categoría.",
      theory: [
        {
          title: "Enganche real",
          body:
            "El juego es “¿qué combo sobrevive?”. La teoría solo te da el método; la práctica es el reto sin pistas de temario."
        },
        {
          title: "Sin pistas de temario",
          body:
            "Aquí hay boats, thin, faroles y hechos claros mezclados a propósito para que no adivines por el módulo."
        },
        {
          title: "Siguiente nivel",
          body:
            "Repite spots fallados: escribir el descarte de la opción incorrecta es el aprendizaje que queda."
        },
      ],
      examples: [
        {
          title: "Bloque final mixto",
          body:
            "Todo tipo de manos en un solo tramo de práctica: el método unifica el bloque."
        },
        {
          title: "Revisa fallos",
          body:
            "Relee la frase de eliminación de la opción que elegiste mal y vuelve a narrar la línea."
        },
        {
          title: "Comparte sin spoiler",
          body:
            "Usa el botón de compartir: reta a un amigo con la imagen sin revelar la respuesta."
        },
      ],
      aiQuestions: [
        "¿Qué hace enganchar el quiz?",
        "¿Por qué mezclamos categorías?",
        "¿Cómo usas un fallo para aprender?",
      ]
    },

  }
};
