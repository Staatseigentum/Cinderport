const path = require('node:path');
const fs = require('node:fs/promises');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { Library } = require('./library');
const { Preferences } = require('./preferences');
const { SelfUpdate } = require('./self-update');

if (process.platform === 'win32') app.setAppUserModelId('io.staatseigentum.cinderport');
if (!app.requestSingleInstanceLock()) app.quit();

let mainWindow;
let library;
let preferences;
let selfUpdate;

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
  mainWindow.once('ready-to-show', () => mainWindow.show());
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
  for (const view of ['library', 'activity', 'about']) {
    await mainWindow.webContents.executeJavaScript(`document.querySelector('[data-view="${view}"]').click()`);
    await new Promise(resolve => setTimeout(resolve, 500));
    await fs.writeFile(path.join(directory, `cinderport-${view}.png`), (await mainWindow.capturePage()).toPNG());
  }
  app.quit();
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  library = new Library(app.getPath('userData'), items => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library-state', items);
  }, { wixRoot: app.isPackaged ? path.join(process.resourcesPath, 'wix') : path.join(__dirname, '..', 'vendor', 'wix') });
  await library.initialize();
  preferences = new Preferences(app.getPath('userData'));
  await preferences.load();
  selfUpdate = new SelfUpdate({
    packaged: app.isPackaged,
    preview: process.env.CINDERPORT_PREVIEW === '1',
    version: app.getVersion(),
    notify: state => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('app-update-state', state);
    }
  });

  ipcMain.handle('library:state', () => library.snapshot());
  ipcMain.handle('app:locale', () => app.getLocale());
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:update-state', () => selfUpdate.snapshot());
  ipcMain.handle('app:update-check', () => selfUpdate.check());
  ipcMain.handle('app:update-restart', () => selfUpdate.restart());
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
  if (app.isPackaged && process.env.CINDERPORT_PREVIEW !== '1') {
    mainWindow.webContents.once('did-finish-load', () => { void selfUpdate.check(); });
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
