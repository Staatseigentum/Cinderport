const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const { app, BrowserWindow, ipcMain, shell, Tray, Menu, Notification, dialog, clipboard } = require('electron');
const { Library } = require('./library');
const { Preferences } = require('./preferences');
const { SelfUpdate } = require('./self-update');
const { ActivityLog } = require('./activity-log');

if (process.env.CINDERPORT_PREVIEW === '1' && process.env.CINDERPORT_TEST_DATA_DIR) app.setPath('userData', process.env.CINDERPORT_TEST_DATA_DIR);
if (process.platform === 'win32') app.setAppUserModelId('io.staatseigentum.cinderport');
if (!app.requestSingleInstanceLock()) app.quit();

let mainWindow;
let library;
let preferences;
let selfUpdate;
let activity;
let tray;
let quitting = false;
let uiLocale = 'en';

function send(channel, state) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, state);
}

function notificationText(kind, name, version) {
  const de = uiLocale === 'de';
  if (kind === 'self') return { title: 'Cinderport', body: de ? `Version ${version} ist bereit. Jetzt neu starten.` : `Version ${version} is ready. Restart to install.` };
  if (kind === 'install_error') return { title: name, body: de ? 'Installation fehlgeschlagen. Details in Cinderport.' : 'Installation failed. Open Cinderport for details.' };
  return { title: name, body: de ? `Version ${version} wurde installiert.` : `Version ${version} was installed.` };
}

function notifyUser(kind, id, version) {
  if (!preferences?.values.notifications || preferences?.values.doNotDisturb || !Notification.isSupported() || (mainWindow?.isVisible() && mainWindow?.isFocused())) return;
  const name = id === 'cinderport' ? 'Cinderport' : library?.get(id).name || id;
  new Notification({ ...notificationText(kind, name, version), icon: path.join(__dirname, 'assets', 'icon.ico') }).show();
}

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function syncTray() {
  if (!preferences.values.minimizeToTray) { tray?.destroy(); tray = null; return; }
  if (!tray) {
    tray = new Tray(path.join(__dirname, 'assets', 'icon.ico'));
    tray.setToolTip('Cinderport');
    tray.on('double-click', showWindow);
    tray.on('click', showWindow);
  }
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: uiLocale === 'de' ? 'Cinderport öffnen' : 'Open Cinderport', click: showWindow },
    { type: 'separator' },
    { label: uiLocale === 'de' ? 'Beenden' : 'Quit', click: () => { quitting = true; app.quit(); } }
  ]));
}

function diagnosticReport() {
  return [
    `Cinderport ${app.getVersion()} / ${process.platform} ${os.release()} / ${process.arch}`,
    `Channel: ${preferences.values.channel}`,
    `Launcher update: ${selfUpdate.snapshot().phase} / ${selfUpdate.snapshot().latestVersion || 'none'}`,
    `Do not disturb: ${preferences.values.doNotDisturb}`,
    '',
    ...library.snapshot().map(item => `${item.name}: ${item.phase}; installed=${item.installedVersion || 'none'}; latest=${item.latestVersion || 'unknown'}; error=${item.errorCode || 'none'}`),
    '',
    'Recent activity:',
    ...activity.snapshot().slice(0, 10).map(entry => `${entry.at} ${entry.kind} ${entry.id} ${entry.version} ${entry.detail}`)
  ].join('\n');
}

function autostartState() {
  return {
    supported: process.platform === 'win32' && app.isPackaged,
    enabled: app.getLoginItemSettings({ path: process.execPath }).openAtLogin,
    showPrompt: process.platform === 'win32' && app.isPackaged && !preferences.values.autostartPromptSeen
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Cinderport',
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 660,
    frame: false,
    backgroundColor: '#090d1a',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    if (!(preferences.values.minimizeToTray && app.getLoginItemSettings({ path: process.execPath }).wasOpenedAtLogin)) mainWindow.show();
  });
  mainWindow.on('close', event => {
    if (preferences.values.minimizeToTray && !quitting) { event.preventDefault(); mainWindow.hide(); }
  });
  mainWindow.on('maximize', () => mainWindow.webContents.send('window-state', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-state', false));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
}

async function captureScreenshots(directory) {
  mainWindow.setSize(1440, 960);
  await fs.mkdir(directory, { recursive: true });
  await Promise.race([library.refreshing || Promise.resolve(), new Promise(resolve => setTimeout(resolve, 20000))]);
  await mainWindow.webContents.executeJavaScript("window.I18N.setLocale('en'); document.getElementById('autostart-modal').hidden = true");
  for (const view of ['library', 'downloads', 'news', 'activity', 'settings', 'about']) {
    await mainWindow.webContents.executeJavaScript(`document.querySelector('[data-view="${view}"]').click()`);
    await new Promise(resolve => setTimeout(resolve, 500));
    await fs.writeFile(path.join(directory, `cinderport-${view}.png`), (await mainWindow.capturePage()).toPNG());
  }
  await mainWindow.webContents.executeJavaScript("document.querySelector('[data-view=library]').click(); document.querySelector('[data-command=detail][data-id=embercrown]').click()");
  await new Promise(resolve => setTimeout(resolve, 500));
  await fs.writeFile(path.join(directory, 'cinderport-details.png'), (await mainWindow.capturePage()).toPNG());
  await mainWindow.webContents.executeJavaScript("document.getElementById('detail-close').click()");
  await mainWindow.webContents.executeJavaScript("Promise.all([window.cinderport.setChoice('theme','space'), window.cinderport.setPreference('compactView',true)])");
  await new Promise(resolve => setTimeout(resolve, 500));
  await fs.writeFile(path.join(directory, 'cinderport-compact.png'), (await mainWindow.capturePage()).toPNG());
  await mainWindow.webContents.executeJavaScript("document.querySelector('[data-view=settings]').click(); document.getElementById('main-content').scrollTop = document.getElementById('main-content').scrollHeight");
  await new Promise(resolve => setTimeout(resolve, 500));
  await fs.writeFile(path.join(directory, 'cinderport-settings-more.png'), (await mainWindow.capturePage()).toPNG());
  app.quit();
}

app.on('second-instance', () => {
  showWindow();
});

app.whenReady().then(async () => {
  uiLocale = app.getLocale().toLowerCase().startsWith('de') ? 'de' : 'en';
  preferences = new Preferences(app.getPath('userData'));
  await preferences.load();
  activity = new ActivityLog(app.getPath('userData'), entries => send('activity-history', entries));
  await activity.load();
  library = new Library(app.getPath('userData'), items => {
    send('library-state', items);
  }, {
    wixRoot: app.isPackaged ? path.join(process.resourcesPath, 'wix') : path.join(__dirname, '..', 'vendor', 'wix'),
    shouldAutoUpdate: id => !preferences.values.doNotDisturb && preferences.values.autoUpdates[id] !== false,
    launchArgs: id => preferences.values.launchArgs[id] || '',
    onLaunch: id => { void preferences.recordLaunch(id).then(state => send('preferences-state', state)); },
    onEvent: (kind, id, version, detail) => {
      void activity.add(kind, id, version, detail);
      if (['installed', 'updated', 'install_error'].includes(kind)) notifyUser(kind, id, version);
    }
  });
  await library.initialize();
  syncTray();
  let lastUpdatePhase = 'idle';
  selfUpdate = new SelfUpdate({
    packaged: app.isPackaged,
    preview: process.env.CINDERPORT_PREVIEW === '1',
    version: app.getVersion(),
    channel: preferences.values.channel,
    notify: state => {
      send('app-update-state', state);
      if (state.phase !== lastUpdatePhase && ['downloaded', 'error'].includes(state.phase)) {
        void activity.add(state.phase === 'downloaded' ? 'self_ready' : 'self_error', 'cinderport', state.latestVersion || '', state.error || '');
        if (state.phase === 'downloaded') notifyUser('self', 'cinderport', state.latestVersion);
      }
      lastUpdatePhase = state.phase;
    }
  });

  ipcMain.handle('library:state', () => library.snapshot());
  ipcMain.handle('app:locale', () => app.getLocale());
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:update-state', () => selfUpdate.snapshot());
  ipcMain.handle('app:update-check', () => selfUpdate.check());
  ipcMain.handle('app:update-restart', () => { quitting = true; return selfUpdate.restart(); });
  ipcMain.handle('activity:state', () => activity.snapshot());
  ipcMain.handle('preferences:state', () => preferences.snapshot());
  ipcMain.handle('preferences:boolean', async (_event, key, value) => {
    const wasQuiet = preferences.values.doNotDisturb;
    const state = await preferences.setBoolean(key, value);
    if (key === 'minimizeToTray') syncTray();
    if (key === 'doNotDisturb' && value) void library.pauseAutomatic();
    send('preferences-state', state);
    if (key === 'doNotDisturb' && wasQuiet && !value) {
      void library.refreshAll(true);
      void selfUpdate.check();
    }
    return state;
  });
  ipcMain.handle('preferences:choice', async (_event, key, value) => {
    const state = await preferences.setChoice(key, value);
    if (key === 'channel') {
      selfUpdate.setChannel(value);
      if (!preferences.values.doNotDisturb) void selfUpdate.check();
    }
    send('preferences-state', state);
    return state;
  });
  ipcMain.handle('preferences:launch-args', async (_event, id, args) => {
    library.get(id);
    const state = await preferences.setLaunchArgs(id, args);
    send('preferences-state', state);
    return state;
  });
  ipcMain.handle('preferences:export', async () => {
    const result = await dialog.showSaveDialog(mainWindow, { title: 'Export Cinderport settings', defaultPath: 'cinderport-settings.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (result.canceled || !result.filePath) return false;
    await fs.writeFile(result.filePath, JSON.stringify(preferences.exportable(), null, 2));
    void activity.add('settings_exported', 'cinderport');
    return true;
  });
  ipcMain.handle('preferences:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Import Cinderport settings', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (result.canceled || !result.filePaths[0]) return null;
    const raw = await fs.readFile(result.filePaths[0], 'utf8');
    if (raw.length > 100000) throw new Error('Settings file is too large');
    const state = await preferences.importSettings(JSON.parse(raw), library.snapshot().map(item => item.id));
    syncTray();
    selfUpdate.setChannel(state.channel);
    send('preferences-state', state);
    void activity.add('settings_imported', 'cinderport');
    return state;
  });
  ipcMain.handle('preferences:favorite', async (_event, id, enabled) => {
    library.get(id);
    const state = await preferences.setFavorite(id, enabled);
    send('preferences-state', state);
    return state;
  });
  ipcMain.handle('preferences:auto-update', async (_event, id, enabled) => {
    library.get(id);
    const state = await preferences.setAutoUpdate(id, enabled);
    if (!enabled) void library.pauseAutomatic(id);
    send('preferences-state', state);
    return state;
  });
  ipcMain.on('app:ui-locale', (_event, locale) => { uiLocale = locale === 'de' ? 'de' : 'en'; syncTray(); });
  ipcMain.handle('app:autostart-state', () => autostartState());
  ipcMain.handle('app:autostart-set', async (_event, enabled) => {
    if (process.platform !== 'win32' || !app.isPackaged || typeof enabled !== 'boolean') throw new Error('Autostart unavailable');
    app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath });
    await preferences.markPromptSeen();
    return autostartState();
  });
  ipcMain.handle('app:autostart-dismiss', async () => {
    await preferences.markPromptSeen();
    return autostartState();
  });
  ipcMain.handle('library:refresh', () => library.refreshAll(process.env.CINDERPORT_PREVIEW !== '1'));
  ipcMain.handle('library:install', (_event, id) => library.install(id));
  ipcMain.handle('library:cancel', (_event, id) => library.cancel(id));
  ipcMain.handle('library:import', async (_event, id) => {
    const item = library.get(id);
    const result = await dialog.showOpenDialog(mainWindow, { title: item.name, properties: ['openFile'], filters: [{ name: 'Application', extensions: ['exe'] }] });
    if (result.canceled || !result.filePaths[0]) return null;
    return library.importInstallation(id, result.filePaths[0]);
  });
  ipcMain.handle('library:cleanup-cache', () => library.cleanupCache());
  ipcMain.handle('app:diagnostics', () => diagnosticReport());
  ipcMain.handle('app:copy-diagnostics', () => { clipboard.writeText(diagnosticReport()); return true; });
  ipcMain.handle('catalog:upcoming', () => require('./upcoming.json'));
  ipcMain.handle('library:launch', (_event, id) => library.launch(id));
  ipcMain.handle('library:show-file', (_event, id) => {
    const item = library.get(id);
    if (item.executablePath) shell.showItemInFolder(item.executablePath);
  });
  ipcMain.handle('library:open-page', (_event, id, kind) => {
    const item = library.get(id);
    const url = kind === 'itch' ? item.itch : `https://github.com/${item.github}/releases`;
    if (url) return shell.openExternal(url);
  });
  ipcMain.on('window:action', (_event, action) => {
    if (!mainWindow) return;
    if (action === 'minimize') mainWindow.minimize();
    if (action === 'maximize') mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    if (action === 'close') mainWindow.close();
  });
  createWindow();
  if (process.env.CINDERPORT_CAPTURE_DIR) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => void captureScreenshots(process.env.CINDERPORT_CAPTURE_DIR).catch(console.error), 2500);
    });
  }
  if (app.isPackaged && process.env.CINDERPORT_PREVIEW !== '1' && !preferences.values.doNotDisturb) {
    mainWindow.webContents.once('did-finish-load', () => { void selfUpdate.check(); });
  }
  setInterval(() => {
    void library.refreshAll(process.env.CINDERPORT_PREVIEW !== '1');
    if (app.isPackaged && process.env.CINDERPORT_PREVIEW !== '1' && !preferences.values.doNotDisturb) void selfUpdate.check();
  }, 30 * 60 * 1000);
});

app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
