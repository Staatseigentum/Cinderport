const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cinderport', {
  state: () => ipcRenderer.invoke('library:state'),
  systemLocale: () => ipcRenderer.invoke('app:locale'),
  version: () => ipcRenderer.invoke('app:version'),
  updateState: () => ipcRenderer.invoke('app:update-state'),
  checkUpdate: () => ipcRenderer.invoke('app:update-check'),
  restartForUpdate: () => ipcRenderer.invoke('app:update-restart'),
  activity: () => ipcRenderer.invoke('activity:state'),
  preferences: () => ipcRenderer.invoke('preferences:state'),
  setPreference: (key, value) => ipcRenderer.invoke('preferences:boolean', key, value),
  setChoice: (key, value) => ipcRenderer.invoke('preferences:choice', key, value),
  setFavorite: (id, enabled) => ipcRenderer.invoke('preferences:favorite', id, enabled),
  setAppAutoUpdate: (id, enabled) => ipcRenderer.invoke('preferences:auto-update', id, enabled),
  setLaunchArgs: (id, args) => ipcRenderer.invoke('preferences:launch-args', id, args),
  exportSettings: () => ipcRenderer.invoke('preferences:export'),
  importSettings: () => ipcRenderer.invoke('preferences:import'),
  setUiLocale: locale => ipcRenderer.send('app:ui-locale', locale),
  autostartState: () => ipcRenderer.invoke('app:autostart-state'),
  setAutostart: enabled => ipcRenderer.invoke('app:autostart-set', enabled),
  dismissAutostart: () => ipcRenderer.invoke('app:autostart-dismiss'),
  refresh: () => ipcRenderer.invoke('library:refresh'),
  install: id => ipcRenderer.invoke('library:install', id),
  cancel: id => ipcRenderer.invoke('library:cancel', id),
  importApp: id => ipcRenderer.invoke('library:import', id),
  cleanupCache: () => ipcRenderer.invoke('library:cleanup-cache'),
  diagnostics: () => ipcRenderer.invoke('app:diagnostics'),
  copyDiagnostics: () => ipcRenderer.invoke('app:copy-diagnostics'),
  upcoming: () => ipcRenderer.invoke('catalog:upcoming'),
  launch: id => ipcRenderer.invoke('library:launch', id),
  showFile: id => ipcRenderer.invoke('library:show-file', id),
  openPage: (id, kind) => ipcRenderer.invoke('library:open-page', id, kind),
  windowAction: action => ipcRenderer.send('window:action', action),
  onState: callback => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('library-state', handler);
    return () => ipcRenderer.removeListener('library-state', handler);
  },
  onActivity: callback => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('activity-history', handler);
    return () => ipcRenderer.removeListener('activity-history', handler);
  },
  onPreferences: callback => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('preferences-state', handler);
    return () => ipcRenderer.removeListener('preferences-state', handler);
  },
  onWindowState: callback => {
    const handler = (_event, maximized) => callback(maximized);
    ipcRenderer.on('window-state', handler);
    return () => ipcRenderer.removeListener('window-state', handler);
  },
  onUpdateState: callback => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('app-update-state', handler);
    return () => ipcRenderer.removeListener('app-update-state', handler);
  }
});
