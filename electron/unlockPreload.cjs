const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('unlockApi', { submit: (code) => ipcRenderer.invoke('lock:submit', code) });
