const { app, BrowserWindow, ipcMain } = require('electron')
const path  = require('path')
const fs    = require('fs')
const https = require('https')
const http  = require('http')
const { execSync } = require('child_process')
const ghToken = process.env.VITE_GH_READ_TOKEN || null

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 620,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'FPP Flasher'
  })
  mainWindow.loadFile(path.join(__dirname, 'index.html'))
  mainWindow.setMenuBarVisibility(false)
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())

// ── Get latest release info from GitHub ──────────────────────────────────────
ipcMain.handle('get-latest-release', async () => {
  return new Promise((resolve, reject) => {
    const builtForVersion = process.env.VITE_FPP_VERSION ||
      (app.getVersion() !== '0.0.0' ? app.getVersion() : null)
    const apiPath = builtForVersion
      ? `/repos/jessica12ryan/fpp-os/releases/tags/${builtForVersion}`
      : `/repos/jessica12ryan/fpp-os/releases/latest`
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      headers: {
        'User-Agent': 'fpp-flasher',
        'Accept': 'application/vnd.github.v3+json',
        ...(ghToken && { 'Authorization': `Bearer ${ghToken}` })
      }
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

// ── Get latest FPP release for SD card flashing ───────────────────────────────
ipcMain.handle('get-fpp-release', async () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/FalconChristmas/fpp/releases/latest',
      headers: {
        'User-Agent': 'fpp-flasher',
        'Accept': 'application/vnd.github.v3+json',
        ...(ghToken && { 'Authorization': `Bearer ${ghToken}` })
      }
    }
    https.get(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const release = JSON.parse(data)
          const images = (release.assets || [])
            .filter(a => a.name.endsWith('.img.zip'))
            .map(a => ({
              name: a.name,
              url:  a.browser_download_url,
              size: a.size,
              platform: a.name.includes('BB64') ? 'bb64'
                      : a.name.includes('BBB')  ? 'bb'
                      : a.name.includes('Pi')   ? 'pi'
                      : 'other'
            }))
          resolve({ version: release.tag_name, images })
        } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
})

// ── List removable drives ─────────────────────────────────────────────────────
ipcMain.handle('list-drives', async () => {
  return new Promise((resolve, reject) => {
    try {
      let drives = []

      if (process.platform === 'win32') {
        const output = execSync(
          'powershell -Command "Get-Disk | Where-Object { $_.BusType -eq \'USB\' } | Select-Object Number,FriendlyName,Size | ConvertTo-Csv -NoTypeInformation"',
          { encoding: 'utf8' }
        )
        const lines = output.trim().split('\n').slice(1) // skip header row
        drives = lines
          .map(line => {
            const parts = line.split(',').map(p => p.replace(/"/g, '').trim())
            const num  = parts[0]
            const name = parts[1]
            const size = parseInt(parts[2] || '0')
            return {
              device:      `\\\\.\\PhysicalDrive${num}`,
              description: name,
              size:        size,
              displayName: `${name} — \\\\.\\PhysicalDrive${num} (${formatBytes(size)})`
            }
          })
          .filter(d => d.description && d.device)
      } else if (process.platform === 'darwin') {
        // Use full path — Electron's child process has a minimal PATH
        const DISKUTIL = '/usr/sbin/diskutil'
      
        // Get all disk entries from plain text output
        const listText = execSync(DISKUTIL + ' list', { encoding: 'utf8' })
      
        // Match whole-disk lines: "/dev/disk2 (external, physical):"
        // Partition lines start with spaces so ^ with multiline excludes them
        const diskMatches = [...listText.matchAll(/^(\/dev\/disk\d+)\s+\(([^)]+)\)/gm)]
      
        for (const match of diskMatches) {
          const device  = match[1]   // e.g. /dev/disk2
          const typeStr = match[2]   // e.g. "external, physical"
      
          // Skip synthesized APFS containers, disk images, virtual disks
          if (!typeStr.includes('physical')) continue
      
          try {
            const infoText = execSync(
              DISKUTIL + ' info ' + device,
              { encoding: 'utf8' }
            )
      
            // Extract a field value from diskutil info plain text output
            const field = (key) => {
              const esc   = key.replace(/[.*+?^${}()|[\]/\\]/g, '\\$&')
              const found = infoText.match(new RegExp(esc + ':\\s+(.+)'))
              return found ? found[1].trim() : ''
            }
      
            const ejectable = field('Ejectable')
            const protocol  = field('Protocol')
            const mediaName = field('Device / Media Name')
            const sizeMatch = infoText.match(/Total Size:.*?\((\d+) Bytes\)/)
            const totalSize = sizeMatch ? parseInt(sizeMatch[1]) : 0
      
            // Ejectable: Yes is the most reliable indicator of removable media on
            // macOS — true for USB drives AND SD cards in built-in card readers
            if (ejectable.toLowerCase() === 'yes') {
              drives.push({
                device,
                description: mediaName || device,
                size:        totalSize,
                displayName: `${mediaName || device} — ${device} (${formatBytes(totalSize)}) [${protocol}]`
              })
            }
          } catch (diskErr) {
            // Surface the error to the log instead of silently swallowing it
            console.error(`[list-drives] skipping ${device}:`, diskErr.message)
          }
        }
      } else {
        // Linux — parse lsblk
        const output = execSync(
          'lsblk -J -o NAME,SIZE,TYPE,RM,HOTPLUG,VENDOR,MODEL',
          { encoding: 'utf8' }
        )
        const parsed = JSON.parse(output)
        drives = (parsed.blockdevices || [])
          .filter(d => d.type === 'disk' && (d.rm === true || d.hotplug === true))
          .map(d => ({
            device: `/dev/${d.name}`,
            description: `${d.vendor?.trim() || ''} ${d.model?.trim() || ''}`.trim() || d.name,
            size: 0,
            displayName: `${d.vendor?.trim() || ''} ${d.model?.trim() || ''} — /dev/${d.name} (${d.size})`.trim()
          }))
      }

      resolve(drives)
    } catch (e) {
      reject(e)
    }
  })
})

// ── Download ISO ──────────────────────────────────────────────────────────────
ipcMain.handle('download-iso', async (_event, url, isoName) => {
  const destPath = path.join(app.getPath('downloads'), isoName)
  return new Promise((resolve, reject) => {
    const follow = (url) => {
      const mod = url.startsWith('https') ? https : http
      mod.get(url, { headers: { 'User-Agent': 'fpp-flasher' } }, res => {
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
ipcMain.handle('flash-drive', async (_event, imagePath, device) => {
  return new Promise((resolve, reject) => {
    const isZip = imagePath.endsWith('.zip')
    let cmd

    if (process.platform === 'darwin') {
      const rawDevice = device.replace('/dev/disk', '/dev/rdisk')
      cmd = isZip
        ? `diskutil unmountDisk "${device}" && unzip -p "${imagePath}" | dd of="${rawDevice}" bs=4m`
        : `diskutil unmountDisk "${device}" && dd if="${imagePath}" of="${rawDevice}" bs=4m`

    } else if (process.platform === 'linux') {
      cmd = isZip
        ? `unzip -p "${imagePath}" | dd of="${device}" bs=4M status=progress oflag=sync`
        : `dd if="${imagePath}" of="${device}" bs=4M status=progress oflag=sync`

    } else {
      // Windows — ZIP handled natively via .NET, no external tools needed
      cmd = isZip
        ? `powershell -Command "
            Add-Type -AssemblyName System.IO.Compression.FileSystem;
            $zip = [System.IO.Compression.ZipFile]::OpenRead('${imagePath}');
            $entry = $zip.Entries[0];
            $src = $entry.Open();
            $dst = [System.IO.File]::Open('${device}', 'Open', 'Write');
            $buf = New-Object byte[] 4194304;
            while(($n = $src.Read($buf, 0, $buf.Length)) -gt 0) { $dst.Write($buf, 0, $n) };
            $src.Close(); $dst.Close(); $zip.Dispose()"`
        : `powershell -Command "
            $src = [System.IO.File]::OpenRead('${imagePath}');
            $dst = [System.IO.File]::Open('${device}', 'Open', 'Write');
            $buf = New-Object byte[] 4194304;
            while(($n = $src.Read($buf, 0, $buf.Length)) -gt 0) { $dst.Write($buf, 0, $n) };
            $src.Close(); $dst.Close()"`
    }

    const sudoPrompt = require('sudo-prompt')
    sudoPrompt.exec(cmd, { name: 'FPP Flasher' }, (error, _stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message))
      else resolve()
    })
  })
})

function formatBytes(bytes) {
  if (!bytes) return 'Unknown size'
  const gb = bytes / 1024 / 1024 / 1024
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1024 / 1024).toFixed(0)} MB`
}
