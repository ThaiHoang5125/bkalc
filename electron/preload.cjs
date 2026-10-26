const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gpaApi', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (text) => ipcRenderer.invoke('data:save', text),
  dataPath: () => ipcRenderer.invoke('data:path'),
  ocr: (bytes) => ipcRenderer.invoke('ocr:image', bytes),
  saveFile: (opts) => ipcRenderer.invoke('file:save', opts),
});
