const fs = require('node:fs/promises');
const path = require('node:path');

class ActivityLog {
  constructor(directory, notify = () => {}) {
    this.file = path.join(directory, 'activity.json');
    this.notify = notify;
    this.entries = [];
    this.writing = Promise.resolve();
  }

  async load() {
    try {
      const saved = JSON.parse(await fs.readFile(this.file, 'utf8'));
      this.entries = Array.isArray(saved) ? saved.filter(entry => entry && typeof entry.kind === 'string').slice(0, 100) : [];
    } catch { /* First launch. */ }
    this.notify(this.snapshot());
  }

  snapshot() { return this.entries.map(entry => ({ ...entry })); }

  async add(kind, id, version = '', detail = '') {
    this.entries.unshift({ kind, id, version, detail: String(detail).slice(0, 200), at: new Date().toISOString() });
    this.entries.length = Math.min(this.entries.length, 100);
    this.notify(this.snapshot());
    this.writing = this.writing.catch(() => {}).then(async () => {
      const temp = `${this.file}.tmp`;
      await fs.writeFile(temp, JSON.stringify(this.entries, null, 2));
      await fs.rename(temp, this.file);
    });
    await this.writing;
  }
}

module.exports = { ActivityLog };
