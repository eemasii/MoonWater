import { app, BrowserWindow, shell } from 'electron';
import * as http from 'http';
import { startServer } from './server.js';

let mainWindow: BrowserWindow | null = null;
let httpServer: http.Server | null = null;

async function createWindow() {
  // Start the embedded Express + Swiss Ephemeris server in-process on an available localhost port
  const userDataDir = app.getPath('userData');
  const { server, port } = await startServer(0, userDataDir);
  httpServer = server;

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#090d16',
    title: 'Moonwater Studio — Astrología Computacional',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (err) {
    console.error('Failed to initialize Moonwater Desktop:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
