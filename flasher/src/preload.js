const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('fpp', {
  getLatestRelease: ()              => ipcRenderer.invoke('get-latest-release'),
  getFPPRelease:      ()             => ipcRenderer.invoke('get-fpp-release'),
  listDrives:       ()              => ipcRenderer.invoke('list-drives'),
  downloadISO:      (url, isoName)  => ipcRenderer.invoke('download-iso', url, isoName),
  flashDrive:       (iso, device)   => ipcRenderer.invoke('flash-drive', iso, device),
  onDownloadProgress: (cb)          => ipcRenderer.on('download-progress', (_e, pct) => cb(pct))
  onFlashProgress:     (cb)              => ipcRenderer.on('flash-progress', (_e, d) => cb(d))
})