const fs = require('node:fs/promises');
const path = require('node:path');

class Preferences {
  constructor(directory) {
    this.file = path.join(directory, 'preferences.json');
    this.values = { autostartPromptSeen: false };
  }

  async load() {
    try {
      const saved = JSON.parse(await fs.readFile(this.file, 'utf8'));
      this.values.autostartPromptSeen = saved.autostartPromptSeen === true;
    } catch { /* First launch. */ }
    return this.values;
  }

  async markPromptSeen() {
    this.values.autostartPromptSeen = true;
    const temp = `${this.file}.tmp`;
    await fs.writeFile(temp, JSON.stringify(this.values, null, 2));
    await fs.rename(temp, this.file);
  }
}

module.exports = { Preferences };
