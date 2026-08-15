'use strict';

/**
 * Contenido pedagógico — Laboratorio de Rangos R-01…R-06.
 * Solo concept / theory / examples / aiQuestions (sin route, plan, xp…).
 * Voz: profesor ES-ES; glosar término la 1ª vez; «hacer call»; «limpear».
 */
module.exports = {
  lessons: {
    'R-01': {
      concept:
        'Antes de memorizar un open, aprende a leer la matriz 13×13 del menú Rangos: cada celda es una mano y el color o el % te dice con qué frecuencia se juega.',
      theory: [
        {
          title: 'Qué es la matriz',
          body:
            'La matriz (o range chart) es una cuadrícula de 13 filas × 13 columnas con los ranks de A a 2. Cada celda representa una combinación de dos cartas. Ábrela en el menú Rangos de la app: ahí verás RFI, defensa y más por posición, no solo un dibujo estático.'
        },
        {
          title: 'Suited, offsuit y pares',
          body:
            'Los pares (AA, KK… 22) viven en la diagonal. Las manos suited (mismo palo, p. ej. AKs) suelen estar a un lado de la diagonal; las offsuit (palos distintos, AKo) al otro. Localiza primero AA y 72o: si no sabes dónde caen, aún no “lees” el chart.'
        },
        {
          title: 'Frecuencias, no solo sí/no',
          body:
            'Un color o un porcentaje en la celda indica frecuencia: no todo es “siempre open” o “nunca”. Una mano al 40 % se mezcla (a veces se juega, a veces no). Compara RFI BTN con RFI UTG en el menú Rangos: el botón es mucho más wide (más manos).'
        }
      ],
      examples: [
        {
          title: 'Localizar tres celdas',
          body:
            'En el menú Rangos, RFI BTN: encuentra 99 (diagonal), ATs (suited) y KJo (offsuit). Si las tres te salen a la primera, ya orientas la matriz.'
        },
        {
          title: 'BTN vs UTG a simple vista',
          body:
            'Mismo chart tipo RFI: UTG tiene pocas celdas “encendidas”; BTN muchas más. El mensaje del profesor: posición late = rango más ancho, no “cualquier dos”.'
        },
        {
          title: 'Leer un %',
          body:
            'Si K9s aparece al 65 %, no es “siempre open”: en dos de cada tres veces se abre y en una se fold. El chart habla en frecuencias, no en absolutos.'
        }
      ],
      aiQuestions: [
        '¿Dónde están los pares en la matriz 13×13?',
        '¿Qué diferencia visual ves entre RFI BTN y RFI UTG en el menú Rangos?',
        '¿Qué significa un porcentaje en una celda?'
      ]
    },

    'R-02': {
      concept:
        'Construir el RFI del botón en sesenta segundos no es memorizar píxeles: es tener bandas mentales (pares, broadway, suited connectors) y luego contrastarlas con el menú Rangos.',
      theory: [
        {
          title: 'Qué es RFI BTN',
          body:
            'RFI (raise first in) es subir primero el bote cuando nadie ha entrado. Desde BTN (botón) tu rango de open es el más wide de las posiciones late: muchas manos tienen fold equity (posibilidad de que todos tiren) y, si hacen call, juegas el flop en posición.'
        },
        {
          title: 'Bandas en 60 segundos',
          body:
            'Cronómetro: di en voz alta categorías, no celdas sueltas. Ejemplo de mapa: 22+, A2s+, ATo+, K9s+, KTo+, QTs+, J9s+, T8s+, 98s–65s, y algunas suited gapers. Luego abre el menú Rangos y marca qué te faltó o qué sobró.'
        },
        {
          title: 'Trampa del “cualquier dos”',
          body:
            'Wide no significa limpear (igualar la ciega grande para entrar) ni openear 72o “porque soy botón”. El objetivo es un mapa usable bajo presión, no un permiso para spew. Si no puedes nombrar bandas, no tienes rango: solo intuición.'
        }
      ],
      examples: [
        {
          title: 'Drill de un minuto',
          body:
            'Cierra los ojos: “Pares todos; ases suited casi todos; broadway offsuit selectivo; conectores suited medios.” Abre el chart RFI BTN y anota tres manos que olvidaste.'
        },
        {
          title: 'Contraste con CO',
          body:
            'Repite el drill para CO: verás menos manos (más tight). Si tu mapa mental BTN y CO son idénticos, aún no discriminas por posición.'
        },
        {
          title: 'Manos frontera',
          body:
            'K9o, Q8s, 54s: ¿dentro o fuera de tu banda BTN? Decide en cinco segundos y comprueba el % en el menú Rangos. Ahí se entrena el borde del rango, no solo el centro.'
        }
      ],
      aiQuestions: [
        '¿Qué bandas nombrarías en 60 s para RFI BTN?',
        '¿Por qué wide en BTN no autoriza openear basura total?',
        '¿Cómo usas el menú Rangos después del drill mental?'
      ]
    },

    'R-03': {
      concept:
        'Dado un flop, estima qué porcentaje del rango rival conectó pareja, proyecto o aire: la textura decide la ventaja de rango y, con ella, tu plan de c-bet.',
      theory: [
        {
          title: 'Conectar un board',
          body:
            '“Qué % del rango conecta” pregunta cuántas combinaciones del rango preflop mejoraron a pareja, dos pares, trío, straight/flush draw, etc. No hace falta un solver: piensa en categorías. Un rango BTN wide en K♠7♦2♣ rainbow conecta top pair menos que en J♥T♥9♦.'
        },
        {
          title: 'Textura y range advantage',
          body:
            'La textura (seco, wet, monotone) cambia quién “encaja” mejor. Range advantage (ventaja de rango) significa que tu distribución de manos fuertes supera a la del rival en ese board. En A-high seco el agresor RFI suele tener ventaja; en bajos conectados el caller recupera mucho.'
        },
        {
          title: 'Enlace con el c-bet',
          body:
            'Si tu rango conecta más (o el rival falla más), el c-bet (apuesta de continuación tras haber subido preflop) tiene más sentido, a menudo a sizing pequeño. Si el board favorece al que solo hizo call, reduces frecuencia y cedes más. Enlace directo con Cash M2 (C-14…C-16).'
        }
      ],
      examples: [
        {
          title: 'BTN wide en K72r',
          body:
            'Rango de open BTN vs BB. Flop K♠7♦2♣: muchas manos del BB fallan; tú tienes Ax, Kx y overpairs. Estimas: rival conectó poco → c-bet frecuente.'
        },
        {
          title: 'Mismo rango en JT9',
          body:
            'Flop J♥T♠9♦: el BB con suited connectors y broadway media conecta draws y pares fuertes. Tu ventaja se reduce → menos autocbet, más selectividad.'
        },
        {
          title: 'Pregunta de profesor',
          body:
            'Antes de pulsar bet: “¿Este board ayuda más a mi rango de agresor o al de defensa?” Si no sabes responder, aún no estimaste el % que conectó.'
        }
      ],
      aiQuestions: [
        '¿Cómo cambia el % que conecta un rango wide entre K72r y JT9?',
        '¿Qué es range advantage en una frase?',
        '¿Cómo enlazas esa estimación con tu frecuencia de c-bet?'
      ]
    },

    'R-04': {
      concept:
        'Tus cartas quitan combinaciones del rango rival: eso son blockers. Contar qué combos eliminas cambia cuándo faroleas y cuándo haces call con bluff-catchers.',
      theory: [
        {
          title: 'Blockers = eliminación de combos',
          body:
            'Un combo es una combinación concreta (p. ej. A♠K♥). Si tú tienes el A♠, el rival ya no puede tener AA con ese as ni AKs del palo de picas. Blockers (bloqueadores) son tus cartas vistas que reducen las manos fuertes o los bluff-catchers del villano.'
        },
        {
          title: 'Faroles con buen blocker',
          body:
            'Por eso Axs (as suited) aparece mucho como farol de 3-bet o de river: bloqueas AA y AKx del mismo palo y a menudo tienes equity de respaldo. Antes de farolear, pregunta: “¿qué combos de value quito? ¿qué bluff-catchers dejo vivos?”'
        },
        {
          title: 'Trampa sin blockers',
          body:
            'Farolear river en boards pesados sin blocker de nuts (la mejor mano posible) es spew frecuente: dejas intactas las manos que te pagan y las que te ganan. Practica en voz alta: “quito X, no quito Y” antes de meter fichas.'
        }
      ],
      examples: [
        {
          title: '3-bet farol con A5s',
          body:
            'Vs open BTN, A♠5♠: bloqueas AA y muchos AKo/AKs de picas. El farol tiene historia; K9o offsuit no bloquea lo mismo y suele ser peor candidato (enlace con C-08).'
        },
        {
          title: 'River: as de picas en board de color',
          body:
            'Board con tres picas; tú tienes A♠x sin color. Bloqueas la nuts de color: a veces farol o semi-farol tiene más sentido que con 7♦6♣, que no bloquea nada relevante.'
        },
        {
          title: 'Bluff-catcher y blockers',
          body:
            'Con Kx en un river donde el rival apuesta polar, tener el as del palo del flush posible puede justificar hacer call: reduces combos de color value y dejas más faroles en su rango.'
        }
      ],
      aiQuestions: [
        '¿Qué combos quita A♠X del rango rival?',
        '¿Por qué Axs es farol frecuente de 3-bet?',
        '¿Qué pregunta te haces antes de farolear un river?'
      ]
    },

    'R-05': {
      concept:
        'Tras una línea completa (preflop → river), no pongas al rival en “una mano”: recorta su rango calle a calle y acaba preguntándote qué combos siguen vivos.',
      theory: [
        {
          title: 'Cada calle elimina manos',
          body:
            'Asignar rango es ir capeando (recortando) combinaciones imposibles en cada calle. Quien hace open RFI no tiene 72o. Quien hace call a un c-bet en flop seco ya no es el RFI entero. Quien apuesta river tras tres calles de agresión densifica value y faroles creíbles; muchas medias sticky ya se quedaron atrás.'
        },
        {
          title: 'Lee la línea, luego elige un combo',
          body:
            'Ejercicio de profesor: narra preflop → flop → turn → river en voz alta. En el river lista 2–3 manos tipo de value, 2–3 medias y 2–3 aires que llegan a esa línea. Luego elige UN combo concreto que sobreviva. Si solo puedes imaginar la nuts que te gana, estás sesgado.'
        },
        {
          title: 'Quiz final: ¿qué crees que tiene?',
          body:
            'Antes de ver las cartas del villano, elige entre tres manos creíbles de preflop: la que encaja con toda la línea y dos que abren/defienden pero mueren en flop, turn o river (check-check que elimina AA, pot-control que saca underpairs, etc.). Si solo descartas basura de open, el ejercicio es demasiado fácil.'
        }
      ],
      examples: [
        {
          title: 'Triple barrel en A-high seco',
          body:
            'BTN open, BB call, flop check-call, turn check-call, river bet. El BTN en river ya no es el RFI entero: se densificó en Ax value y algunos faroles con blockers; 72o nunca abrió y muchas basuras checkearon atrás en turn.'
        },
        {
          title: 'Check-raise en flop',
          body:
            'BB check-raisea un c-bet en board seco. Historia típica: sets, dos pares, a veces faroles con blockers. QJ sin pareja queda fuera del value; no digas “me tiene AK” sin mirar la línea.'
        },
        {
          title: 'Drill de tres opciones',
          body:
            'Al final de cada mano de práctica verás tres combos. Pregunta: ¿cuál sigue vivo tras open + call flop + bet turn + bet river? Las otras dos deben tener una frase de descarte clara.'
        }
      ],
      aiQuestions: [
        '¿Qué manos elimina un check-raise de flop del rango “solo call”?',
        '¿Cómo evitas poner al rival siempre en la nuts tras un river bet?',
        'Antes de ver las cartas del villano, ¿qué pregunta te haces?'
      ]
    },

    'R-06': {
      concept:
        'En un nodo GTO las acciones suelen mezclarse: bet 70 / check 30 no es indecisión, es frecuencia. Entender el mix te evita exigir “siempre” o “nunca”.',
      theory: [
        {
          title: 'Frecuencias de nodo',
          body:
            'Un nodo es un punto de decisión (p. ej. c-bet flop IP en A72r). GTO (game theory optimal) asigna frecuencias: la misma mano o el mismo rango puede apostar a veces y checkear otras. El chart del menú Rangos o del solver habla en %; tú en mesa eliges una acción concreta.'
        },
        {
          title: 'Node locking mental',
          body:
            'Node locking mental es decirte: “aquí el mix sano es ~70 % bet / 30 % check” aunque en esta mano ejecutes solo una línea. Sirve para no tiltar cuando el chart “a veces checkea” con una mano que tú siempre apostarías, y para no rigidizar spots que el solver mezcla.'
        },
        {
          title: 'Trampa del 100 % o 0 %',
          body:
            'Exigir pure strategies (siempre bet o siempre check) en todos los spots te pelea con el mix. En live/online eliges una acción; en estudio respetas que el equilibrio a menudo es frecuencia. Enlace natural con C-30 en Pro Cash.'
        }
      ],
      examples: [
        {
          title: 'C-bet 70 / check 30',
          body:
            'Flop seco IP: el nodo puede mandar c-bet ~70 %. Tú con KQo apuestas esta mano; la próxima vez similar podrías checkear otra combinación. El estudio enseña el mix; la mesa ejecuta una muestra.'
        },
        {
          title: 'Misma mano, dos frecuencias',
          body:
            'A5s en un 3-bet: a veces value/pressure, a veces fold vs 4-bet. No es contradicción: son nodos distintos con frecuencias distintas según el tamaño y la posición.'
        },
        {
          title: 'Frase de mesa',
          body:
            'En vez de “siempre c-bet”, di “aquí c-beteo la mayoría”. Ese lenguaje de frecuencias es el puente entre el laboratorio de rangos y el juego real.'
        }
      ],
      aiQuestions: [
        '¿Qué significa bet 70 / check 30 en un nodo?',
        '¿Para qué sirve el node locking mental si en mesa solo eliges una acción?',
        '¿Por qué es un error exigir 100 % o 0 % en todos los spots?'
      ]
    }
  }
};
