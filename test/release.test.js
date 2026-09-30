const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const catalog = require('../src/catalog');
const { latestRelease, isNewer } = require('../src/release');
const { downloadFile, parseLaunchArgs } = require('../src/library');

test('Kollaps selects the MSI installer and its published digest', async () => {
  const release = await latestRelease(catalog[1], async () => ({
    ok: true,
    json: async () => ({
      tag_name: 'v5.2.0',
      assets: [
        { name: 'Kollaps-5.2.0-windows-portabel.zip' },
        { name: 'Kollaps-5.2.0-setup.msi', digest: `sha256:${'a'.repeat(64)}`, browser_download_url: 'https://github.com/Staatseigentum/Boredom/releases/download/v5.2.0/Kollaps-5.2.0-setup.msi', size: 100 }
      ]
    })
  }));
  assert.equal(release.name, 'Kollaps-5.2.0-setup.msi');
  assert.equal(release.version, '5.2.0');
  assert.equal(release.sha256, 'a'.repeat(64));
  assert.equal(isNewer(release.version, '5.1.3'), true);
  assert.equal(isNewer(release.version, '5.2.0'), false);
});

test('releases without a GitHub SHA-256 digest are rejected', async () => {
  await assert.rejects(() => latestRelease(catalog[0], async () => ({
    ok: true,
    json: async () => ({
      tag_name: 'v0.6.0',
      assets: [{ name: 'Embercrown-windows-Setup.exe', browser_download_url: 'https://github.com/a/b' }]
    })
  })), { code: 'digest_missing' });
});

test('download accepts matching bytes and rejects a mismatched digest', async () => {
  const bytes = Buffer.from('verified installer fixture');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const originalFetch = global.fetch;
  global.fetch = async () => {
    const response = new Response(bytes, { status: 200, headers: { 'content-length': String(bytes.length) } });
    Object.defineProperty(response, 'url', { value: 'https://release-assets.githubusercontent.com/asset' });
    return response;
  };
  const file = path.join(os.tmpdir(), `cinderport-${process.pid}-download-test.exe`);
  try {
    await downloadFile({ url: 'https://github.com/test', sha256, size: bytes.length }, file, () => {});
    assert.deepEqual(await fs.readFile(file), bytes);
    await assert.rejects(() => downloadFile({ url: 'https://github.com/test', sha256: '0'.repeat(64), size: bytes.length }, file, () => {}), { code: 'checksum' });
  } finally {
    global.fetch = originalFetch;
    await fs.rm(file, { force: true });
  }
});

test('download reports intermediate progress before completion', async () => {
  const chunks = [Buffer.alloc(5, 1), Buffer.alloc(5, 2)];
  const bytes = Buffer.concat(chunks);
  const originalFetch = global.fetch;
  global.fetch = async () => {
    const response = new Response(new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      }
    }), { status: 200, headers: { 'content-length': String(bytes.length) } });
    Object.defineProperty(response, 'url', { value: 'https://release-assets.githubusercontent.com/asset' });
    return response;
  };
  const file = path.join(os.tmpdir(), `cinderport-${process.pid}-progress-test.exe`);
  const reports = [];
  try {
    await downloadFile({ url: 'https://github.com/test', sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length }, file,
      (percent, received) => reports.push({ percent, received }));
    assert.deepEqual(reports.map(report => report.percent), [50, 99, 100]);
    assert.deepEqual(reports.map(report => report.received), [5, 10, 10]);
  } finally {
    global.fetch = originalFetch;
    await fs.rm(file, { force: true });
  }
});

test('launch arguments preserve quoted values without invoking a shell', () => {
  assert.deepEqual(parseLaunchArgs('--windowed --title "Two words"'), ['--windowed', '--title', 'Two words']);
  assert.throws(() => parseLaunchArgs('--title "unfinished'), { code: 'invalid_arguments' });
});
