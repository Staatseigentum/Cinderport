const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ActivityLog } = require('../src/activity-log');

test('activity history persists and is newest first', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cinderport-history-'));
  try {
    const first = new ActivityLog(directory);
    await first.load();
    await first.add('installed', 'embercrown', '0.5.2');
    await first.add('launched', 'embercrown', '0.5.2');
    const next = new ActivityLog(directory);
    await next.load();
    assert.deepEqual(next.snapshot().map(entry => entry.kind), ['launched', 'installed']);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
