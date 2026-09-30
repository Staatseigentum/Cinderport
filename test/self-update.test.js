const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { SelfUpdate } = require('../src/self-update');

test('Cinderport updates download on check and install when the app quits', async () => {
  const updater = new EventEmitter();
  let checks = 0;
  let restarts = 0;
  updater.checkForUpdates = async () => { checks++; updater.emit('update-available', { version: '0.3.0' }); };
  updater.quitAndInstall = () => { restarts++; };
  const seen = [];
  const self = new SelfUpdate({ packaged: true, preview: false, version: '0.2.0', notify: state => seen.push(state), updater });
  assert.equal(updater.autoDownload, true);
  assert.equal(updater.autoInstallOnAppQuit, true);
  await self.check();
  assert.equal(checks, 1);
  assert.equal(self.snapshot().phase, 'downloading');
  updater.emit('download-progress', { percent: 47.8 });
  assert.equal(self.snapshot().progress, 48);
  updater.emit('update-downloaded', { version: '0.3.0' });
  assert.equal(self.snapshot().phase, 'downloaded');
  assert.equal(self.restart(), true);
  assert.equal(restarts, 1);
  assert.ok(seen.some(state => state.phase === 'downloaded'));
});

test('development preview never contacts the release feed', async () => {
  const updater = new EventEmitter();
  updater.checkForUpdates = () => { throw new Error('unexpected'); };
  const self = new SelfUpdate({ packaged: false, preview: true, version: '0.2.0', notify: () => {}, updater });
  assert.equal((await self.check()).phase, 'unavailable');
  assert.equal(self.restart(), false);
});

test('switching between stable and beta configures the GitHub updater', () => {
  const updater = new EventEmitter();
  const self = new SelfUpdate({ packaged: true, preview: false, version: '0.3.0', notify: () => {}, updater, channel: 'stable' });
  assert.equal(updater.channel, 'latest');
  assert.equal(updater.allowPrerelease, false);
  self.setChannel('beta');
  assert.equal(updater.channel, 'beta');
  assert.equal(updater.allowPrerelease, true);
  self.setChannel('stable');
  assert.equal(updater.channel, 'latest');
  assert.equal(updater.allowPrerelease, false);
});

test('a stale downloaded event cannot block a newer launcher release', async () => {
  const updater = new EventEmitter();
  let checks = 0;
  updater.checkForUpdates = async () => { checks++; updater.emit('update-available', { version: '0.3.1' }); };
  updater.quitAndInstall = () => {};
  const self = new SelfUpdate({ packaged: true, preview: false, version: '0.3.0', notify: () => {}, updater });
  updater.emit('update-downloaded', { version: '0.3.0' });
  assert.equal(self.snapshot().phase, 'ready');
  assert.equal(self.restart(), false);
  await self.check();
  assert.equal(checks, 1);
  updater.emit('update-downloaded', { version: '0.3.0' });
  assert.equal(self.snapshot().phase, 'downloading');
  assert.equal(self.snapshot().latestVersion, '0.3.1');
  assert.equal(self.restart(), false);
  updater.emit('update-downloaded', { version: '0.3.0', downloadedFile: 'C:\\Temp\\Cinderport-Setup-0.3.1.exe' });
  assert.equal(self.snapshot().phase, 'downloaded');
  assert.equal(self.snapshot().latestVersion, '0.3.1');
});

test('an old installer cannot mark the next release as downloaded', async () => {
  const updater = new EventEmitter();
  updater.checkForUpdates = async () => updater.emit('update-available', { version: '0.3.2' });
  updater.quitAndInstall = () => {};
  const self = new SelfUpdate({ packaged: true, preview: false, version: '0.3.1', notify: () => {}, updater });
  await self.check();
  updater.emit('update-downloaded', { version: '0.3.1', downloadedFile: 'C:\\Temp\\Cinderport-Setup-0.3.1.exe' });
  assert.equal(self.snapshot().phase, 'downloading');
  assert.equal(self.restart(), false);
});

test('the downloaded installer filename resolves a stale event version', () => {
  const updater = new EventEmitter();
  updater.quitAndInstall = () => {};
  const self = new SelfUpdate({ packaged: true, preview: false, version: '0.2.0', notify: () => {}, updater });
  updater.emit('update-downloaded', { version: '0.2.0', downloadedFile: 'C:\\Temp\\Cinderport-Setup-0.3.0.exe' });
  assert.equal(self.snapshot().phase, 'downloaded');
  assert.equal(self.snapshot().latestVersion, '0.3.0');
});
