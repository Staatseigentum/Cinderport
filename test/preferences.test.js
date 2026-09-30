const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Preferences } = require('../src/preferences');

test('autostart prompt is shown only until the first choice', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinderport-prefs-'));
  try {
    const first = new Preferences(directory);
    await first.load();
    assert.equal(first.values.autostartPromptSeen, false);
    await first.markPromptSeen();
    const next = new Preferences(directory);
    await next.load();
    assert.equal(next.values.autostartPromptSeen, true);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('theme, update choices and launch arguments survive export and import', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinderport-prefs-'));
  try {
    const original = new Preferences(directory);
    await original.load();
    await original.setChoice('theme', 'space');
    await original.setChoice('channel', 'beta');
    await original.setBoolean('compactView', true);
    await original.setFavorite('kollaps', true);
    await original.setAutoUpdate('kollaps', false);
    await original.setLaunchArgs('kollaps', '--windowed "two words"');
    const exported = original.exportable();
    assert.equal(exported.theme, 'space');
    assert.equal(exported.channel, 'beta');
    const imported = new Preferences(path.join(directory, 'imported'));
    await fs.mkdir(path.dirname(imported.file), { recursive: true });
    await imported.load();
    await imported.importSettings({ ...exported, favorites: [...exported.favorites, 'unknown'] }, ['kollaps']);
    const restored = new Preferences(path.dirname(imported.file));
    await restored.load();
    assert.equal(restored.values.compactView, true);
    assert.deepEqual(restored.values.favorites, ['kollaps']);
    assert.equal(restored.values.autoUpdates.kollaps, false);
    assert.equal(restored.values.launchArgs.kollaps, '--windowed "two words"');
    assert.equal(restored.values.channel, 'beta');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
