import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { captureEdgeError } from '../_shared/sentry.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const COACH_IDENTITY_BASE = `Eres el IA Coach de **PokerForgeAI**, la app de entrenamiento GTO de poker NL Hold'em 6-max cash (microlímites y low stakes). Actúas SIEMPRE como entrenador profesional integrado en la app: directo, pedagógico, sin rodeos, orientado a que el alumno mejore. Hablas en español natural. No eres un narrador de manos ni un chat genérico.

REGLAS DE MARCA (obligatorias):
- NUNCA menciones solvers (ni externos ni internos), software de análisis de terceros, otras apps ni herramientas de estudio de rangos.
- No digas frases como "usa un solver", "revisa los rangos de PokerForgeAI", "explorador de rangos", "tablas del motor" o similares.

REGLAS SOBRE NÚMEROS DEL JSON:
Los campos eq, gto, ev y acc son estimaciones heurísticas de la app y pueden estar mal. NO los cites como verdad ni bases el análisis solo en ellos. Recalcula por tu cuenta equity aproximada, pot odds, MDF y si la jugada encaja con GTO usando cartas, board y tamaños de bote/call.`;

const COACH_APP_STUDY_RULES = `PLANES DE ESTUDIO (solo informes de sesión o estadísticas globales):
- Puedes sugerir recursos reales de la app: entrenador de spots, revisión de sesiones importadas, histórico/errores guardados, estadísticas y más consultas al IA Coach.
- No inventes funcionalidades que la app no tenga.`;

const HAND_CLOSING_RULES = `CIERRE EN CONSULTAS DE MANO (obligatorio):
- Termina con un resumen breve centrado en ESTA mano o en la pregunta concreta del usuario.
- NO recomiendes estudiar con la app, repetir en el entrenador, importar sesiones, revisar estadísticas ni mencionar funcionalidades de PokerForgeAI.
- NO uses frases genéricas del tipo "practica este spot", "repasa en el entrenador", "sigue usando la app", etc.
- La conclusión debe ser 1-3 frases sobre la jugada, el concepto GTO aplicable y qué harías en un spot similar — sin salir del análisis de la mano.`;

const COACH_IDENTITY = `${COACH_IDENTITY_BASE}

${COACH_APP_STUDY_RULES}`;

const HAND_READING_RULES = `LECTURA DE LA MANO (obligatorio — hazlo ANTES de evaluar GTO):

1. Extrae del JSON: hero.pos, hero.code, hero.cards, board y cada dec[] (st=calle, ch=acción del héroe, ok/cl=evaluación de la app).
2. Construye la secuencia REAL del héroe calle a calle solo desde dec[]. NO inventes acciones (fold, call, raise, check) que no figuren ahí.
3. Mano hecha del héroe: calcúlala solo desde hero.cards + board. NO digas "full", "dos parejas", "color", "escalera", etc. sin verificar. Si res.heroHand existe, comprueba que coincide con cartas y board; si no encaja, ignóralo y calcula tú.
4. Sin showdown (sin vil.show ni res.vilHand fiable), NO afirmes la mano final del villano ni del héroe al river.
5. vil.line es la línea del villano en notación compacta — úsala para lectura, no para inventar cartas.
6. Si detectas inconsistencia en el JSON, dilo en una frase y analiza solo lo verificado.

En informes de mano (modo report), incluye justo después del título:
## Lectura verificada
(máx. 5 líneas: héroe con cartas, acciones por calle desde dec[], board final, mano hecha del héroe si es verificable)
Luego continúa con el análisis. En preguntas sobre una mano, verifica internamente antes de responder; si la pregunta asume una acción o mano incorrecta, corrígelo primero.`;

const REPORT_PROMPT = `${COACH_IDENTITY_BASE}

${HAND_READING_RULES}

${HAND_CLOSING_RULES}

Recibes JSON compacto: cartas, board, decisiones del héroe (dec[]), línea del villano y showdown si hay.

NO narres la mano entera ni repitas toda la secuencia fuera de "## Lectura verificada".
Evalúa SOLO:
1) Cada decisión del héroe: ¿correcta según GTO? ¿por qué? (con tus propios números)
2) Lectura del villano: interpreta su línea (rango, polarización, bluffs/value) y qué señales daría en spots similares

Si el JSON incluye "similar" (manos previas del alumno), úsalas solo para detectar patrones recurrentes, no para narrar.

Título: usa hero.code y hero.pos (NUNCA el id numérico de la mano).
Responde markdown completo (no cortes a mitad de frase):
# {hero.code} {hero.pos}
## Lectura verificada
## Decisiones
Por cada decisión con cl != optima (máx. 4 bullets relevantes):
- Calle · Acción elegida vs óptima · Pot odds / MDF si hay apuesta · 1 frase: por qué GTO prefiere la otra línea
## Lectura villano
## Conclusión
(1-3 frases: takeaway GTO de esta mano; qué harías en un spot parecido; sin mencionar la app ni estudios genéricos)`;

const QUESTION_PROMPT = `${COACH_IDENTITY_BASE}

${HAND_READING_RULES}

${HAND_CLOSING_RULES}

Recibes el JSON completo de una mano y una PREGUNTA concreta del usuario. Puede haber turnos previos de la conversación.

Usa todo el contexto de la mano (cartas, board, decisiones, línea villano, resultado) pero CENTRA la respuesta en la pregunta del usuario. Sé directo y útil.

Si la pregunta toca equity, odds o EV, recalcula por tu cuenta; no confíes ciegamente en los números del JSON.

Responde en markdown en español. Empieza con un título breve relacionado con la pregunta (no uses el id de la mano).
Responde de forma CONCISA (máx. 6 bullets o 8 frases) pero COMPLETA, sin cortarte al final. Si corriges la lectura de la mano, dilo en la primera frase.
Cierra con ## Conclusión o un párrafo final breve que resuma la respuesta a la pregunta, centrado solo en esta mano.`;

const SESSION_REPORT_PROMPT = `${COACH_IDENTITY}

Recibes JSON ultra-compacto de una SESIÓN importada:
- file: etiqueta del archivo importado (nick de mesa en el .txt), NO el nombre del alumno
- student: nombre del alumno (cuenta), si está presente — salúdalo por ahí, nunca por file
- st: estadísticas globales (n manos, acc, net, evLost, expNet, varianza, nota, acierto por calle, distribución decisiones)
- leaks: manos con fugas (decisiones malas/EV perdido) con detalle
- clean: resto de manos en una línea cada una (id|mano pos|net|ev|veredicto)
- leakTrunc / leakNote: si hay más fugas de las enviadas

Los números eq/gto/ev son estimaciones de la app y pueden fallar; verifica solo lo relevante.
Al citar una mano concreta de leaks, contrasta hero, board y dec[] antes de describir la jugada. No inventes manos hechas ni acciones.
Si hay "coachSummary" o "player", adapta el plan al historial del alumno.

NO enumeres todas las manos. Analiza patrones, calles débiles, fugas recurrentes y varianza vs errores.
Responde markdown completo en español:
# Resumen sesión {file}
## Rendimiento global
## Fugas principales
(3-6 bullets con mano, calle y por qué)
## Patrones (calle, posición, tipo de spot)
## Plan de estudio
(3 acciones concretas microlímites en la app: entrenador, sesiones, estadísticas)`;

const SESSION_QUESTION_PROMPT = `${COACH_IDENTITY}

Recibes JSON compacto de una SESIÓN (file, student, stats + leaks + clean) y una PREGUNTA del usuario. Puede haber turnos previos.
file es el archivo importado (nick de mesa); student es el nombre del alumno si está presente — no confundas ambos.

Responde centrándote en la pregunta usando stats y las manos relevantes del JSON. Sé directo.
Si citas una mano, verifica cartas, board y acciones del héroe desde el JSON antes de evaluar. No inventes manos hechas ni líneas de acción.
eq/gto/ev del JSON pueden ser incorrectos; recalcula si la pregunta lo requiere.

Responde markdown en español. Título breve relacionado con la pregunta.
La respuesta debe quedar COMPLETA, sin cortarse al final. Cierra con una recomendación práctica en la app (entrenador, sesiones o estadísticas).`;

const STATS_REPORT_PROMPT = `${COACH_IDENTITY}

Recibes JSON del ENTRENADOR del usuario:
- st: estadísticas globales (manos, acierto, net, EV perdido, acierto por calle, distribución de decisiones)
- progress: series semanales (manos, acierto, EV perdido)
- leaks: top spots recurrentes con número de errores y EV perdido
- player: perfil resumido del alumno (plan, leaks recurrentes, tendencia)
- coachSummary: resumen de sesiones anteriores (si existe)

NO repitas todos los números del JSON. Identifica qué entrenar para mejorar. Adapta el plan a los leaks recurrentes del JSON.
Sé CONCISO: bullets cortos (1-2 frases). El informe debe caber completo sin cortarse.

Ejemplo de bullet en ## Prioridades:
- **Turn · 3-Bet CO**: 8 errores, −6.1 bb EV — calls con draws débiles vs barrel doble; repasa spots similares en el entrenador.

Responde markdown COMPLETO en español (todas las secciones, sin cortar la última):
# Plan de estudio personalizado
## Diagnóstico rápido
(2-4 frases)
## Prioridades
(3-5 bullets: calle, spot, tipo de error; acción concreta en la app)
## Rutina sugerida esta semana
(3-4 bullets: entrenador de spots, revisar sesiones importadas, consultar estadísticas)
## Métrica a vigilar
(1 bullet concreto)`;

const STATS_QUESTION_PROMPT = `${COACH_IDENTITY}

Recibes JSON de estadísticas globales del entrenador (progreso, leaks, aciertos, player, coachSummary) y una PREGUNTA del usuario. Puede haber turnos previos.

Responde centrándote en la pregunta con datos del JSON. Sé práctico y directo. Solo recomienda mejorar con recursos reales de la app (entrenador, sesiones, estadísticas, IA Coach).
Responde markdown en español. Título breve relacionado con la pregunta.
La respuesta debe quedar COMPLETA, sin cortarse al final. Cierra con una recomendación accionable en la app.`;

const HOME_GREETING_PROMPT = `${COACH_IDENTITY}

Es un SALUDO BREVE de inicio de sesión (2 o 3 frases máximo en texto plano).
El JSON incluye estadísticas/leaks y, si viene, greetingFocus con el foco de entrenamiento elegido hoy y avoidRecent (focos ya recomendados recientemente).

REGLAS DE VARIEDAD (obligatorias):
- Debes recomendar ESPECÍFICAMENTE el foco indicado en greetingFocus.label (o el spot concreto de greetingFocus.spot si viene).
- NO repitas focos listados en avoidRecent.
- Varía el tono: a veces motivador, a veces directo, a veces con un reto concreto; no uses siempre las mismas frases de apertura.
- Si no hay estadíticas aún, da la bienvenida y anima a empezar por ese foco en el entrenador.
- Sin títulos, sin markdown, sin listas ni emojis. Solo el texto del saludo.
- Menciona el entrenamiento de forma accionable (qué configurar o qué practicar hoy).`;

const LEARN_QUESTION_PROMPT = `${COACH_IDENTITY}

El usuario está en la Guía para principiantes de PokerForgeAI. Puede ser nuevo en el póker o tener nivel bajo.
Recibes JSON con contexto beginner=true y una PREGUNTA.

Explica conceptos de NL Hold'em 6-max cash en español claro, sin jerga innecesaria. Si usas un término técnico (GTO, RFI, 3-bet, c-bet, equity, pot odds…), defínelo en una frase.
Usa ejemplos sencillos (cartas, posiciones UTG–BTN–blinds, tamaños en bb).
Puedes recomendar practicar spots concretos en el entrenador de la app o seguir leyendo la guía.
NO asumas que domina GTO ni soluce spots avanzados.
Responde markdown en español. Título breve. Respuesta COMPLETA. Cierra con un tip práctico o una pregunta para seguir aprendiendo.`;

const PARSE_HAND_PROMPT = `Eres un parser experto de manos de poker NL Hold'em 6-max/9-max cash. Recibes la DESCRIPCIÓN EN TEXTO LIBRE de una mano (en español) escrita por un usuario: posiciones, cartas del héroe, cartas de villanos si se conocen, cartas comunitarias y las acciones por calle.

Tu tarea es DEVOLVER SOLO UN OBJETO JSON VÁLIDO (sin markdown, sin explicación fuera del JSON) con esta forma EXACTA:

{
  "format": "6max" | "9max",
  "heroPos": "UTG"|"UTG1"|"UTG2"|"LJ"|"HJ"|"CO"|"BTN"|"SB"|"BB",
  "heroCards": ["Ah","Kd"],
  "villains": [ { "pos": "BTN", "cards": ["Qs","Qd"] } ],
  "board": ["9c","Tc","8c","6s","2h"],
  "actions": {
    "preflop": [ { "pos": "CO", "action": "raise"|"call"|"fold"|"check"|"bet", "amountBB": 3 } ],
    "flop": [],
    "turn": [],
    "river": []
  },
  "analysis": "Análisis breve de la mano en español (markdown permitido dentro de este string)."
}

REGLAS ESTRICTAS:
- Cartas SIEMPRE en formato de 2 caracteres: rango (2-9,T,J,Q,K,A) + palo en minúscula (s,h,d,c). Ejemplo: "As","Th","9c". La T es el 10.
- "amountBB" es el TOTAL en ciegas grandes (bb) al que se sube o apuesta. Para raise = tamaño total (p.ej. open a 3 → 3; 3-bet a 9 → 9). Para bet = tamaño de la apuesta en bb. Para call/check/fold usa 0 o null.
- Incluye en "actions" TODAS las acciones en orden real, incluida la del héroe. Usa las posiciones como identificador de cada jugador.
- Incluye en "villains" TODOS los jugadores que no son el héroe y que aparecen en "actions" (aunque no se conozcan sus cartas). Si no hay cartas, usa "cards": [].
- "board" puede tener 0, 3, 4 o 5 cartas. Si no se menciona flop/turn/river, deja las que falten fuera del array.
- Si una carta de villano no se conoce, omite "cards" o deja [] en ese villano. NUNCA omitas al villano del array solo porque no se conozcan sus cartas.
- Si un dato no está en el texto, haz la inferencia más razonable y coherente (por ejemplo, las ciegas se postean solas). NUNCA inventes cartas que contradigan el texto.
- No incluyas comentarios ni texto fuera del objeto JSON.`;

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface ThreadTurn {
  mode?: string;
  question?: string;
  reportMarkdown?: string;
}

type AiMode = 'report' | 'question' | 'session_report' | 'session_question' | 'stats_report' | 'stats_question' | 'parse_hand';

const QUESTION_MAX = 500;
const THREAD_MAX = 4;
const THREAD_SNIPPET_MAX = 1500;

function normalizeMode(raw: unknown): AiMode {
  if (raw === 'question') return 'question';
  if (raw === 'session_report') return 'session_report';
  if (raw === 'session_question') return 'session_question';
  if (raw === 'stats_report') return 'stats_report';
  if (raw === 'stats_question') return 'stats_question';
  if (raw === 'parse_hand') return 'parse_hand';
  return 'report';
}

function sanitizeQuestion(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const q = raw.trim().replace(/\s+/g, ' ');
  if (!q.length) return null;
  return q.slice(0, QUESTION_MAX);
}

function sanitizeThread(raw: unknown): ThreadTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, THREAD_MAX).filter((t) => t && typeof t === 'object').map((t) => {
    const turn = t as ThreadTurn;
    return {
      mode: turn.mode === 'question' ? 'question' : 'report',
      question: typeof turn.question === 'string' ? turn.question.slice(0, QUESTION_MAX) : undefined,
      reportMarkdown: typeof turn.reportMarkdown === 'string'
        ? turn.reportMarkdown.slice(0, THREAD_SNIPPET_MAX)
        : undefined
    };
  }).filter((t) => t.reportMarkdown || t.question);
}

function isBeginnerLearnPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return p.beginner === true || p.src === 'learn';
}

function isHomeGreetingPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return !!(p.greetingFocus && typeof p.greetingFocus === 'object');
}

function promptForMode(mode: AiMode, payload?: unknown, freePromo?: boolean): string {
  if (mode === 'parse_hand') return PARSE_HAND_PROMPT;
  if (mode === 'session_report') return SESSION_REPORT_PROMPT;
  if (mode === 'session_question') return SESSION_QUESTION_PROMPT;
  if (mode === 'stats_report') return STATS_REPORT_PROMPT;
  if (mode === 'stats_question') {
    if (freePromo || isHomeGreetingPayload(payload)) return HOME_GREETING_PROMPT;
    if (isBeginnerLearnPayload(payload)) return LEARN_QUESTION_PROMPT;
    return STATS_QUESTION_PROMPT;
  }
  if (mode === 'question') return QUESTION_PROMPT;
  return REPORT_PROMPT;
}

function userContentForMode(mode: AiMode, payload: unknown, question: string | null): string {
  const json = JSON.stringify(payload);
  if (mode === 'parse_hand') {
    const p = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};
    const rawText = typeof p.rawText === 'string' ? p.rawText : '';
    return 'Descripción de la mano a parsear a JSON:\n' + rawText;
  }
  if (mode === 'session_question') {
    return 'Pregunta del usuario:\n' + question + '\n\nSesión (JSON):\n' + json;
  }
  if (mode === 'stats_question') {
    if (isHomeGreetingPayload(payload)) {
      return 'Saludo de bienvenida / recomendación del día:\n' + question + '\n\nEstadísticas y foco (JSON):\n' + json;
    }
    if (isBeginnerLearnPayload(payload)) {
      return 'Pregunta del alumno principiante:\n' + question + '\n\nContexto guía (JSON):\n' + json;
    }
    return 'Pregunta del usuario:\n' + question + '\n\nEstadísticas del entrenador (JSON):\n' + json;
  }
  if (mode === 'session_report') {
    return 'Genera informe de la sesión:\n' + json;
  }
  if (mode === 'stats_report') {
    return 'Genera plan de estudio según estas estadísticas:\n' + json;
  }
  if (mode === 'question') {
    return 'Pregunta del usuario:\n' + question + '\n\nContexto de la mano (JSON):\n' + json;
  }
  return 'Genera informe de la mano. Primero verifica lectura de cartas y acciones del héroe desde el JSON:\n' + json;
}

function buildGeminiContents(
  mode: AiMode,
  userContent: string,
  thread: ThreadTurn[]
): Array<{ role: string; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  if (mode.endsWith('question') && thread.length) {
    for (const turn of thread) {
      if (turn.mode === 'question' && turn.question) {
        contents.push({ role: 'user', parts: [{ text: 'Pregunta anterior del alumno:\n' + turn.question }] });
        if (turn.reportMarkdown) {
          contents.push({ role: 'model', parts: [{ text: turn.reportMarkdown }] });
        }
      } else if (turn.reportMarkdown) {
        contents.push({ role: 'user', parts: [{ text: 'Informe previo del coach (contexto):' }] });
        contents.push({ role: 'model', parts: [{ text: turn.reportMarkdown }] });
      }
    }
  }
  contents.push({ role: 'user', parts: [{ text: userContent }] });
  return contents;
}

function requiredSections(mode: AiMode): string[] {
  if (mode === 'report') return ['Lectura verificada', 'Decisiones', 'Lectura villano', 'Conclusión'];
  if (mode === 'session_report') return ['Rendimiento global', 'Fugas principales', 'Plan de estudio'];
  if (mode === 'stats_report') return ['Diagnóstico rápido', 'Prioridades', 'Rutina sugerida', 'Métrica a vigilar'];
  return [];
}

function extractGeminiText(parts: GeminiPart[]): string {
  const visible = parts
    .filter((p) => !p.thought)
    .map((p) => p.text || '')
    .join('')
    .trim();
  if (visible) return visible;
  return parts.map((p) => p.text || '').join('').trim();
}

function normalizeHeading(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function hasSection(text: string, heading: string): boolean {
  const want = normalizeHeading(heading);
  return text.split('\n').some((line) => {
    const m = line.match(/^##\s+(.+)/);
    if (!m) return false;
    const got = normalizeHeading(m[1].replace(/\s*\(.*/, '').trim());
    return got === want || got.startsWith(want);
  });
}

function looksCutOff(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length < 80) return true;
  if (/[,:;\-–—(]$/.test(t)) return true;
  if (/[*_`#]$/.test(t)) return true;
  if (/[\.\!\?\)\]»"]$/.test(t)) return false;
  const lastLine = t.split('\n').filter(Boolean).slice(-1)[0] || '';
  if (/^[-*]\s+/.test(lastLine) && !/[\.\!\?]$/.test(lastLine.trim())) return true;
  return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]$/.test(t);
}

function mergeCoachContinuation(prev: string, next: string): string {
  const p = prev.trim();
  const n = next.trim();
  if (!n) return p;
  if (n.length > p.length && n.includes(p.slice(0, Math.min(120, p.length)))) return n;
  if (p.includes(n)) return p;
  return p + '\n\n' + n;
}

function buildRetryPrompt(mode: AiMode, attempt: number): string {
  const sections = requiredSections(mode);
  const sectionHint = sections.length
    ? ' Secciones obligatorias: ' + sections.map((s) => '##' + s).join(', ') + '.'
    : '';
  if (attempt === 0) {
    return 'Tu respuesta anterior está incompleta o cortada.' + sectionHint +
      ' Complétala en markdown. No repitas lo ya dicho; añade solo lo que falta y cierra bien.';
  }
  if (mode === 'report' || mode === 'question') {
    return 'Sigue incompleta. Reescribe la respuesta COMPLETA en formato breve (máx. 6 bullets u 8 frases), ' +
      'sin cortarte al final y cerrando con ## Conclusión centrada en esta mano o pregunta, sin mencionar la app.';
  }
  return 'Sigue incompleta. Reescribe la respuesta COMPLETA en formato breve (máx. 6 bullets u 8 frases), ' +
    'sin cortarte al final y cerrando con una recomendación final dentro de PokerForgeAI.';
}

function coachResponseComplete(mode: AiMode, text: string, finishReason: string): boolean {
  if (!text || !text.trim()) return false;
  if (finishReason === 'MAX_TOKENS') return false;
  return markdownComplete(mode, text);
}

function markdownComplete(mode: AiMode, text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 80) return false;
  if (looksCutOff(t)) return false;
  if (mode.endsWith('question')) return t.length >= 40;
  const sections = requiredSections(mode);
  if (!sections.length) return true;
  return sections.every((s) => hasSection(t, s));
}

function extractCoachSummary(markdown: string): string {
  const t = markdown.trim();
  if (!t) return '';
  const diag = t.match(/##\s*Diagnóstico rápido[\s\S]*?(?=##|$)/i);
  const prio = t.match(/##\s*Prioridades[\s\S]*?(?=##|$)/i);
  const parts = [diag?.[0], prio?.[0]].filter(Boolean);
  const joined = parts.length ? parts.join('\n\n') : t;
  return joined.slice(0, 2000);
}

type PayloadRecord = Record<string, unknown>;

function payloadSpot(payload: PayloadRecord): string {
  return String(payload.spot || 'unknown');
}

function payloadHeroCode(payload: PayloadRecord): string {
  const hero = payload.hero as { code?: string } | undefined;
  return String(hero?.code || '');
}

function handIndexFromPayload(payload: PayloadRecord) {
  const hero = payload.hero as { code?: string; pos?: string } | undefined;
  const spot = payloadSpot(payload);
  const dec = (payload.dec as Array<{ st?: string; cl?: string; ev?: number }>) || [];
  const worst = dec
    .filter((d) => d.cl === 'error' || d.cl === 'imprecisa')
    .sort((a, b) => (Number(b.ev) || 0) - (Number(a.ev) || 0))[0];
  const street = worst?.st || dec[dec.length - 1]?.st || 'preflop';
  const res = payload.res as { evLoss?: number } | undefined;
  const ev = Number(res?.evLoss) || Number(worst?.ev) || 0;
  const line = `${hero?.code || '?'} ${hero?.pos || '?'} | ${spot} | ${street} | ev ${ev}`;
  return {
    spot_key: spot.toLowerCase().slice(0, 80),
    hero_code: hero?.code || '',
    street,
    ev_loss: ev,
    hand_line: line
  };
}

async function enrichPayload(
  admin: ReturnType<typeof createClient>,
  userId: string,
  mode: AiMode,
  payload: PayloadRecord
): Promise<PayloadRecord> {
  const out = { ...payload };
  try {
    const { data: prof, error } = await admin
      .from('pt_user_profiles')
      .select('coach_summary, plan')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && prof?.coach_summary && (mode.startsWith('stats_') || mode.startsWith('session_'))) {
      out.coachSummary = prof.coach_summary;
    }

    if (mode === 'report' || mode === 'question') {
      const { data: similar } = await admin.rpc('pt_find_similar_coach_hands', {
        p_user_id: userId,
        p_spot_key: payloadSpot(payload),
        p_hero_code: payloadHeroCode(payload),
        p_limit: 3
      });
      if (Array.isArray(similar) && similar.length) {
        out.similar = similar;
      }
    }
  } catch (e) {
    console.warn('[analyze-hand] enrichPayload', e);
  }
  return out;
}

async function indexHand(
  admin: ReturnType<typeof createClient>,
  userId: string,
  payload: PayloadRecord
) {
  const idx = handIndexFromPayload(payload);
  await admin.rpc('pt_index_coach_hand', {
    p_user_id: userId,
    p_spot_key: idx.spot_key,
    p_hero_code: idx.hero_code,
    p_street: idx.street,
    p_ev_loss: idx.ev_loss,
    p_hand_line: idx.hand_line
  });
}

function adminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

const DEMO_USER_ID = 'pt_demo_user';

async function callerIsAdmin(admin: ReturnType<typeof createClient>, userId: string) {
  const { data } = await admin
    .from('pt_user_profiles')
    .select('is_admin, email')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return false;
  const email = String(data.email || '').toLowerCase();
  return !!data.is_admin || email === 'info@pokerforgeai.com';
}

async function checkAiAccess(userId: string) {
  const admin = adminClient();
  if (!admin) return { ok: true as const, source: 'plan' as const, unlimited: false };

  if (await callerIsAdmin(admin, userId)) {
    return { ok: true as const, source: 'admin' as const, unlimited: true };
  }

  const { data, error } = await admin.rpc('pt_check_ai_access', { p_user_id: userId });
  if (error) {
    console.error('[analyze-hand] pt_check_ai_access', error);
    return { ok: false as const, error: 'access_check_failed', limit: 0, used: 0 };
  }
  const row = data as Record<string, unknown>;
  if (!row?.ok) {
    const endOfMonth = new Date();
    endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1, 1);
    endOfMonth.setUTCHours(0, 0, 0, 0);
    const retryAfter = Math.max(60, Math.ceil((endOfMonth.getTime() - Date.now()) / 1000));
    return {
      ok: false as const,
      error: (row.error as string) || 'ai_limit',
      retryAfter,
      limit: Number(row.limit) || 0,
      used: Number(row.used) || 0
    };
  }
  return {
    ok: true as const,
    source: (row.source as string) || 'plan',
    unlimited: !!row.unlimited
  };
}

async function recordAiUsage(userId: string, mode: AiMode, source: string) {
  const admin = adminClient();
  if (!admin) return;
  try {
    const { error } = await admin.rpc('pt_record_ai_usage', {
      p_user_id: userId,
      p_mode: mode,
      p_source: source
    });
    if (error) console.error('[analyze-hand] pt_record_ai_usage', error);
  } catch (e) {
    console.error('[analyze-hand] pt_record_ai_usage', e);
  }
}

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false as const, status: 401, error: 'missing_auth' };
  }
  const token = authHeader.slice(7).trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false as const, status: 500, error: 'supabase_env_missing' };
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false as const, status: 401, error: 'invalid_auth' };
  }
  return { ok: true as const, user: data.user, token };
}

async function callGemini(
  geminiKey: string,
  systemPrompt: string,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  mode: AiMode
) {
  const isSession = mode.startsWith('session_');
  const isStats = mode.startsWith('stats_');
  const isQuestion = mode.endsWith('question');
  const isParse = mode === 'parse_hand';
  const model = 'gemini-2.5-flash';
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' + model +
    ':generateContent?key=' + geminiKey;

  const generationConfig: Record<string, unknown> = {
    temperature: isParse ? 0.15 : (isQuestion ? 0.4 : 0.35),
    maxOutputTokens: isParse ? 4096 : (isQuestion ? 4096 : ((isSession || isStats) ? 4096 : 2048)),
    thinkingConfig: { thinkingBudget: 0 }
  };
  if (isParse) generationConfig.responseMimeType = 'application/json';

  const geminiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig
    })
  });

  const geminiData = await geminiRes.json();
  if (!geminiRes.ok) {
    const msg = geminiData?.error?.message || 'gemini_error';
    throw new Error(msg);
  }

  const candidate = geminiData?.candidates?.[0];
  const parts: GeminiPart[] = candidate?.content?.parts || [];
  const text = extractGeminiText(parts);
  const finishReason = candidate?.finishReason || '';

  if (!text && finishReason === 'SAFETY') {
    throw new Error('gemini_blocked');
  }

  return {
    text,
    finishReason,
    model
  };
}

async function generateCoachResponse(
  geminiKey: string,
  mode: AiMode,
  systemPrompt: string,
  userContent: string,
  thread: ThreadTurn[]
): Promise<{ text: string; finishReason: string; model: string; retried: boolean }> {
  const contents = buildGeminiContents(mode, userContent, thread);
  let result = await callGemini(geminiKey, systemPrompt, contents, mode);

  if (!result.text) {
    throw new Error('empty_response');
  }

  let retried = false;
  const shouldRetry = mode === 'report' || mode === 'stats_report' || mode === 'session_report' || mode.endsWith('question');
  const maxAttempts = shouldRetry ? 3 : 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (coachResponseComplete(mode, result.text, result.finishReason)) break;
    try {
      const retryContents = attempt === 0
        ? contents.concat([
          { role: 'model', parts: [{ text: result.text }] },
          { role: 'user', parts: [{ text: buildRetryPrompt(mode, attempt) }] }
        ])
        : [
          { role: 'user', parts: [{ text: userContent }] },
          {
            role: 'user',
            parts: [{
              text: buildRetryPrompt(mode, attempt) + '\n\nRespuesta previa (incompleta):\n' +
                result.text.slice(-1500)
            }]
          }
        ];
      const retry = await callGemini(geminiKey, systemPrompt, retryContents, mode);
      if (!retry.text) continue;
      const merged = attempt === 0
        ? mergeCoachContinuation(result.text, retry.text)
        : retry.text;
      if (merged.length >= result.text.length || coachResponseComplete(mode, merged, retry.finishReason)) {
        result = { text: merged, finishReason: retry.finishReason, model: retry.model };
        retried = true;
      }
    } catch (e) {
      console.warn('[analyze-hand] markdown retry failed', e);
    }
  }

  return { ...result, retried };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  try {
  const auth = await verifyAuth(req);
  if (!auth.ok) {
    return json({ error: auth.error }, auth.status);
  }

  let body: {
    payload?: unknown;
    mode?: unknown;
    question?: unknown;
    thread?: unknown;
    demo?: unknown;
    freePromo?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!body.payload) {
    return json({ error: 'missing_payload' }, 400);
  }

  let billingUserId = auth.user.id;
  if (body.demo === true) {
    const admin = adminClient();
    if (!admin) return json({ error: 'server_config' }, 500);
    const okAdmin = await callerIsAdmin(admin, auth.user.id);
    if (!okAdmin) return json({ error: 'forbidden' }, 403);
    billingUserId = DEMO_USER_ID;
  }

  const mode = normalizeMode(body.mode);
  const freePromo = body.freePromo === true && mode === 'stats_question';
  const question = (mode === 'question' || mode === 'session_question' || mode === 'stats_question')
    ? sanitizeQuestion(body.question)
    : null;
  if ((mode === 'question' || mode === 'session_question' || mode === 'stats_question') && !question) {
    return json({ error: 'missing_question' }, 400);
  }
  if (mode === 'parse_hand') {
    const p = body.payload as Record<string, unknown>;
    const rawText = typeof p?.rawText === 'string' ? p.rawText.trim() : '';
    if (!rawText) return json({ error: 'missing_hand_text' }, 400);
    if (rawText.length > 4000) {
      (body.payload as Record<string, unknown>).rawText = rawText.slice(0, 4000);
    }
  }

  const thread = mode.endsWith('question') ? sanitizeThread(body.thread) : [];
  const rawPayload = body.payload as PayloadRecord;
  const admin = adminClient();
  const enrichedPayload = admin
    ? await enrichPayload(admin, billingUserId, mode, rawPayload)
    : rawPayload;

  const systemPrompt = promptForMode(mode, enrichedPayload, freePromo);
  const userContent = userContentForMode(mode, enrichedPayload, question);

  let access: { ok: true; source: string; unlimited: boolean } | Awaited<ReturnType<typeof checkAiAccess>>;
  if (freePromo) {
    access = { ok: true as const, source: 'promo', unlimited: true };
  } else {
    access = await checkAiAccess(billingUserId);
    if (!access.ok) {
      return json({
        error: access.error || 'rate_limit',
        retryAfter: access.retryAfter,
        limit: access.limit,
        used: access.used
      }, 429);
    }
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    return json({ error: 'GEMINI_API_KEY not configured' }, 500);
  }

  let result;
  try {
    result = await generateCoachResponse(geminiKey, mode, systemPrompt, userContent, thread);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'gemini_error';
    return json({ error: msg }, msg === 'empty_response' ? 502 : 502);
  }

  if (mode === 'parse_hand') {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      const m = result.text.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { parsed = null; }
      }
    }
    if (!parsed || typeof parsed !== 'object') {
      return json({ error: 'parse_failed' }, 502);
    }
    if (!freePromo) {
      await recordAiUsage(billingUserId, mode, access.source || 'plan');
    }
    const parsedObj = parsed as Record<string, unknown>;
    const analysisMarkdown = typeof parsedObj.analysis === 'string' ? parsedObj.analysis : '';
    return json({
      hand: parsedObj,
      analysisMarkdown: analysisMarkdown,
      model: result.model,
      mode: mode,
      createdAt: new Date().toISOString()
    });
  }

  const truncated = !coachResponseComplete(mode, result.text, result.finishReason || '');

  if (!freePromo) {
    await recordAiUsage(billingUserId, mode, access.source || 'plan');
  }

  if (admin) {
    if (mode === 'report' || mode === 'question') {
      indexHand(admin, billingUserId, rawPayload).catch((e) => {
        console.warn('[analyze-hand] index', e);
      });
    }
    if (mode === 'stats_report' && result.text) {
      const summary = extractCoachSummary(result.text);
      if (summary) {
        void (async () => {
          const { error } = await admin.rpc('pt_set_coach_summary', {
            p_user_id: billingUserId,
            p_summary: summary
          });
          if (error) console.warn('[analyze-hand] coach_summary', error);
        })();
      }
    }
  }

  return json({
    reportMarkdown: result.text,
    model: result.model,
    mode: mode,
    createdAt: new Date().toISOString(),
    truncated: truncated,
    finishReason: result.finishReason || undefined,
    retried: result.retried || undefined
  });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'server_error';
    console.error('[analyze-hand] unhandled', e);
    await captureEdgeError(e, { function: 'analyze-hand' });
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
  });
}
