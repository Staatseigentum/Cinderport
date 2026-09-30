const semver = require('semver');
const path = require('node:path');

function isNewerVersion(candidate, current) {
  return Boolean(semver.valid(candidate) && semver.gt(candidate, current));
}

class SelfUpdate {
  constructor({ packaged, preview, version, notify, updater, channel = 'stable' }) {
    this.notify = notify;
    this.state = { phase: packaged && !preview ? 'idle' : 'unavailable', version, latestVersion: null, progress: null, channel };
    if (this.state.phase === 'unavailable') return;
    updater ||= require('electron-updater').autoUpdater;
    this.updater = updater;
    this.configureChannel(channel);
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    updater.on('checking-for-update', () => this.set({ phase: 'checking', progress: null }));
    updater.on('update-available', info => {
      if (!isNewerVersion(info?.version, this.state.version)) return;
      this.set({ phase: 'downloading', latestVersion: info.version, progress: 0 });
    });
    updater.on('update-not-available', info => this.set({ phase: 'ready', latestVersion: info?.version || this.state.version, progress: null }));
    updater.on('download-progress', info => this.set({ phase: 'downloading', progress: Math.round(info.percent) }));
    updater.on('update-downloaded', info => {
      const filename = path.basename(info?.downloadedFile || '');
      const fileVersion = semver.valid(/^Cinderport-Setup-(.+)\.exe$/i.exec(filename)?.[1] || '');
      const version = fileVersion || info?.version;
      if (!isNewerVersion(version, this.state.version)) {
        if (this.state.phase !== 'downloading' && this.state.phase !== 'downloaded') {
          this.set({ phase: 'ready', latestVersion: this.state.version, progress: null });
        }
        return;
      }
      if (isNewerVersion(this.state.latestVersion, version)) return;
      this.set({ phase: 'downloaded', latestVersion: version, progress: 100 });
    });
    updater.on('error', error => this.set({ phase: 'error', progress: null, error: String(error.message || error).slice(0, 300) }));
  }

  set(changes) {
    this.state = { ...this.state, ...changes };
    this.notify(this.snapshot());
  }

  snapshot() { return { ...this.state }; }

  configureChannel(channel) {
    if (!['stable', 'beta'].includes(channel)) throw new Error('Invalid update channel');
    if (!this.updater) { this.state.channel = channel; return; }
    this.updater.channel = channel === 'beta' ? 'beta' : 'latest';
    this.updater.allowPrerelease = channel === 'beta';
    this.updater.allowDowngrade = false;
    this.state.channel = channel;
  }

  setChannel(channel) {
    this.configureChannel(channel);
    this.set({ phase: this.state.phase === 'unavailable' ? 'unavailable' : 'idle', latestVersion: null, progress: null, error: null });
    return this.snapshot();
  }

  async check() {
    if (this.state.phase === 'unavailable' || this.state.phase === 'downloading' ||
      (this.state.phase === 'downloaded' && isNewerVersion(this.state.latestVersion, this.state.version))) return this.snapshot();
    this.set({ phase: 'checking', error: null });
    try { await this.updater.checkForUpdates(); }
    catch (error) { this.set({ phase: 'error', error: String(error.message || error).slice(0, 300) }); }
    return this.snapshot();
  }

  restart() {
    if (this.state.phase !== 'downloaded' || !isNewerVersion(this.state.latestVersion, this.state.version)) return false;
    this.updater.quitAndInstall(false, true);
    return true;
  }
}

module.exports = { SelfUpdate };
