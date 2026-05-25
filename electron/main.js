const { app, BrowserWindow, shell, dialog, utilityProcess } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')

const PORT = 3456
let mainWindow
let serverProcess

function loadEnv() {
  const envFile = app.isPackaged
    ? path.join(process.resourcesPath, '.env.local')
    : path.join(__dirname, '..', '.env.local')

  if (!fs.existsSync(envFile)) return {}

  const result = {}
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    // Restore escaped newlines (common in Firebase private keys)
    val = val.replace(/\\n/g, '\n')
    result[key] = val
  }
  return result
}

function waitForServer(maxTries = 60) {
  return new Promise((resolve, reject) => {
    let tries = 0
    function check() {
      const req = http.get(`http://127.0.0.1:${PORT}`, () => resolve())
      req.on('error', () => {
        if (++tries >= maxTries) return reject(new Error('Server timed out'))
        setTimeout(check, 1000)
      })
      req.end()
    }
    check()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Munyonyo Soccer Team',
    show: false,
    autoHideMenuBar: true,
  })

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  // Open external links in the system browser instead of a new Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  const envVars = loadEnv()

  if (app.isPackaged) {
    // Production: run the Next.js standalone server via Electron's built-in Node.js runtime
    const serverScript = path.join(process.resourcesPath, 'server', 'server.js')
    serverProcess = utilityProcess.fork(serverScript, [], {
      env: {
        ...process.env,
        ...envVars,
        PORT: String(PORT),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
        APP_DB_PATH: path.join(app.getPath('userData'), 'munyonyo.db'),
      },
    })

    serverProcess.on('exit', (code) => {
      if (code !== 0) console.error(`[server] exited with code ${code}`)
    })
  }

  try {
    await waitForServer()
    createWindow()
  } catch {
    dialog.showErrorBox(
      'Startup Failed',
      'The application server failed to start. Please restart the app.'
    )
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill()
})
