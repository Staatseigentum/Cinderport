const fs = require('node:fs/promises');
const path = require('node:path');

class Preferences {
  constructor(directory) {
    this.file = path.join(directory, 'preferences.json');
    this.values = {
      autostartPromptSeen: false,
      minimizeToTray: false,
      notifications: true,
      doNotDisturb: false,
      compactView: false,
      reduceMotion: false,
      theme: 'cinder',
      channel: 'stable',
      favorites: [],
      lastLaunched: {},
      autoUpdates: {},
      launchArgs: {}
    };
    this.writing = Promise.resolve();
  }

  async load() {
    try {
      const saved = JSON.parse(await fs.readFile(this.file, 'utf8'));
      this.values.autostartPromptSeen = saved.autostartPromptSeen === true;
      this.values.minimizeToTray = saved.minimizeToTray === true;
      this.values.notifications = saved.notifications !== false;
      this.values.doNotDisturb = saved.doNotDisturb === true;
      this.values.compactView = saved.compactView === true;
      this.values.reduceMotion = saved.reduceMotion === true;
      this.values.theme = ['cinder', 'ember', 'space'].includes(saved.theme) ? saved.theme : 'cinder';
      this.values.channel = ['stable', 'beta'].includes(saved.channel) ? saved.channel : 'stable';
      this.values.favorites = Array.isArray(saved.favorites) ? [...new Set(saved.favorites.filter(value => typeof value === 'string'))] : [];
      this.values.lastLaunched = saved.lastLaunched && typeof saved.lastLaunched === 'object' ? saved.lastLaunched : {};
      this.values.autoUpdates = saved.autoUpdates && typeof saved.autoUpdates === 'object' ? saved.autoUpdates : {};
      this.values.launchArgs = saved.launchArgs && typeof saved.launchArgs === 'object' ? saved.launchArgs : {};
    } catch { /* First launch. */ }
    return this.snapshot();
  }

  snapshot() { return structuredClone(this.values); }

  async save() {
    this.writing = this.writing.catch(() => {}).then(async () => {
      const temp = `${this.file}.tmp`;
      await fs.writeFile(temp, JSON.stringify(this.values, null, 2));
      await fs.rename(temp, this.file);
    });
    return this.writing;
  }

  async markPromptSeen() {
    this.values.autostartPromptSeen = true;
    await this.save();
  }

  async setBoolean(key, value) {
    if (!['minimizeToTray', 'notifications', 'doNotDisturb', 'compactView', 'reduceMotion'].includes(key) || typeof value !== 'boolean') throw new Error('Invalid preference');
    this.values[key] = value;
    await this.save();
    return this.snapshot();
  }

  async setFavorite(id, enabled) {
    if (typeof id !== 'string' || typeof enabled !== 'boolean') throw new Error('Invalid favorite');
    this.values.favorites = enabled
      ? [...new Set([...this.values.favorites, id])]
      : this.values.favorites.filter(value => value !== id);
    await this.save();
    return this.snapshot();
  }

  async setAutoUpdate(id, enabled) {
    if (typeof id !== 'string' || typeof enabled !== 'boolean') throw new Error('Invalid update preference');
    if (enabled) delete this.values.autoUpdates[id];
    else this.values.autoUpdates[id] = false;
    await this.save();
    return this.snapshot();
  }

  async recordLaunch(id) {
    this.values.lastLaunched[id] = Date.now();
    await this.save();
    return this.snapshot();
  }

  async setChoice(key, value) {
    const choices = { theme: ['cinder', 'ember', 'space'], channel: ['stable', 'beta'] };
    if (!choices[key]?.includes(value)) throw new Error('Invalid preference');
    this.values[key] = value;
    await this.save();
    return this.snapshot();
  }

  async setLaunchArgs(id, args) {
    if (typeof id !== 'string' || typeof args !== 'string' || args.length > 500) throw new Error('Invalid launch arguments');
    if (args.trim()) this.values.launchArgs[id] = args.trim();
    else delete this.values.launchArgs[id];
    await this.save();
    return this.snapshot();
  }

  exportable() {
    const { theme, channel, minimizeToTray, notifications, doNotDisturb, compactView, reduceMotion, favorites, autoUpdates, launchArgs } = this.values;
    return { format: 'cinderport-settings', version: 1, theme, channel, minimizeToTray, notifications, doNotDisturb, compactView, reduceMotion, favorites, autoUpdates, launchArgs };
  }

  async importSettings(data, validIds) {
    if (!data || data.format !== 'cinderport-settings' || data.version !== 1) throw new Error('Invalid Cinderport settings file');
    const ids = new Set(validIds);
    for (const key of ['minimizeToTray', 'notifications', 'doNotDisturb', 'compactView', 'reduceMotion']) {
      if (typeof data[key] === 'boolean') this.values[key] = data[key];
    }
    if (['cinder', 'ember', 'space'].includes(data.theme)) this.values.theme = data.theme;
    if (['stable', 'beta'].includes(data.channel)) this.values.channel = data.channel;
    this.values.favorites = Array.isArray(data.favorites) ? [...new Set(data.favorites.filter(id => ids.has(id)))] : [];
    this.values.autoUpdates = Object.fromEntries(Object.entries(data.autoUpdates || {}).filter(([id, enabled]) => ids.has(id) && enabled === false));
    this.values.launchArgs = Object.fromEntries(Object.entries(data.launchArgs || {}).filter(([id, args]) => ids.has(id) && typeof args === 'string' && args.length <= 500));
    await this.save();
    return this.snapshot();
  }
}

module.exports = { Preferences };
