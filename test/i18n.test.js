const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'i18n.js'), 'utf8');

async function load(systemLocale, savedLocale = null) {
  const values = new Map(savedLocale ? [['cinderport-locale', savedLocale]] : []);
  const document = { documentElement: { lang: '' }, querySelectorAll: () => [] };
  const window = { cinderport: { systemLocale: async () => systemLocale }, dispatchEvent: () => {} };
  const context = { window, document, localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) }, Event: class Event {} };
  vm.runInNewContext(source, context);
  await window.I18N.initialize();
  return { i18n: window.I18N, document, values };
}

test('uses German for a German Windows locale', async () => {
  const { i18n, document } = await load('de-AT');
  assert.equal(document.documentElement.lang, 'de');
  assert.equal(i18n.t('action.install'), 'Installieren');
});

test('falls back to English for unsupported system languages', async () => {
  const { i18n, document } = await load('fr-FR');
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(i18n.t('action.install'), 'Install');
});

test('a manual choice is restored on the next start', async () => {
  const { i18n, values } = await load('en-US');
  i18n.setLocale('de');
  assert.equal(values.get('cinderport-locale'), 'de');
  const next = await load('en-US', values.get('cinderport-locale'));
  assert.equal(next.i18n.t('action.install'), 'Installieren');
});
