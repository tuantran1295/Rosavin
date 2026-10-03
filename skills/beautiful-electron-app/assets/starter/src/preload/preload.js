'use strict';

// The only bridge between the sandboxed UI and the main process. Keep it small:
// every function maps to one validated ipcMain.handle in main.js.
const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('appApi', {
  getSnapshot: () => ipcRenderer.invoke('app:get-snapshot'),
  toggle: () => ipcRenderer.invoke('app:toggle'),
  start: (minutes) => ipcRenderer.invoke('app:start', minutes),
  stop: () => ipcRenderer.invoke('app:stop'),
  updateSettings: (patch) => ipcRenderer.invoke('app:update-settings', patch),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  closeWindow: () => ipcRenderer.invoke('app:close-window'),
  quit: () => ipcRenderer.invoke('app:quit'),
  onState: (callback) => subscribe('app:state', callback),
  onSettings: (callback) => subscribe('app:settings', callback),
  onNavigate: (callback) => subscribe('app:navigate', callback),
});
