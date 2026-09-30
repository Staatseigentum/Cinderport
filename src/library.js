const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFile } = require('node:child_process');
const { createHash } = require('node:crypto');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const semver = require('semver');
const catalog = require('./catalog');
const { latestRelease, isNewer, LauncherError } = require('./release');

const MAX_DOWNLOAD = 1024 * 1024 * 1024;

function run(command, args, timeout = 10000) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true, timeout, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

function runInstaller(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0 || code === 3010) resolve();
      else reject(new LauncherError('installer_failed', code));
    });
  });
}

async function readRegistry() {
  if (process.platform !== 'win32') return [];
  const script = [
    "$paths = @('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')",
    '$items = Get-ItemProperty $paths -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName } | Select-Object DisplayName,DisplayVersion,InstallLocation,DisplayIcon',
    '@($items) | ConvertTo-Json -Compress'
  ].join('; ');
  try {
    const raw = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
    const value = JSON.parse(raw.trim());
    return Array.isArray(value) ? value : [value];
  } catch {
    return [];
  }
}

function registryName(item) {
  return item.registryName || item.name;
}

function candidateDirectories(item, registryEntry, storedPath) {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const names = item.installFolders || [item.name];
  const dirs = [];
  if (storedPath) dirs.push(path.dirname(storedPath));
  if (registryEntry?.InstallLocation) dirs.push(registryEntry.InstallLocation);
  if (registryEntry?.DisplayIcon) {
    const icon = registryEntry.DisplayIcon.replace(/,\d+$/, '').replace(/^"|"$/g, '');
    dirs.push(path.dirname(icon));
  }
  for (const name of names) {
    dirs.push(path.join(local, name));
    dirs.push(path.join(local, 'Programs', name));
    dirs.push(path.join(programFiles, name));
  }
  return [...new Set(dirs.filter(Boolean))];
}

async function findExeIn(dir, filename, depth = 2) {
  if (depth < 0) return null;
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return null; }
  const match = entries.find(entry => entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase());
  if (match) return path.join(dir, match.name);
  for (const entry of entries) {
    if (!entry.isDirectory() || /^(runtime|jre|resources|uninstall)$/i.test(entry.name)) continue;
    const found = await findExeIn(path.join(dir, entry.name), filename, depth - 1);
    if (found) return found;
  }
  return null;
}

async function findExecutable(item, registryEntry, storedPath) {
  if (storedPath) {
    try { if ((await fs.stat(storedPath)).isFile()) return storedPath; }
    catch { /* Continue searching. */ }
  }
  for (const dir of candidateDirectories(item, registryEntry, storedPath)) {
    const found = await findExeIn(dir, item.executable);
    if (found) return found;
  }
  return null;
}

async function fileVersion(executablePath) {
  if (process.platform !== 'win32') return null;
  try {
    const raw = await new Promise((resolve, reject) => {
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '(Get-Item -LiteralPath $env:CINDERPORT_EXE).VersionInfo.FileVersion'], {
        windowsHide: true,
        timeout: 5000,
        env: { ...process.env, CINDERPORT_EXE: executablePath }
      }, (error, stdout) => error ? reject(error) : resolve(stdout));
    });
    return semver.valid(semver.coerce(raw.trim()));
  } catch { return null; }
}

async function downloadFile(release, target, progress) {
  const response = await fetch(release.url, { signal: AbortSignal.timeout(900000) });
  if (!response.ok || !response.body || new URL(response.url).protocol !== 'https:') {
    throw new LauncherError('download_failed', response.status);
  }
  const advertised = Number(response.headers.get('content-length') || release.size || 0);
  if (advertised > MAX_DOWNLOAD) throw new LauncherError('download_too_large');
  let received = 0;
  const hash = createHash('sha256');
  const meter = new Transform({
    transform(chunk, _encoding, done) {
      received += chunk.length;
      if (received > MAX_DOWNLOAD) return done(new LauncherError('download_too_large'));
      hash.update(chunk);
      progress(advertised ? Math.min(99, Math.round(received / advertised * 100)) : null, received, advertised);
      done(null, chunk);
    }
  });
  await pipeline(Readable.fromWeb(response.body), meter, require('node:fs').createWriteStream(target));
  if (hash.digest('hex') !== release.sha256) {
    throw new LauncherError('checksum');
  }
  progress(100, received, advertised);
}

class Library {
  constructor(dataDir, notify = () => {}, options = {}) {
    this.dataDir = dataDir;
    this.notify = notify;
    this.wixRoot = options.wixRoot || path.join(__dirname, '..', 'vendor', 'wix');
    this.recordsFile = path.join(dataDir, 'installations.json');
    this.records = {};
    this.items = new Map(catalog.map(item => [item.id, {
      ...item,
      installedVersion: null,
      latestVersion: null,
      executablePath: null,
      phase: 'idle',
      progress: null,
      errorCode: null,
      errorDetail: null,
      release: null
    }]));
    this.busy = new Set();
    this.refreshing = null;
  }

  snapshot() {
    return [...this.items.values()].map(({ release, asset, ...item }) => ({
      ...item,
      releasePage: release?.page || null,
      releaseNotes: release?.notes || ''
    }));
  }

  emit() { this.notify(this.snapshot()); }

  get(id) {
    const item = this.items.get(id);
    if (!item) throw new LauncherError('unknown');
    return item;
  }

  async initialize() {
    await fs.mkdir(this.dataDir, { recursive: true });
    try { this.records = JSON.parse(await fs.readFile(this.recordsFile, 'utf8')); }
    catch { this.records = {}; }
    await this.detectInstallations();
  }

  async detectInstallations() {
    const registry = await readRegistry();
    for (const item of this.items.values()) {
      const entry = registry.find(value => value.DisplayName?.toLowerCase() === registryName(item).toLowerCase());
      const stored = this.records[item.id];
      const executable = await findExecutable(item, entry, stored?.executablePath);
      item.executablePath = executable;
      item.installedVersion = executable ? (entry?.DisplayVersion || stored?.version || await fileVersion(executable) || '0.0.0') : null;
      if (!executable && stored) delete this.records[item.id];
    }
    await this.saveRecords();
    this.emit();
  }

  async saveRecords() {
    const temp = `${this.recordsFile}.tmp`;
    await fs.writeFile(temp, JSON.stringify(this.records, null, 2));
    await fs.rename(temp, this.recordsFile);
  }

  async refreshAll(autoUpdate = true) {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      await this.detectInstallations();
      for (const item of this.items.values()) await this.checkOne(item.id, autoUpdate);
    })().finally(() => { this.refreshing = null; });
    return this.refreshing;
  }

  async checkOne(id, autoUpdate = false) {
    const item = this.get(id);
    if (this.busy.has(id)) return;
    item.phase = 'checking';
    item.errorCode = null;
    item.errorDetail = null;
    this.emit();
    try {
      item.release = await latestRelease(item);
      item.latestVersion = item.release.version;
      item.phase = item.installedVersion
        ? (isNewer(item.latestVersion, item.installedVersion) ? 'update' : 'ready')
        : 'available';
      this.emit();
      if (autoUpdate && item.phase === 'update') await this.install(id);
    } catch (error) {
      item.phase = 'error';
      item.errorCode = error.code || 'unknown';
      item.errorDetail = error.detail || '';
      this.emit();
    }
  }

  async install(id) {
    const item = this.get(id);
    if (this.busy.has(id)) return;
    this.busy.add(id);
    const downloadDir = path.join(this.dataDir, 'downloads');
    let target;
    let partial;
    let extracted;
    try {
      if (!item.release) {
        item.phase = 'checking';
        this.emit();
        item.release = await latestRelease(item);
        item.latestVersion = item.release.version;
      }
      await fs.mkdir(downloadDir, { recursive: true });
      target = path.join(downloadDir, `${item.id}-${item.release.version}${path.extname(item.release.name)}`);
      partial = `${target}.part`;
      await fs.rm(partial, { force: true });
      item.phase = 'downloading';
      item.progress = 0;
      item.errorCode = null;
      item.errorDetail = null;
      this.emit();
      await downloadFile(item.release, partial, (percent) => {
        if (percent === null || percent === item.progress) return;
        item.progress = percent;
        this.emit();
      });
      await fs.rename(partial, target);
      item.phase = 'installing';
      item.progress = null;
      this.emit();
      if (item.type === 'msi') await runInstaller('msiexec.exe', ['/i', target, '/qn', '/norestart']);
      else if (item.type === 'burn') {
        // Embercrown's public EXE wraps its MSI. Extract that MSI so INSTALLDIR
        // can preserve an existing custom folder during a silent update.
        extracted = await fs.mkdtemp(path.join(os.tmpdir(), 'cinderport-ember-'));
        await run(path.join(this.wixRoot, 'dark.exe'), ['-nologo', '-x', extracted, target, path.join(extracted, 'bundle.wxs')], 60000);
        const container = path.join(extracted, 'AttachedContainer');
        const msi = (await fs.readdir(container)).find(name => /^Embercrown-[\d.]+\.msi$/i.test(name));
        if (!msi) throw new LauncherError('asset_missing');
        const installFolder = item.executablePath
          ? path.dirname(item.executablePath)
          : path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Embercrown');
        await runInstaller('msiexec.exe', ['/i', path.join(container, msi), '/qn', '/norestart', `INSTALLDIR=${installFolder}`]);
      }
      else if (item.type === 'nsis') await runInstaller(target, ['/S']);
      else throw new LauncherError('unknown');

      // Installers can return before the executable becomes visible to the filesystem.
      let executable = null;
      for (let attempt = 0; attempt < 8 && !executable; attempt++) {
        const registry = await readRegistry();
        const entry = registry.find(value => value.DisplayName?.toLowerCase() === registryName(item).toLowerCase());
        executable = await findExecutable(item, entry, item.executablePath);
        if (!executable) await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (!executable) throw new LauncherError('exe_missing');
      item.executablePath = executable;
      item.installedVersion = item.release.version;
      item.phase = 'ready';
      this.records[id] = { version: item.installedVersion, executablePath: executable };
      await this.saveRecords();
      this.emit();
    } catch (error) {
      item.phase = 'error';
      item.errorCode = error.code || 'unknown';
      item.errorDetail = error.detail || '';
      this.emit();
    } finally {
      this.busy.delete(id);
      if (target) await fs.rm(target, { force: true }).catch(() => {});
      if (partial) await fs.rm(partial, { force: true }).catch(() => {});
      if (extracted) await fs.rm(extracted, { force: true, recursive: true }).catch(() => {});
    }
  }

  async launch(id) {
    const item = this.get(id);
    if (!item.executablePath) throw new LauncherError('exe_missing');
    await fs.access(item.executablePath);
    const child = spawn(item.executablePath, [], {
      cwd: path.dirname(item.executablePath),
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
  }
}

module.exports = { Library, findExecutable, downloadFile };
