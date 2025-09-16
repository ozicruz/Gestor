// main.js
const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// CORREÇÃO: Importamos o módulo 'server.js' UMA VEZ.
const serverModule = require('./backend/server');
// E então pegamos a variável 'db' DELE.
const db = serverModule.db;

const PORT = 3002;
// Usamos a variável correta para iniciar o servidor.
serverModule.startServer(PORT);

// --- MODO DE DEPURAÇÃO PARA O PDF ---
const DEBUG_PDF = false;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
  mainWindow.maximize();
};

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src http://localhost:3002"
        ]
      }
    });
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.on('print-to-pdf', async (event, args) => {
    const { html, name } = args;
    const parentWindow = BrowserWindow.fromWebContents(event.sender);

    if (DEBUG_PDF) {
        console.log('[DEBUG-PDF] A abrir janela de depuração.');
        const debugWindow = new BrowserWindow({
            width: 800,
            height: 600,
            parent: parentWindow,
            modal: true,
            show: true
        });
        debugWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
        debugWindow.webContents.openDevTools();
    } else {
        const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
            title: 'Salvar Recibo em PDF',
            defaultPath: name,
            filters: [ { name: 'Documentos PDF', extensions: ['pdf'] } ]
        });

        if (!canceled && filePath) {
            const offscreenWindow = new BrowserWindow({ show: false });
            offscreenWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));

            offscreenWindow.webContents.on('did-finish-load', () => {
                setTimeout(async () => {
                    try {
                        const pdfData = await offscreenWindow.webContents.printToPDF({
                            marginsType: 0,
                            printBackground: true,
                            pageSize: 'A4'
                        });
                        fs.writeFileSync(filePath, pdfData);
                    } catch (error) {
                        console.error('Erro ao gerar o PDF:', error);
                        dialog.showErrorBox('Erro ao Gerar PDF', 'Não foi possível salvar o recibo.');
                    } finally {
                        offscreenWindow.close();
                    }
                }, 300);
            });
        }
    }
});

app.on('before-quit', () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Erro ao fechar o banco de dados:', err.message);
      }
      console.log('Conexão com o banco de dados fechada.');
    });
  }
});