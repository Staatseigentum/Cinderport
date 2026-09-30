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
