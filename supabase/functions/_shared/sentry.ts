/**
 * Sentry para Edge Functions (G-08).
 * Configura SENTRY_DSN en Supabase Dashboard → Edge Functions → Secrets.
 */

type SentryLike = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, ctx?: Record<string, unknown>) => string;
  flush: (timeout?: number) => Promise<boolean>;
};

let sentry: SentryLike | null = null;
let inited = false;

async function getSentry(): Promise<SentryLike | null> {
  const dsn = Deno.env.get('SENTRY_DSN');
  if (!dsn) return null;
  if (!sentry) {
    const mod = await import('https://deno.land/x/sentry@8.55.0/index.mjs');
    sentry = mod as unknown as SentryLike;
  }
  if (!inited && sentry) {
    sentry.init({
      dsn,
      environment: Deno.env.get('SENTRY_ENVIRONMENT') || 'edge',
      tracesSampleRate: 0.1
    });
    inited = true;
  }
  return sentry;
}

export async function captureEdgeError(err: unknown, context?: Record<string, unknown>) {
  try {
    const s = await getSentry();
    if (!s) return;
    s.captureException(err, context ? { extra: context } : undefined);
    await s.flush(2000);
  } catch (_e) {
    console.error('[sentry] capture failed', err);
  }
}

export function withSentryHandler(
  name: string,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err) {
      console.error(`[${name}]`, err);
      await captureEdgeError(err, { function: name, url: req.url });
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}
