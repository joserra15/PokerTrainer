/* Regresión: callback OAuth Supabase se consume de forma explícita (no solo detectSessionInUrl). */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const bootstrap = fs.readFileSync(path.join(root, 'js/auth-bootstrap.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'js/supabase-client.js'), 'utf8');
const guard = fs.readFileSync(path.join(root, 'js/build-guard.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');

assert(/exchangeCodeForSession/.test(bootstrap), 'auth-bootstrap intercambia ?code=');
assert(/setSession/.test(bootstrap), 'auth-bootstrap soporta #access_token');
assert(/cleanOAuthUrl/.test(bootstrap), 'limpia URL sin dejar /#');
assert(/detectSessionInUrl:\s*false/.test(client), 'detectSessionInUrl false (consumo explícito)');
assert(/flowType:\s*'pkce'/.test(client), 'flowType pkce');
assert(/hasOAuthCallback/.test(guard), 'build-guard no recarga durante OAuth callback');
assert(!/accounts\.google\.com\/gsi\/client/.test(indexHtml), 'GSI no se carga siempre en index');
assert(/accounts\.google\.com/.test(indexHtml) && /style-src[^"]*accounts\.google\.com/.test(indexHtml),
  'CSP permite estilos GSI por si hay fallback');
assert(/PT_BUILD\s*=\s*'2.5.40'/.test(version), 'PT_BUILD 2.5.40');

console.log('*** oauth-callback-explicit OK ***');
