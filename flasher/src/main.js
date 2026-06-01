const { app, BrowserWindow, ipcMain } = require('electron')
const path  = require('path')
const fs    = require('fs')
const https = require('https')
const http  = require('http')
const { exec, spawn }      = require('child_process')
const { promisify } = require('util')
const execAsync     = promisify(exec)
const ghToken = process.env.VITE_GH_READ_TOKEN || null

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 820,
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

function isNewerVersion(latest, current) {
  const a = latest.replace(/^v/, '').split('.').map(Number)
  const b = current.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const na = a[i] || 0, nb = b[i] || 0
    if (na > nb) return true
    if (na < nb) return false
  }
  return false
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
  if (process.platform === 'darwin')      return listDrivesMac()
  else if (process.platform === 'win32')  return listDrivesWin()
  else                                    return listDrivesLinux()
})

async function listDrivesMac() {
  const env = {
    PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
    HOME: process.env.HOME || '/var/root'
  }

  const { stdout: listText } = await execAsync('/usr/sbin/diskutil list', { env })
  const drives = []
  const errors = []

  const diskMatches = [...listText.matchAll(/^(\/dev\/disk\d+)\s*(?:\(([^)]+)\))?:/gm)]

  for (const match of diskMatches) {
    const device  = match[1]
    const typeStr = (match[2] || '').toLowerCase()

    if (typeStr === 'synthesized' ||
        typeStr.includes('disk image') ||
        typeStr.includes('virtual')) continue

    try {
      const { stdout: infoText } = await execAsync(
        `/usr/sbin/diskutil info ${device}`,
        { env }
      )

      const field = (key) => {
        const esc = key.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
        const m   = infoText.match(new RegExp(esc + ':\\s+(.+)'))
        return m ? m[1].trim() : ''
      }

      // Safe normalization
      const ejectable = field('Ejectable').toLowerCase()
      const internal  = field('Internal').toLowerCase()
      const protocol  = field('Protocol').toLowerCase()
      const removable = field('Removable Media').toLowerCase()
      
      const mediaName = field('Device / Media Name') || field('Device Node') || device
      
      // FIX 1: Accounts for both "Total Size" (Intel Macs) and "Disk Size" (Apple Silicon)
      const sizeMatch = infoText.match(/(?:Disk|Total) Size:.*?\((\d+)\s*Bytes\)/i)
      const totalSize = sizeMatch ? parseInt(sizeMatch[1]) : 0

      // FIX 2: Check standard hardware protocols to bypass Apple's weird Internal/Ejectable flags
      const isTargetMedia = 
        internal === 'no' || 
        ejectable === 'yes' || 
        removable.includes('removable') || 
        protocol.includes('usb') || 
        protocol.includes('secure digital') ||
        protocol.includes('sd')

      // FIX 3: Safety net to explicitly prevent listing the main internal Mac OS boot drive
      const isCoreMacDrive = internal === 'yes' && 
        (protocol.includes('pci') || protocol.includes('apple') || protocol.includes('nvme'))

      if (isTargetMedia && !isCoreMacDrive) {
        drives.push({
          device,
          description: mediaName,
          size:        totalSize,
          // Extract the original un-lowercased protocol for a cleaner UI display
          displayName: `${mediaName} — ${device} (${formatBytes(totalSize)}) [${field('Protocol') || 'Unknown Protocol'}]`
        })
      }
    } catch (err) {
      errors.push(`${device}: ${err.message}`)
    }
  }

  if (drives.length === 0 && errors.length > 0) {
    throw new Error(`Drive detection failed:\n${errors.join('\n')}`)
  }

  return drives
}

async function listDrivesWin() {
  const { stdout } = await execAsync(
    'powershell -Command "Get-Disk | Where-Object { $_.BusType -in @(\'USB\',\'SD\') } | Select-Object Number,FriendlyName,Size | ConvertTo-Json -Compress"',
    { encoding: 'utf8' }
  )

  const raw = stdout.trim()
  if (!raw) return []

  // ConvertTo-Json returns an object not array when only one disk found
  let diskData = JSON.parse(raw)
  if (!Array.isArray(diskData)) diskData = [diskData]

  return diskData
    .filter(d => d && d.Number !== undefined)
    .map(d => ({
      device:      `\\\\.\\PhysicalDrive${d.Number}`,
      description: d.FriendlyName || `Disk ${d.Number}`,
      size:        d.Size || 0,
      displayName: `${d.FriendlyName || `Disk ${d.Number}`} — \\\\.\\PhysicalDrive${d.Number} (${formatBytes(d.Size || 0)})`
    }))
}

async function listDrivesLinux() {
  const { stdout } = await execAsync(
    'lsblk -J -b -o NAME,SIZE,TYPE,RM,HOTPLUG,VENDOR,MODEL',
    { encoding: 'utf8' }
  )

  const parsed = JSON.parse(stdout)
  return (parsed.blockdevices || [])
    .filter(d => {
      if (d.type !== 'disk') return false
      // Handle lsblk versions that return rm/hotplug as bool, int, or string "1"
      const rm      = d.rm      === true || d.rm      === 1 || d.rm      === '1'
      const hotplug = d.hotplug === true || d.hotplug === 1 || d.hotplug === '1'
      return rm || hotplug
    })
    .map(d => {
      const desc = `${(d.vendor || '').trim()} ${(d.model || '').trim()}`.trim() || d.name
      const size = parseInt(d.size) || 0
      return {
        device:      `/dev/${d.name}`,
        description: desc,
        size,
        displayName: `${desc} — /dev/${d.name} (${formatBytes(size)})`
      }
    })
}

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

// ── macOS password prompt via AppleScript ────────────────────────────────────
function promptForPassword() {
  return new Promise((resolve, reject) => {
    const script = [
      'display dialog "FPP Flasher needs administrator access to flash the drive.\\n\\nEnter your Mac administrator password to continue."',
      'with title "FPP Flasher"',
      'with icon caution',
      'with hidden answer',
      'default answer ""',
      'buttons {"Cancel","OK"}',
      'default button "OK"',
      'cancel button "Cancel"'
    ].join(' ¬\n  ')

    const tmp = path.join(app.getPath('temp'), 'fpp-flasher-prompt.applescript')
    fs.writeFileSync(tmp, script, 'utf8')

    exec(`osascript "${tmp}" 2>/dev/null`, { timeout: 60000 }, (err, stdout) => {
      try { fs.unlinkSync(tmp) } catch {}
      if (err) { reject(new Error('Authentication cancelled')); return }
      const m = stdout.match(/text returned:(.+?)\s*$/m)
      m ? resolve(m[1].trim()) : reject(new Error('Could not read password'))
    })
  })
}

// ── Run command via sudo -S ──────────────────────────────────────────────────
function execWithSudo(command, password) {
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/sudo', ['-S', '-p', '', 'bash', '-c', command], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    let stdout = '', stderr = ''
    child.stdout.on('data', d => stdout += d)
    child.stderr.on('data', d => stderr += d)
    child.stdin.write(password + '\n')
    child.stdin.end()
    child.on('close', code => {
      if (code === 0) resolve(stdout)
      else if (stderr.includes('Sorry') || stderr.includes('incorrect'))
        reject(new Error('WRONG_PASSWORD'))
      else reject(new Error(stderr || `Command failed (code ${code})`))
    })
    child.on('error', reject)
  })
}

// ── Flash via dd with periodic progress from SIGINFO ─────────────────────────
function flashWithProgress(imagePath, device, rawDevice, isZip, password) {
  const totalSize = isZip ? null : fs.statSync(imagePath).size
  const unmount = `/usr/sbin/diskutil unmountDisk force '${device}' 2>/dev/null || true`

  // Run dd in background, send SIGINFO every 1s to get progress
  const ddJob = isZip
    ? `/usr/bin/unzip -p '${imagePath}' | /bin/dd of='${rawDevice}' bs=4m oflag=sync`
    : `/bin/dd if='${imagePath}' of='${rawDevice}' bs=4m oflag=sync`

  // Wrap: background dd, monitor with SIGINFO, capture exit code
  const shellCmd = `${unmount}; ( ${ddJob} & PID=$!; while kill -0 $PID 2>/dev/null; do kill -INFO $PID 2>/dev/null; /bin/sleep 1; done; wait $PID; exit $? ) || { echo FALLBACK >&2; ${unmount}; ( /bin/dd if='${imagePath}' of='${device}' bs=4m oflag=sync & PID=$!; while kill -0 $PID 2>/dev/null; do kill -INFO $PID 2>/dev/null; /bin/sleep 1; done; wait $PID; exit $? ); }`

  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/sudo', ['-S', '-p', '', 'bash', '-c', shellCmd], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stderrBuf = ''
    child.stderr.on('data', data => {
      stderrBuf += data.toString()
      const lines = stderrBuf.split('\n')
      stderrBuf = lines.pop()
      for (const line of lines) {
        const m = line.match(/(\d+)\s+bytes\s+transferred/)
        if (m) {
          const written = parseInt(m[1])
          if (totalSize) {
            const pct = Math.min(Math.round(written / totalSize * 100), 100)
            mainWindow.webContents.send('flash-progress', {
              written, total: totalSize, pct,
              text: `${(written/1024/1024).toFixed(1)} MB / ${(totalSize/1024/1024).toFixed(1)} MB`
            })
          } else {
            mainWindow.webContents.send('flash-progress', {
              written, total: 0, pct: null,
              text: `${(written/1024/1024).toFixed(1)} MB written`
            })
          }
        }
      }
    })

    child.stdin.write(password + '\n')
    child.stdin.end()

    child.on('close', code => {
      if (code === 0 || stderrBuf.includes('FALLBACK')){
        if (totalSize) mainWindow.webContents.send('flash-progress', { total: totalSize, pct: 100, text: 'Complete' })
        resolve()
      } else if (stderrBuf.includes('Sorry') || stderrBuf.includes('incorrect'))
        reject(new Error('WRONG_PASSWORD'))
      else
        reject(new Error(stderrBuf || `Command failed (code ${code})`))
    })
  })
}

// ── Check if a newer flasher version exists ─────────────────────────────────
ipcMain.handle('check-flasher-update', async () => {
  const current = app.getVersion()
  if (current === '0.0.0') return { hasUpdate: false } // dev mode
  return new Promise(resolve => {
    const opts = {
      hostname: 'api.github.com',
      path: '/repos/jessica12ryan/fpp-os/releases/latest',
      headers: {
        'User-Agent': 'fpp-flasher',
        'Accept': 'application/vnd.github.v3+json',
        ...(ghToken && { 'Authorization': `Bearer ${ghToken}` })
      }
    }
    https.get(opts, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          const rel = JSON.parse(data)
          const latest = rel.tag_name.replace(/^v/, '')
          const dmg = rel.assets?.find(a => a.name.endsWith('.dmg'))
          if (isNewerVersion(latest, current) && dmg)
            resolve({ hasUpdate: true, latestVersion: latest, currentVersion: current,
                      downloadUrl: dmg.browser_download_url, downloadName: dmg.name,
                      releaseUrl: rel.html_url })
          else resolve({ hasUpdate: false })
        } catch { resolve({ hasUpdate: false }) }
      })
    }).on('error', () => resolve({ hasUpdate: false }))
  })
})

// ── Download flasher update DMG to Desktop ──────────────────────────────────
ipcMain.handle('download-flasher-update', async (_event, url, name) => {
  const dest = path.join(app.getPath('desktop'), name)
  return new Promise((resolve, reject) => {
    const follow = u => {
      const mod = u.startsWith('https') ? https : http
      mod.get(u, { headers: { 'User-Agent': 'fpp-flasher' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) return follow(res.headers.location)
        const total = parseInt(res.headers['content-length'] || '0')
        let rcvd = 0
        const f = fs.createWriteStream(dest)
        res.on('data', c => { rcvd += c.length; f.write(c)
          if (total > 0) mainWindow.webContents.send('update-download-progress', Math.round(rcvd / total * 100))
        })
        res.on('end', () => { f.end(); resolve(dest) })
        res.on('error', reject)
      }).on('error', reject)
    }
    follow(url)
  })
})

// ── Open the DMG in Finder ──────────────────────────────────────────────────
ipcMain.handle('open-flasher-dmg', (_event, dmgPath) => {
  exec(`open "${dmgPath}"`)
})

// ── Flash ISO to drive ────────────────────────────────────────────────────────
ipcMain.handle('flash-drive', async (_event, imagePath, device) => {
  const isZip = imagePath.endsWith('.zip')

  if (process.platform === 'darwin') {
    const rawDevice = device.replace('/dev/disk', '/dev/rdisk')

    let lastErr
    for (let attempt = 0; attempt < 3; attempt++) {
      let password
      try { password = await promptForPassword() }
      catch (e) { throw new Error(e.message === 'Authentication cancelled' ? 'Flashing cancelled' : e.message) }

      try {
        await flashWithProgress(imagePath, device, rawDevice, isZip, password)
        return
      } catch (e) {
        if (e.message === 'WRONG_PASSWORD') { lastErr = 'Wrong password, try again'; continue }
        if (e.message.includes('Operation not permitted') || e.message.includes('Permission denied')) {
          throw new Error(
            'FPP Flasher needs Full Disk Access.\n\n' +
            'Open System Settings → Privacy & Security → Full Disk Access,\n' +
            'click + and add "FPP Flasher.app", then retry.\n\n' +
            'Or run from Terminal:\n' +
            '  sudo "/Applications/FPP Flasher.app/Contents/MacOS/FPP Flasher"'
          )
        }
        throw e
      }
    }
    throw new Error(lastErr || 'Flash failed after 3 attempts')
  }

  // ── Linux / Windows: sudo-prompt (unchanged) ───────────────────────────────
  return new Promise((resolve, reject) => {
    let cmd
    let psPath = null
    if (process.platform === 'linux') {
      cmd = isZip
        ? `unzip -p "${imagePath}" | dd of="${device}" bs=4M status=progress oflag=sync`
        : `dd if="${imagePath}" of="${device}" bs=4M status=progress oflag=sync`
    } else {
      // Windows — write PowerShell to .ps1 file to avoid inline escaping issues
      const psContent = isZip
        ? [
            'Add-Type -AssemblyName System.IO.Compression.FileSystem',
            `$zip = [System.IO.Compression.ZipFile]::OpenRead('${imagePath.replace(/'/g, "''")}')`,
            '$entry = $zip.Entries[0]',
            '$src = $entry.Open()',
            `$dst = [System.IO.File]::Open('${device.replace(/'/g, "''")}', 'Open', 'Write')`,
            '$buf = New-Object byte[] 4194304',
            'while (($n = $src.Read($buf, 0, $buf.Length)) -gt 0) { $dst.Write($buf, 0, $n) }',
            '$src.Close(); $dst.Close(); $zip.Dispose()'
          ].join('\n')
        : [
            `$src = [System.IO.File]::OpenRead('${imagePath.replace(/'/g, "''")}')`,
            `$dst = [System.IO.File]::Open('${device.replace(/'/g, "''")}', 'Open', 'Write')`,
            '$buf = New-Object byte[] 4194304',
            'while (($n = $src.Read($buf, 0, $buf.Length)) -gt 0) { $dst.Write($buf, 0, $n) }',
            '$src.Close(); $dst.Close()'
          ].join('\n')

      psPath = path.join(app.getPath('temp'), `fpp-flash-${Date.now()}.ps1`)
      fs.writeFileSync(psPath, psContent, 'utf8')
      cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}"`
    }
    const sudoPrompt = require('sudo-prompt')
    sudoPrompt.exec(cmd, { name: 'FPP Flasher' }, (error, _stdout, stderr) => {
      if (psPath) { try { fs.unlinkSync(psPath) } catch {} }
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
