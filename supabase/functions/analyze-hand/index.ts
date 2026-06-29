import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const COACH_IDENTITY = `Eres un entrenador de poker profesional especializado en NL Hold'em 6-max cash (microlímites y low stakes). Actúas SIEMPRE como coach: directo, pedagógico, sin rodeos, orientado a que el alumno mejore su juego. Hablas en español natural. No eres un narrador de manos ni un chat genérico: eres su entrenador personal de poker.`;

const REPORT_PROMPT = `${COACH_IDENTITY}

Recibes JSON compacto: cartas, board, decisiones del héroe, línea del villano y showdown si hay.

CRÍTICO — números del solver local:
Los campos eq (equity), gto (frecuencias), ev (EV perdido) y acc (precisión) son ESTIMACIONES de la app y pueden estar mal. NO los cites como verdad ni bases tu análisis solo en ellos. Recalcula por tu cuenta equity aproximada, pot odds, MDF y si la jugada encaja con GTO usando cartas, board y tamaños de bote/call. Si discrepas del solver, dilo con tus cálculos.

NO narres la mano ni repitas la secuencia de acciones (el usuario ya la ve).
Evalúa SOLO:
1) Cada decisión del héroe: ¿correcta según GTO? ¿por qué? (con tus propios números)
2) Lectura del villano: interpreta su línea (rango, polarización, bluffs/value) y qué señales daría en spots similares

Si el JSON incluye "similar" (manos previas del alumno), úsalas solo para detectar patrones recurrentes, no para narrar.

Título: usa hero.code y hero.pos (NUNCA el id numérico de la mano).
Responde markdown completo (no cortes a mitad de frase):
# {hero.code} {hero.pos}
## Decisiones
Por cada decisión con cl != optima (máx. 4 bullets relevantes):
- Calle · Acción elegida vs óptima · Pot odds / MDF si hay apuesta · 1 frase: por qué GTO prefiere la otra línea
## Lectura villano
## Lección práctica
(1 idea concreta microlímites)`;

const QUESTION_PROMPT = `${COACH_IDENTITY}

Recibes el JSON completo de una mano y una PREGUNTA concreta del usuario. Puede haber turnos previos de la conversación.

Usa todo el contexto de la mano (cartas, board, decisiones, línea villano, resultado) pero CENTRA la respuesta en la pregunta del usuario. Sé directo y útil.

Los campos eq, gto, ev del JSON son estimaciones del solver local y pueden ser incorrectos. Si la pregunta toca equity, odds o EV, recalcula por tu cuenta; no confíes ciegamente en los números del JSON.

Responde en markdown en español. Empieza con un título breve relacionado con la pregunta (no uses el id de la mano).`;

const SESSION_REPORT_PROMPT = `${COACH_IDENTITY}

Recibes JSON ultra-compacto de una SESIÓN importada:
- file: etiqueta del archivo importado (nick de mesa en el .txt), NO el nombre del alumno
- student: nombre del alumno (cuenta), si está presente — salúdalo por ahí, nunca por file
- st: estadísticas globales (n manos, acc, net, evLost, expNet, varianza, nota, acierto por calle, distribución decisiones)
- leaks: manos con fugas (decisiones malas/EV perdido) con detalle
- clean: resto de manos en una línea cada una (id|mano pos|net|ev|veredicto)
- leakTrunc / leakNote: si hay más fugas de las enviadas

Los números eq/gto/ev son del solver local y pueden fallar; verifica solo lo relevante.
Si hay "coachSummary" o "player", adapta el plan al historial del alumno.

NO enumeres todas las manos. Analiza patrones, calles débiles, fugas recurrentes y varianza vs errores.
Responde markdown completo en español:
# Resumen sesión {file}
## Rendimiento global
## Fugas principales
(3-6 bullets con mano, calle y por qué)
## Patrones (calle, posición, tipo de spot)
## Plan de estudio
(3 acciones concretas microlímites)`;

const SESSION_QUESTION_PROMPT = `${COACH_IDENTITY}

Recibes JSON compacto de una SESIÓN (file, student, stats + leaks + clean) y una PREGUNTA del usuario. Puede haber turnos previos.
file es el archivo importado (nick de mesa); student es el nombre del alumno si está presente — no confundas ambos.

Responde centrándote en la pregunta usando stats y las manos relevantes del JSON. Sé directo.
eq/gto/ev del solver pueden ser incorrectos; recalcula si la pregunta lo requiere.

Responde markdown en español. Título breve relacionado con la pregunta.`;

const STATS_REPORT_PROMPT = `${COACH_IDENTITY}

Recibes JSON del ENTRENADOR del usuario:
- st: estadísticas globales (manos, acierto, net, EV perdido, acierto por calle, distribución de decisiones)
- progress: series semanales (manos, acierto, EV perdido)
- leaks: top spots recurrentes con número de errores y EV perdido
- player: perfil resumido del alumno (plan, leaks recurrentes, tendencia)
- coachSummary: resumen de sesiones anteriores (si existe)

NO repitas todos los números del JSON. Identifica qué entrenar para mejorar. Adapta el plan a los leaks recurrentes del JSON.

Ejemplo de bullet en ## Prioridades:
- **Turn · 3-Bet CO**: 8 errores, −6.1 bb EV — calls con draws débiles vs barrel doble; estudiar check-raise y fold MDF.

Responde markdown completo en español:
# Plan de estudio personalizado
## Diagnóstico rápido
## Prioridades (3-5 bullets: calle, spot, tipo de error)
## Rutina sugerida esta semana
## Métrica a vigilar`;

const STATS_QUESTION_PROMPT = `${COACH_IDENTITY}

Recibes JSON de estadísticas globales del entrenador (progreso, leaks, aciertos, player, coachSummary) y una PREGUNTA del usuario. Puede haber turnos previos.

Responde centrándote en la pregunta con datos del JSON. Sé práctico y directo.
Responde markdown en español. Título breve relacionado con la pregunta.`;

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface ThreadTurn {
  mode?: string;
  question?: string;
  reportMarkdown?: string;
}

type AiMode = 'report' | 'question' | 'session_report' | 'session_question' | 'stats_report' | 'stats_question';

const QUESTION_MAX = 500;
const THREAD_MAX = 4;
const THREAD_SNIPPET_MAX = 1500;

function normalizeMode(raw: unknown): AiMode {
  if (raw === 'question') return 'question';
  if (raw === 'session_report') return 'session_report';
  if (raw === 'session_question') return 'session_question';
  if (raw === 'stats_report') return 'stats_report';
  if (raw === 'stats_question') return 'stats_question';
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

function promptForMode(mode: AiMode): string {
  if (mode === 'session_report') return SESSION_REPORT_PROMPT;
  if (mode === 'session_question') return SESSION_QUESTION_PROMPT;
  if (mode === 'stats_report') return STATS_REPORT_PROMPT;
  if (mode === 'stats_question') return STATS_QUESTION_PROMPT;
  if (mode === 'question') return QUESTION_PROMPT;
  return REPORT_PROMPT;
}

function userContentForMode(mode: AiMode, payload: unknown, question: string | null): string {
  const json = JSON.stringify(payload);
  if (mode === 'session_question') {
    return 'Pregunta del usuario:\n' + question + '\n\nSesión (JSON):\n' + json;
  }
  if (mode === 'stats_question') {
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
  return 'Genera informe de la mano (verifica números del solver por tu cuenta):\n' + json;
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
  if (mode === 'report') return ['Decisiones', 'Lectura villano', 'Lección práctica'];
  if (mode === 'session_report') return ['Rendimiento global', 'Fugas principales', 'Plan de estudio'];
  if (mode === 'stats_report') return ['Diagnóstico rápido', 'Prioridades', 'Rutina sugerida'];
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

function markdownComplete(mode: AiMode, text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 80) return false;
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
    .select('is_admin')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data?.is_admin;
}

async function checkAiAccess(userId: string) {
  const admin = adminClient();
  if (!admin) return { ok: true as const, source: 'plan' as const };
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
  const model = 'gemini-2.5-flash';
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' + model +
    ':generateContent?key=' + geminiKey;

  const geminiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: isQuestion ? 0.4 : 0.35,
        maxOutputTokens: (isSession || isStats) ? (isQuestion ? 1536 : 3072) : (isQuestion ? 1536 : 2048)
      }
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
  const shouldRetry = mode === 'report' || mode === 'question';
  if (shouldRetry && !markdownComplete(mode, result.text)) {
    try {
      const retryContents = contents.concat([
        { role: 'model', parts: [{ text: result.text }] },
        {
          role: 'user',
          parts: [{
            text: 'Tu respuesta anterior está incompleta o le faltan secciones obligatorias. ' +
              'Completa el informe en markdown con TODAS las secciones requeridas. No repitas lo ya dicho; añade lo que falta.'
          }]
        }
      ]);
      const retry = await callGemini(geminiKey, systemPrompt, retryContents, mode);
      if (retry.text && retry.text.length > result.text.length) {
        result = retry;
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

  const access = await checkAiAccess(billingUserId);
  if (!access.ok) {
    return json({
      error: access.error || 'rate_limit',
      retryAfter: access.retryAfter,
      limit: access.limit,
      used: access.used
    }, 429);
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    return json({ error: 'GEMINI_API_KEY not configured' }, 500);
  }

  const mode = normalizeMode(body.mode);
  const question = (mode === 'question' || mode === 'session_question' || mode === 'stats_question')
    ? sanitizeQuestion(body.question)
    : null;
  if ((mode === 'question' || mode === 'session_question' || mode === 'stats_question') && !question) {
    return json({ error: 'missing_question' }, 400);
  }

  const thread = mode.endsWith('question') ? sanitizeThread(body.thread) : [];
  const rawPayload = body.payload as PayloadRecord;
  const admin = adminClient();
  const enrichedPayload = admin
    ? await enrichPayload(admin, billingUserId, mode, rawPayload)
    : rawPayload;

  const systemPrompt = promptForMode(mode);
  const userContent = userContentForMode(mode, enrichedPayload, question);

  let result;
  try {
    result = await generateCoachResponse(geminiKey, mode, systemPrompt, userContent, thread);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'gemini_error';
    return json({ error: msg }, msg === 'empty_response' ? 502 : 502);
  }

  const truncated = result.finishReason === 'MAX_TOKENS';

  await recordAiUsage(billingUserId, mode, access.source || 'plan');

  if (admin) {
    if (mode === 'report' || mode === 'question') {
      indexHand(admin, billingUserId, rawPayload).catch((e) => {
        console.warn('[analyze-hand] index', e);
      });
    }
    if (mode === 'stats_report' && result.text) {
      const summary = extractCoachSummary(result.text);
      if (summary) {
        admin.rpc('pt_set_coach_summary', {
          p_user_id: billingUserId,
          p_summary: summary
        }).catch((e) => console.warn('[analyze-hand] coach_summary', e));
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
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
  });
}
