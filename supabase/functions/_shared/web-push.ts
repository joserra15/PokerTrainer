/**
 * Web Push (RFC 8291 aes128gcm + VAPID RFC 8292) con Web Crypto.
 * Pensado para Deno / Supabase Edge (sin APIs de Node).
 */

const encoder = new TextEncoder();

export type PushKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type SendResult = {
  ok: boolean;
  status: number;
  gone: boolean;
  error?: string;
};

function concat(...parts: Uint8Array[]) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function b64url(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromB64url(s: string) {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = pad + '='.repeat((4 - (pad.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function u32be(n: number) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n);
  return b;
}

function cstr(s: string) {
  const a = encoder.encode(s);
  const out = new Uint8Array(a.length + 1);
  out.set(a);
  return out;
}

async function hkdf(ikm: ArrayBuffer, salt: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  );
}

async function encryptPayload(userPublic: Uint8Array, userAuth: Uint8Array, payload: Uint8Array) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPub = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const uaKey = await crypto.subtle.importKey(
    'raw',
    userPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const secret = await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, pair.privateKey, 256);

  const authInfo = concat(cstr('WebPush: info'), userPublic, localPub);
  const ikm = await hkdf(secret, userAuth, authInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = new Uint8Array(await hkdf(ikm, salt, cstr('Content-Encoding: aes128gcm'), 16));
  const nonce = new Uint8Array(await hkdf(ikm, salt, cstr('Content-Encoding: nonce'), 12));

  const padded = concat(payload, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
  );

  const rs = 4096;
  const header = concat(salt, u32be(rs), new Uint8Array([localPub.length]), localPub);
  return concat(header, ciphertext);
}

function vapidJwk(publicKey: Uint8Array, privateKey: Uint8Array) {
  if (publicKey.length !== 65 || publicKey[0] !== 4) {
    throw new Error('invalid_vapid_public');
  }
  if (privateKey.length !== 32) throw new Error('invalid_vapid_private');
  return {
    kty: 'EC',
    crv: 'P-256',
    x: b64url(publicKey.subarray(1, 33)),
    y: b64url(publicKey.subarray(33, 65)),
    d: b64url(privateKey),
    ext: true
  };
}

async function vapidJwt(audience: string, subject: string, publicKey: Uint8Array, privateKey: Uint8Array) {
  const header = b64url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const payload = b64url(encoder.encode(JSON.stringify({ aud: audience, exp, sub: subject })));
  const unsigned = `${header}.${payload}`;
  const jwk = vapidJwk(publicKey, privateKey);
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(unsigned))
  );
  return `${unsigned}.${b64url(sig)}`;
}

export function vapidEnv() {
  const pub = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  const priv = Deno.env.get('VAPID_PRIVATE_KEY') || '';
  const sub = Deno.env.get('VAPID_SUBJECT') || 'mailto:info@pokerforgeai.com';
  if (!pub || !priv) return null;
  return { publicKey: fromB64url(pub), privateKey: fromB64url(priv), subject: sub, publicRaw: pub };
}

export async function sendWebPush(sub: PushKeys, body: string | Uint8Array, ttl = 86400): Promise<SendResult> {
  const vapid = vapidEnv();
  if (!vapid) return { ok: false, status: 500, gone: false, error: 'vapid_env_missing' };
  if (!sub.endpoint || !/^https:\/\//i.test(sub.endpoint)) {
    return { ok: false, status: 400, gone: false, error: 'invalid_endpoint' };
  }

  let audience: string;
  try {
    audience = new URL(sub.endpoint).origin;
  } catch {
    return { ok: false, status: 400, gone: false, error: 'invalid_endpoint' };
  }

  const payload = typeof body === 'string' ? encoder.encode(body) : body;
  if (payload.byteLength > 3000) {
    return { ok: false, status: 400, gone: false, error: 'payload_too_large' };
  }

  const userPublic = fromB64url(sub.p256dh);
  const userAuth = fromB64url(sub.auth);
  if (userPublic.length !== 65 || userAuth.length < 16) {
    return { ok: false, status: 400, gone: false, error: 'invalid_subscription_keys' };
  }

  const encrypted = await encryptPayload(userPublic, userAuth, payload);
  const jwt = await vapidJwt(audience, vapid.subject, vapid.publicKey, vapid.privateKey);
  const publicB64 = b64url(vapid.publicKey);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${publicB64}`,
      'Crypto-Key': `p256ecdsa=${publicB64}`,
      TTL: String(ttl),
      Urgency: 'normal',
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': String(encrypted.length)
    },
    body: encrypted
  });

  const gone = res.status === 404 || res.status === 410;
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.text()).slice(0, 200); } catch { /* noop */ }
    return {
      ok: false,
      status: res.status,
      gone,
      error: detail || `http_${res.status}`
    };
  }
  return { ok: true, status: res.status, gone: false };
}
