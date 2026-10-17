/* Plantillas de mensajes admin: migración, panel, selector y personalización {nombre}. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const mig = read('supabase/migrations/069_admin_message_templates.sql');
assert.ok(/pt_admin_message_templates/.test(mig), 'tabla plantillas');
assert.ok(/pt_admin_list_message_templates/.test(mig), 'RPC list');
assert.ok(/pt_admin_create_message_template/.test(mig), 'RPC create');
assert.ok(/pt_admin_update_message_template/.test(mig), 'RPC update');
assert.ok(/pt_admin_delete_message_template/.test(mig), 'RPC delete');
assert.ok(/pt_admin_message_personalize/.test(mig), 'personalize helper');
assert.ok(/\{\s*nombre\s*\}/.test(mig) || /nombre/.test(mig), 'placeholder nombre');
assert.ok(/create or replace function public\.pt_admin_contact_send/.test(mig), 'send personaliza');
assert.ok(/create or replace function public\.pt_admin_contact_reply/.test(mig), 'reply personaliza');
assert.ok(/Hola \{nombre\}/.test(mig), 'semillas con saludo');

const html = read('index.html');
assert.ok(/id="admin-msg-templates-btn"/.test(html), 'botón Plantillas');
assert.ok(/id="admin-msg-templates-panel"/.test(html), 'panel plantillas');
assert.ok(/id="admin-msg-tpl-create"/.test(html), 'form crear plantilla');
assert.ok(/\{nombre\}/.test(html), 'hint {nombre} en HTML');

const chunks = read('js/bundle-chunks.js');
assert.ok(/admin-message-templates\.js/.test(chunks), 'chunk admin incluye plantillas');

const tplSrc = read('js/admin-message-templates.js');
assert.ok(/PTAdminMessageTemplates/.test(tplSrc), 'export global');
assert.ok(/function personalize/.test(tplSrc), 'personalize client');
assert.ok(/pt_admin_list_message_templates/.test(tplSrc), 'carga RPC');
assert.ok(/pickerHtml/.test(tplSrc) && /bindPicker/.test(tplSrc), 'API picker');

const adminSrc = read('js/admin-panel.js');
assert.ok(/messageTemplatePickerHtml/.test(adminSrc), 'picker en admin-panel');
assert.ok(/admin-compose-tpl-picker/.test(adminSrc), 'picker en compose');
assert.ok(/admin-detail-tpl-picker/.test(adminSrc), 'picker en detalle');
assert.ok(/admin-reply-tpl-picker/.test(adminSrc), 'picker en reply');
assert.ok(/singleRecipientName/.test(adminSrc), 'nombre destinatario único');
assert.ok(/hideMessageTemplatesPanel/.test(adminSrc), 'oculta panel plantillas');

const css = read('css/styles.css');
assert.ok(/admin-msg-templates-panel/.test(css), 'estilos panel');
assert.ok(/admin-msg-tpl-picker/.test(css), 'estilos selector');

const sandbox = {
  window: {},
  console,
  document: {
    readyState: 'complete',
    body: { classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} } },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  },
  addEventListener() {},
  PTAdmin: { hasAccess() { return true; }, lockdown() {} }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(tplSrc, sandbox, { filename: 'admin-message-templates.js' });

const Api = sandbox.window.PTAdminMessageTemplates || sandbox.PTAdminMessageTemplates;
assert.ok(Api, 'PTAdminMessageTemplates');
assert.strictEqual(Api.personalize('Hola {nombre}, bienvenido', 'Ana López'), 'Hola Ana, bienvenido');
assert.strictEqual(Api.personalize('Hi {name}!', 'Bob'), 'Hi Bob!');
assert.strictEqual(Api.personalize('Hola {{nombre}}', 'Carla'), 'Hola Carla');
assert.strictEqual(Api.personalize('Hola {nombre}', ''), 'Hola jugador');
assert.strictEqual(Api.firstNameFrom('María del Mar'), 'María');

const picker = Api.pickerHtml('test-picker');
assert.ok(/id="test-picker"/.test(picker), 'picker html id');
assert.ok(/data-admin-msg-tpl-picker/.test(picker), 'picker marker');

console.log('*** admin-message-templates OK ***');
