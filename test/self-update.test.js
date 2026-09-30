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
