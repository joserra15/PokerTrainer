/* Cliente Web Push: iOS, plataforma, VAPID decode, deep link. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'js/push.js'), 'utf8');

function load(nav) {
  const sandbox = {
    window: {},
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    Uint8Array,
    URL,
    Promise,
    navigator: nav || { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' },
    Notification: { permission: 'default' },
    PushManager: function () {},
    location: { href: 'https://www.pokerforgeai.com/' },
    addEventListener() {},
    fetch() { return Promise.resolve({ ok: true, json: async () => ({}) }); },
    console
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  sandbox.PT_PUSH = { enabled: true, vapidPublicKey: 'B' + 'A'.repeat(86) };
  sandbox.PTPwa = {
    isIOS() { return /iPhone|iPad|iPod/.test(sandbox.navigator.userAgent); },
    isStandalone() { return !!sandbox.navigator.standalone; }
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'push.js' });
  return sandbox.window.PTPush;
}

const desktop = load({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  serviceWorker: {}
});
assert.ok(desktop, 'PTPush');
assert.strictEqual(desktop.detectPlatform(), 'desktop');
assert.strictEqual(desktop.iosBlockReason(), '');
assert.ok(typeof desktop.buildOpenUrl === 'function');
assert.ok(/source=push/.test(desktop.buildOpenUrl('./?source=push&tab=play')));

const bytes = desktop.urlBase64ToUint8Array('AQIDBA');
assert.ok(bytes instanceof Uint8Array || bytes.length >= 1, 'urlBase64ToUint8Array');

const android = load({
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel) Chrome/120 Mobile',
  serviceWorker: {}
});
assert.strictEqual(android.detectPlatform(), 'android');

const iosTab = load({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605',
  standalone: false,
  serviceWorker: {}
});
assert.strictEqual(iosTab.detectPlatform(), 'ios');
assert.strictEqual(iosTab.iosBlockReason(), 'ios_not_installed');
assert.strictEqual(iosTab.isStandaloneIOS(), false);

const iosPwa = load({
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605',
  standalone: true,
  serviceWorker: {}
});
assert.strictEqual(iosPwa.isStandaloneIOS(), true);
assert.strictEqual(iosPwa.iosBlockReason(), '');

assert.ok(/async function subscribe/.test(src) && /requestPermission/.test(src),
  'pide permiso en subscribe');
assert.ok(/userVisibleOnly:\s*true/.test(src), 'userVisibleOnly');
assert.ok(/push-subscribe/.test(src) && /push-unsubscribe/.test(src), 'endpoints subscribe');
assert.ok(/type:\s*'test'/.test(src), 'self-test type=test');
assert.ok(/endpoint:\s*sub/.test(src), 'self-test filtra endpoint actual');

console.log('*** push-client OK ***');
