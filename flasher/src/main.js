const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path  = require('path')
const fs    = require('fs')
const https = require('https')
const http  = require('http')
const { exec } = require('child_process')
const drivelist = require('drivelist')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 520,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'FPP-OS USB Flasher'
  })
  mainWindow.loadFile(path.join(__dirname, 'index.html'))
  mainWindow.setMenuBarVisibility(false)
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())

// ── Get latest release info from GitHub ──────────────────────────────────────
ipcMain.handle('get-latest-release', async () => {
  return new Promise((resolve, reject) => {
    const builtForVersion = process.env.VITE_FPP_VERSION || app.getVersion()
    const options = {
      hostname: 'api.github.com',
      path: `/repos/jessica12ryan/fpp-os/releases/tags/${builtForVersion}`,
      headers: { 'User-Agent': 'fpp-os-usb-flasher' }
    }
    https.get(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const release = JSON.parse(data)
          const iso = release.assets?.find(a => a.name.endsWith('.iso'))
          resolve({
            version: release.tag_name,
            isoUrl: iso?.browser_download_url,
            isoName: iso?.name,
            isoSize: iso?.size
          })
        } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
})

// ── List removable drives ─────────────────────────────────────────────────────
ipcMain.handle('list-drives', async () => {
  const drives = await drivelist.list()
  return drives
    .filter(d => d.isRemovable && !d.isSystem)
    .map(d => ({
      device: d.device,
      description: d.description,
      size: d.size,
      displayName: `${d.description} — ${d.device} (${formatBytes(d.size)})`
    }))
})

// ── Download ISO ──────────────────────────────────────────────────────────────
ipcMain.handle('download-iso', async (_event, url, destPath) => {
  return new Promise((resolve, reject) => {
    const follow = (url) => {
      const mod = url.startsWith('https') ? https : http
      mod.get(url, { headers: { 'User-Agent': 'fpp-os-usb-flasher' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return follow(res.headers.location)
        }
        const total = parseInt(res.headers['content-length'] || '0')
        let received = 0
        const file = fs.createWriteStream(destPath)
        res.on('data', chunk => {
          received += chunk.length
          file.write(chunk)
          if (total > 0) {
            mainWindow.webContents.send('download-progress', Math.round(received / total * 100))
          }
        })
        res.on('end', () => { file.end(); resolve(destPath) })
        res.on('error', reject)
      }).on('error', reject)
    }
    follow(url)
  })
})

// ── Flash ISO to drive ────────────────────────────────────────────────────────
ipcMain.handle('flash-drive', async (_event, isoPath, device) => {
  return new Promise((resolve, reject) => {
    let cmd

    if (process.platform === 'darwin') {
      // macOS: unmount disk first, then dd
      const rawDevice = device.replace('/dev/disk', '/dev/rdisk')
      cmd = `diskutil unmountDisk "${device}" && dd if="${isoPath}" of="${rawDevice}" bs=4m`
    } else if (process.platform === 'linux') {
      cmd = `dd if="${isoPath}" of="${device}" bs=4M status=progress oflag=sync`
    } else {
      // Windows: use PowerShell to write to the physical drive
      // device is \\.\PhysicalDriveX
      cmd = `powershell -Command "$src = [System.IO.File]::OpenRead('${isoPath}'); $dst = [System.IO.File]::Open('${device}', 'Open', 'Write'); $buf = New-Object byte[] 4194304; while(($n=$src.Read($buf,0,$buf.Length)) -gt 0){$dst.Write($buf,0,$n)}; $src.Close(); $dst.Close()"`
    }

    const sudoPrompt = require('sudo-prompt')
    sudoPrompt.exec(cmd, { name: 'FPP-OS USB Flasher' }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message))
      } else {
        resolve()
      }
    })
  })
})

function formatBytes(bytes) {
  if (!bytes) return 'Unknown size'
  const gb = bytes / 1024 / 1024 / 1024
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1024 / 1024).toFixed(0)} MB`
}