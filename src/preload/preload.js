'use strict';

// The only bridge between the sandboxed UI and the main process.
const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('rosavin', {
  getSnapshot: () => ipcRenderer.invoke('rosavin:get-snapshot'),
  toggle: () => ipcRenderer.invoke('rosavin:toggle'),
  activate: (minutes) => ipcRenderer.invoke('rosavin:activate', minutes),
  deactivate: () => ipcRenderer.invoke('rosavin:deactivate'),
  updateSettings: (patch) => ipcRenderer.invoke('rosavin:update-settings', patch),
  openExternal: (url) => ipcRenderer.invoke('rosavin:open-external', url),
  closeWindow: () => ipcRenderer.invoke('rosavin:close-window'),
  quit: () => ipcRenderer.invoke('rosavin:quit'),
  onState: (callback) => subscribe('rosavin:state', callback),
  onSettings: (callback) => subscribe('rosavin:settings', callback),
  onNavigate: (callback) => subscribe('rosavin:navigate', callback),
});
