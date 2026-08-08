/* RG-G03 — demo-mode / sample-session APIs coherentes. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const demoSrc = fs.readFileSync(path.join(root, 'js/demo-mode.js'), 'utf8');
const sampleSrc = fs.readFileSync(path.join(root, 'js/sample-session.js'), 'utf8');

assert.ok(/PTDemo/.test(demoSrc), 'PTDemo');
assert.ok(/isActive|DEMO_USER_ID|pt_demo_mode/.test(demoSrc), 'demo flags');
assert.ok(/start|stop|bindUi/.test(demoSrc), 'demo lifecycle');
assert.ok(/account-demo-stop/.test(demoSrc), 'exit demo menu id');
assert.ok(/Salir del modo demo/.test(demoSrc), 'exit demo menu label');
assert.ok(/ensureDemoMenuExit/.test(demoSrc), 'exit demo menu injector');

assert.ok(/PTSampleSession/.test(sampleSrc), 'PTSampleSession');
assert.ok(/SAMPLE_ID|ensureForUser|isSampleId/.test(sampleSrc), 'sample APIs');
assert.ok(/demo-session\.json|pt_sample/.test(sampleSrc), 'sample data source');

const localStore = {};
const sandbox = {
  window: {},
  console,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  },
  addEventListener() {},
  dispatchEvent() { return true; },
  CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
  fetch: async () => ({
    ok: true,
    json: async () => ({ id: 'pt_sample_session_v1', hands: [{ id: '1' }], nTotal: 1 })
  })
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

// Cargar sample-session sin auto-bind de demo DOM
vm.runInContext(sampleSrc.replace(/\bbindUi\(\)\s*;?/, ''), sandbox, { filename: 'sample-session.js' });
const Sample = sandbox.window.PTSampleSession;
assert.ok(Sample, 'PTSampleSession export');
if (Sample.SAMPLE_ID) assert.ok(/sample/i.test(Sample.SAMPLE_ID));
if (Sample.isSampleId) {
  assert.strictEqual(Sample.isSampleId(Sample.SAMPLE_ID || 'pt_sample_session_v1'), true);
  assert.strictEqual(Sample.isSampleId('other'), false);
}

const demoJson = path.join(root, 'data/demo-session.json');
if (fs.existsSync(demoJson)) {
  const data = JSON.parse(fs.readFileSync(demoJson, 'utf8'));
  assert.ok(data.hands || data.nTotal != null || data.id, 'demo-session.json coherente');
}

/* Runtime: en modo demo se inyecta "Salir del modo demo" en el menú de cuenta. */
(function testDemoMenuExit() {
  const sessionStore = {};
  const local = {};
  const nodes = new Map();
  const bodyClass = { list: [] };
  function el(tag, id) {
    const children = [];
    const node = {
      tagName: String(tag).toUpperCase(),
      id: id || '',
      className: '',
      textContent: '',
      type: '',
      dataset: {},
      parentNode: null,
      children,
      style: {},
      setAttribute() {},
      addEventListener() {},
      classList: {
        add(c) { if (!node.className.split(/\s+/).includes(c)) node.className = (node.className + ' ' + c).trim(); },
        remove(c) { node.className = node.className.split(/\s+/).filter((x) => x && x !== c).join(' '); },
        contains(c) { return node.className.split(/\s+/).includes(c); },
        toggle(c, on) {
          if (on == null) on = !node.classList.contains(c);
          if (on) node.classList.add(c); else node.classList.remove(c);
        }
      },
      querySelector(sel) {
        if (sel === '#demo-mode-stop' || sel === '#account-demo-stop') {
          return children.find((c) => c.id === sel.slice(1)) || null;
        }
        if (sel === '.account-dropdown-actions') {
          return children.find((c) => c.className.includes('account-dropdown-actions')) || null;
        }
        return null;
      },
      remove() {
        if (node.parentNode) {
          const p = node.parentNode;
          const i = p.children.indexOf(node);
          if (i >= 0) p.children.splice(i, 1);
          node.parentNode = null;
        }
        if (node.id) nodes.delete(node.id);
      },
      prepend(child) {
        child.parentNode = node;
        children.unshift(child);
        if (child.id) nodes.set(child.id, child);
      },
      insertBefore(child, ref) {
        child.parentNode = node;
        const i = ref ? children.indexOf(ref) : -1;
        if (i >= 0) children.splice(i, 0, child);
        else children.push(child);
        if (child.id) nodes.set(child.id, child);
      },
      appendChild(child) {
        child.parentNode = node;
        children.push(child);
        if (child.id) nodes.set(child.id, child);
        return child;
      }
    };
    if (id) nodes.set(id, node);
    return node;
  }

  const actions = el('div');
  actions.className = 'account-dropdown-actions';
  const settings = el('button', 'account-settings');
  const admin = el('button', 'account-admin');
  const sync = el('button', 'account-sync');
  actions.appendChild(settings);
  actions.appendChild(admin);
  actions.appendChild(sync);

  const dropdown = el('div', 'account-dropdown');
  dropdown.appendChild(actions);
  const body = el('body');
  body.classList = {
    toggle(c, on) {
      if (on) {
        if (!bodyClass.list.includes(c)) bodyClass.list.push(c);
      } else {
        bodyClass.list = bodyClass.list.filter((x) => x !== c);
      }
    }
  };

  const demoSandbox = {
    console,
    sessionStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(sessionStore, k) ? sessionStore[k] : null),
      setItem: (k, v) => { sessionStore[k] = String(v); },
      removeItem: (k) => { delete sessionStore[k]; }
    },
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(local, k) ? local[k] : null),
      setItem: (k, v) => { local[k] = String(v); },
      removeItem: (k) => { delete local[k]; }
    },
    document: {
      readyState: 'complete',
      body,
      getElementById: (id) => nodes.get(id) || null,
      querySelector: (sel) => {
        if (sel === '#account-dropdown .account-dropdown-actions') return actions;
        return null;
      },
      createElement: (tag) => el(tag),
      addEventListener() {}
    },
    addEventListener() {},
    location: { reload() {} },
    PTAuth: { getUser() { return { isAdmin: true }; }, collapseAccountAccordion() {} }
  };
  demoSandbox.window = demoSandbox;
  demoSandbox.global = demoSandbox;
  vm.createContext(demoSandbox);

  // Activar flag antes de cargar el módulo
  sessionStore.pt_demo_mode_v1 = '1';
  vm.runInContext(demoSrc, demoSandbox, { filename: 'demo-mode.js' });
  const PTDemo = demoSandbox.PTDemo;
  assert.ok(PTDemo && PTDemo.isActive(), 'demo active');
  const exitBtn = nodes.get('account-demo-stop');
  assert.ok(exitBtn, 'menu exit button injected');
  assert.strictEqual(exitBtn.textContent, 'Salir del modo demo');
  assert.ok(actions.children.includes(exitBtn), 'button under account actions');

  PTDemo.stop();
  PTDemo.bindUi();
  assert.strictEqual(nodes.get('account-demo-stop'), undefined, 'menu exit removed when inactive');
})();

console.log('*** demo-sample OK ***');
