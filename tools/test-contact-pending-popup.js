/* Regresión: pop-up de mensaje pendiente de soporte tras login. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const contactJs = fs.readFileSync(path.join(root, 'js', 'contact.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
const hotkeys = fs.readFileSync(path.join(root, 'js', 'hotkeys.js'), 'utf8');

assert(/id="contact-pending-modal"/.test(indexHtml), 'modal de mensaje pendiente en index.html');
assert(/id="contact-pending-open"/.test(indexHtml), 'CTA Ver mensaje en el modal');
assert(/id="contact-pending-close"/.test(indexHtml), 'botón cerrar en el modal');
assert(/contact-pending-modal/.test(css), 'estilos del pop-up de soporte');
assert(/#contact-pending-modal:not\(\.hidden\)/.test(hotkeys), 'hotkeys detectan el modal de soporte');

assert(/pt_contact_pending_popup/.test(contactJs), 'clave sessionStorage del pop-up');
assert(/loginAt/.test(contactJs), 'pop-up acotado por loginAt (una vez por login)');
assert(/function maybeShowPendingPopup/.test(contactJs), 'maybeShowPendingPopup definido');
assert(/function showPendingPopup/.test(contactJs), 'showPendingPopup definido');
assert(/function canShowPendingPopup/.test(contactJs), 'canShowPendingPopup definido');
assert(/maybeShowPendingPopup\(unread, totalUnread\)/.test(contactJs), 'renderHomeNotice dispara el pop-up');
assert(/pt-cloud-login-sync-finished/.test(contactJs), 'reintento tras sync de login');
assert(/openContactThread\(threadId\)/.test(contactJs), 'CTA abre hilo de contacto');
assert(/Tienes un mensaje de soporte/.test(contactJs), 'copy del aviso de soporte');
assert(/home-boot-active/.test(contactJs), 'espera a que termine el boot de home');

console.log('OK contact pending popup');
