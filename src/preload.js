const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cinderport', {
  state: () => ipcRenderer.invoke('library:state'),
  systemLocale: () => ipcRenderer.invoke('app:locale'),
  version: () => ipcRenderer.invoke('app:version'),
  updateState: () => ipcRenderer.invoke('app:update-state'),
  checkUpdate: () => ipcRenderer.invoke('app:update-check'),
  restartForUpdate: () => ipcRenderer.invoke('app:update-restart'),
  autostartState: () => ipcRenderer.invoke('app:autostart-state'),
  setAutostart: enabled => ipcRenderer.invoke('app:autostart-set', enabled),
  dismissAutostart: () => ipcRenderer.invoke('app:autostart-dismiss'),
  refresh: () => ipcRenderer.invoke('library:refresh'),
  install: id => ipcRenderer.invoke('library:install', id),
  launch: id => ipcRenderer.invoke('library:launch', id),
  showFile: id => ipcRenderer.invoke('library:show-file', id),
  openPage: (id, kind) => ipcRenderer.invoke('library:open-page', id, kind),
  windowAction: action => ipcRenderer.send('window:action', action),
  onState: callback => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('library-state', handler);
    return () => ipcRenderer.removeListener('library-state', handler);
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
