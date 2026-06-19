const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('fpp', {
  getLatestRelease:      ()                             => ipcRenderer.invoke('get-latest-release'),
  getFPPReleaseByType:   (type)                         => ipcRenderer.invoke('get-fpp-release-by-type', type),
  listDrives:            ()                             => ipcRenderer.invoke('list-drives'),
  downloadISO:           (url, isoName)                 => ipcRenderer.invoke('download-iso', url, isoName),
  flashDrive:            (iso, device)                  => ipcRenderer.invoke('flash-drive', iso, device),
  onDownloadProgress:    (cb)                           => ipcRenderer.on('download-progress', (_e, pct) => cb(pct)),
  onFlashProgress:       (cb)                           => ipcRenderer.on('flash-progress', (_e, d) => cb(d)),
  checkFlasherUpdate:    ()                             => ipcRenderer.invoke('check-flasher-update'),
  downloadFlasherUpdate: (url, name)                    => ipcRenderer.invoke('download-flasher-update', url, name),
  installAndRestart:     (path)                         => ipcRenderer.invoke('install-and-restart', path),
  onUpdateDownloadProgress: (cb)                        => ipcRenderer.on('update-download-progress', (_e, pct) => cb(pct))
})
