// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expõe a função 'send' do ipcRenderer para a janela da aplicação
// de forma segura, sob o nome 'electronAPI'.
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => ipcRenderer.send(channel, data)
});