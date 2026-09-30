class SelfUpdate {
  constructor({ packaged, preview, version, notify, updater }) {
    this.notify = notify;
    this.state = { phase: packaged && !preview ? 'idle' : 'unavailable', version, latestVersion: null, progress: null };
    if (this.state.phase === 'unavailable') return;
    updater ||= require('electron-updater').autoUpdater;
    this.updater = updater;
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    updater.on('checking-for-update', () => this.set({ phase: 'checking', progress: null }));
    updater.on('update-available', info => this.set({ phase: 'downloading', latestVersion: info.version, progress: 0 }));
    updater.on('update-not-available', () => this.set({ phase: 'ready', progress: null }));
    updater.on('download-progress', info => this.set({ phase: 'downloading', progress: Math.round(info.percent) }));
    updater.on('update-downloaded', info => this.set({ phase: 'downloaded', latestVersion: info.version, progress: 100 }));
    updater.on('error', error => this.set({ phase: 'error', progress: null, error: String(error.message || error).slice(0, 300) }));
  }

  set(changes) {
    this.state = { ...this.state, ...changes };
    this.notify(this.snapshot());
  }

  snapshot() { return { ...this.state }; }

  async check() {
    if (this.state.phase === 'unavailable' || this.state.phase === 'downloading' || this.state.phase === 'downloaded') return this.snapshot();
    this.set({ phase: 'checking', error: null });
    try { await this.updater.checkForUpdates(); }
    catch (error) { this.set({ phase: 'error', error: String(error.message || error).slice(0, 300) }); }
    return this.snapshot();
  }

  restart() {
    if (this.state.phase !== 'downloaded') return false;
    this.updater.quitAndInstall(false, true);
    return true;
  }
}

module.exports = { SelfUpdate };
