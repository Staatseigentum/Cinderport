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

function parseLaunchArgs(input = '') {
  const result = [];
  let current = '';
  let quoted = false;
  let started = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') { quoted = !quoted; started = true; }
    else if (char === '\\' && input[index + 1] === '"') { current += '"'; index++; started = true; }
    else if (/\s/.test(char) && !quoted) {
      if (started) { result.push(current); current = ''; started = false; }
    } else { current += char; started = true; }
  }
  if (quoted) throw new LauncherError('invalid_arguments');
  if (started) result.push(current);
  return result;
}

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

async function isRunning(executablePath) {
  if (process.platform !== 'win32' || !executablePath) return false;
  try {
    const script = '$name = [IO.Path]::GetFileNameWithoutExtension($env:CINDERPORT_EXE); @(Get-Process -Name $name -ErrorAction SilentlyContinue | Where-Object { $_.Path -ieq $env:CINDERPORT_EXE }).Count';
    const raw = await new Promise((resolve, reject) => {
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        windowsHide: true, timeout: 5000, env: { ...process.env, CINDERPORT_EXE: executablePath }
      }, (error, stdout) => error ? reject(error) : resolve(stdout));
    });
    return Number(raw.trim()) > 0;
  } catch { return false; }
}

async function downloadFile(release, target, progress, signal) {
  const timeout = AbortSignal.timeout(900000);
  const response = await fetch(release.url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!response.ok || !response.body || new URL(response.url).protocol !== 'https:') {
    throw new LauncherError('download_failed', response.status);
  }
  const advertised = Number(response.headers.get('content-length') || release.size || 0);
  if (advertised > MAX_DOWNLOAD) throw new LauncherError('download_too_large');
  let received = 0;
  const started = Date.now();
  let lastReport = 0;
  const hash = createHash('sha256');
  const meter = new Transform({
    transform(chunk, _encoding, done) {
      received += chunk.length;
      if (received > MAX_DOWNLOAD) return done(new LauncherError('download_too_large'));
      hash.update(chunk);
      const now = Date.now();
      if (now - lastReport >= 400 || (advertised && received >= advertised)) {
        const speed = received / Math.max(1, (now - started) / 1000);
        progress(advertised ? Math.min(99, Math.round(received / advertised * 100)) : null, received, advertised, speed, advertised ? Math.max(0, (advertised - received) / speed) : null);
        lastReport = now;
      }
      done(null, chunk);
    }
  });
  await pipeline(Readable.fromWeb(response.body), meter, require('node:fs').createWriteStream(target));
  if (hash.digest('hex') !== release.sha256) {
    throw new LauncherError('checksum');
  }
  progress(100, received, advertised, 0, 0);
}

class Library {
  constructor(dataDir, notify = () => {}, options = {}) {
    this.dataDir = dataDir;
    this.notify = notify;
    this.wixRoot = options.wixRoot || path.join(__dirname, '..', 'vendor', 'wix');
    this.onEvent = options.onEvent || (() => {});
    this.onLaunch = options.onLaunch || (() => {});
    this.shouldAutoUpdate = options.shouldAutoUpdate || (() => true);
    this.launchArgs = options.launchArgs || (() => '');
    this.recordsFile = path.join(dataDir, 'installations.json');
    this.records = {};
    this.items = new Map(catalog.map(item => [item.id, {
      ...item,
      installedVersion: null,
      latestVersion: null,
      executablePath: null,
      phase: 'idle',
      progress: null,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      eta: null,
      errorCode: null,
      errorDetail: null,
      release: null
    }]));
    this.pending = new Map();
    this.queue = [];
    this.waiting = new Map();
    this.activeJob = null;
    this.waitTimer = null;
    this.refreshing = null;
  }

  snapshot() {
    return [...this.items.values()].map(({ release, asset, ...item }) => ({
      ...item,
      queuePosition: this.queue.findIndex(job => job.id === item.id) + 1 || null,
      downloadSize: release?.size || 0,
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
    if (this.pending.has(id)) return;
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
      if (autoUpdate && item.phase === 'update' && this.shouldAutoUpdate(id)) void this.install(id, { automatic: true });
    } catch (error) {
      item.phase = 'error';
      item.errorCode = error.code || 'unknown';
      item.errorDetail = error.detail || '';
      this.emit();
    }
  }

  async install(id, { automatic = false } = {}) {
    const item = this.get(id);
    if (this.pending.has(id)) return this.pending.get(id);
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    const job = { id, resolve, cancelled: false, controller: null, automatic };
    this.pending.set(id, promise);
    this.queue.push(job);
    item.phase = 'queued';
    item.progress = 0;
    item.errorCode = null;
    item.errorDetail = null;
    this.emit();
    void this.processQueue();
    return promise;
  }

  basePhase(item) {
    if (!item.installedVersion) return 'available';
    return item.latestVersion && isNewer(item.latestVersion, item.installedVersion) ? 'update' : 'ready';
  }

  finishJob(job) {
    this.pending.delete(job.id);
    job.resolve();
    this.emit();
  }

  async cancel(id) {
    const item = this.get(id);
    const queued = this.queue.findIndex(job => job.id === id);
    if (queued >= 0) {
      const [job] = this.queue.splice(queued, 1);
      item.phase = this.basePhase(item);
      this.onEvent('cancelled', id);
      this.finishJob(job);
      return true;
    }
    if (this.waiting.has(id)) {
      const job = this.waiting.get(id);
      this.waiting.delete(id);
      item.phase = this.basePhase(item);
      this.onEvent('cancelled', id);
      this.finishJob(job);
      if (!this.waiting.size && this.waitTimer) { clearInterval(this.waitTimer); this.waitTimer = null; }
      return true;
    }
    if (this.activeJob?.id === id && ['checking', 'downloading'].includes(item.phase)) {
      this.activeJob.cancelled = true;
      this.activeJob.controller?.abort();
      return true;
    }
    return false;
  }

  async pauseAutomatic(id = null) {
    const ids = [
      ...this.queue.filter(job => job.automatic && (!id || job.id === id)).map(job => job.id),
      ...[...this.waiting.values()].filter(job => job.automatic && (!id || job.id === id)).map(job => job.id)
    ];
    if (this.activeJob?.automatic && (!id || this.activeJob.id === id) && ['checking', 'downloading'].includes(this.get(this.activeJob.id).phase)) ids.push(this.activeJob.id);
    for (const target of ids) await this.cancel(target);
  }

  scheduleWaiting() {
    if (this.waitTimer) return;
    this.waitTimer = setInterval(() => { void this.resumeWaiting(); }, 5000);
  }

  async resumeWaiting() {
    if (this.resumingWaiting) return;
    this.resumingWaiting = true;
    try {
      for (const [id, job] of [...this.waiting]) {
        if (await isRunning(this.get(id).executablePath)) continue;
        if (!this.waiting.has(id)) continue;
        this.waiting.delete(id);
        this.queue.push(job);
        this.get(id).phase = 'queued';
      }
      if (!this.waiting.size && this.waitTimer) { clearInterval(this.waitTimer); this.waitTimer = null; }
      this.emit();
      void this.processQueue();
    } finally { this.resumingWaiting = false; }
  }

  async processQueue() {
    if (this.activeJob) return;
    while (this.queue.length) {
      const job = this.queue.shift();
      this.activeJob = job;
      const item = this.get(job.id);
      if (item.executablePath && await isRunning(item.executablePath)) {
        item.phase = 'waiting';
        this.waiting.set(job.id, job);
        this.activeJob = null;
        this.scheduleWaiting();
        this.emit();
        continue;
      }
      job.controller = new AbortController();
      await this.runInstall(item, job);
      this.activeJob = null;
      this.finishJob(job);
    }
  }

  async runInstall(item, job) {
    const id = item.id;
    const wasInstalled = Boolean(item.installedVersion);
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
      if (job.cancelled) throw new LauncherError('cancelled');
      try {
        const stat = await fs.statfs(this.dataDir);
        const free = Number(stat.bavail) * Number(stat.bsize);
        const required = Math.max(150 * 1024 * 1024, (item.release.size || 0) * (item.type === 'burn' ? 3 : 2));
        if (free < required) throw new LauncherError('low_disk', Math.ceil(required / 1024 ** 2));
      } catch (error) {
        if (error.code === 'low_disk') throw error;
        // Some Windows filesystems do not expose statfs; the installer will report errors there.
      }
      await fs.mkdir(downloadDir, { recursive: true });
      target = path.join(downloadDir, `${item.id}-${item.release.version}${path.extname(item.release.name)}`);
      partial = `${target}.part`;
      await fs.rm(partial, { force: true });
      item.phase = 'downloading';
      item.progress = 0;
      item.downloadedBytes = 0;
      item.totalBytes = item.release.size || 0;
      item.speed = 0;
      item.eta = null;
      item.errorCode = null;
      item.errorDetail = null;
      this.emit();
      const downloadStarted = Date.now();
      await downloadFile(item.release, partial, (percent, received, total, speed, eta) => {
        item.progress = percent;
        item.downloadedBytes = received;
        item.totalBytes = total;
        item.speed = speed;
        item.eta = eta;
        this.emit();
      }, job.controller.signal);
      // Give small packages enough on-screen time for the completed transfer
      // to be visible before switching the card to the installer state.
      const displayTimeLeft = 900 - (Date.now() - downloadStarted);
      if (displayTimeLeft > 0) await new Promise(resolve => setTimeout(resolve, displayTimeLeft));
      if (job.cancelled) throw new LauncherError('cancelled');
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
      this.onEvent(wasInstalled ? 'updated' : 'installed', id, item.installedVersion);
      this.emit();
    } catch (error) {
      if (job.cancelled || error.code === 'cancelled' || error.name === 'AbortError') {
        item.phase = this.basePhase(item);
        item.errorCode = null;
        item.errorDetail = null;
        this.onEvent('cancelled', id);
      } else {
        item.phase = 'error';
        item.errorCode = error.code || 'unknown';
        item.errorDetail = error.detail || error.message || '';
        this.onEvent('install_error', id, item.latestVersion || '', item.errorCode);
      }
      this.emit();
    } finally {
      if (target) await fs.rm(target, { force: true }).catch(() => {});
      if (partial) await fs.rm(partial, { force: true }).catch(() => {});
      if (extracted) await fs.rm(extracted, { force: true, recursive: true }).catch(() => {});
    }
  }

  async launch(id) {
    const item = this.get(id);
    if (!item.executablePath) throw new LauncherError('exe_missing');
    await fs.access(item.executablePath);
    await new Promise((resolve, reject) => {
      const child = spawn(item.executablePath, parseLaunchArgs(this.launchArgs(id)), {
        cwd: path.dirname(item.executablePath),
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
      child.once('spawn', () => { child.unref(); resolve(); });
      child.once('error', reject);
    });
    this.onLaunch(id);
    this.onEvent('launched', id, item.installedVersion || '');
  }

  async importInstallation(id, executablePath) {
    const item = this.get(id);
    if (path.basename(executablePath).toLowerCase() !== item.executable.toLowerCase()) throw new LauncherError('wrong_executable');
    if (!(await fs.stat(executablePath)).isFile()) throw new LauncherError('exe_missing');
    item.executablePath = executablePath;
    item.installedVersion = await fileVersion(executablePath) || '0.0.0';
    item.phase = item.latestVersion && isNewer(item.latestVersion, item.installedVersion) ? 'update' : 'ready';
    this.records[id] = { version: item.installedVersion, executablePath };
    await this.saveRecords();
    this.onEvent('imported', id, item.installedVersion);
    this.emit();
    return this.snapshot();
  }

  async cleanupCache() {
    const directory = path.join(this.dataDir, 'downloads');
    let removed = 0;
    let bytesFreed = 0;
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch { return { removed, bytesFreed }; }
    const active = this.activeJob?.id || null;
    for (const entry of entries) {
      if (!entry.isFile() || (active && entry.name.startsWith(active + '-'))) continue;
      const filename = path.join(directory, entry.name);
      const stat = await fs.stat(filename);
      await fs.rm(filename, { force: true });
      removed++;
      bytesFreed += stat.size;
    }
    return { removed, bytesFreed };
  }
}

module.exports = { Library, findExecutable, downloadFile, isRunning, parseLaunchArgs };
