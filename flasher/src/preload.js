const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('fpp', {
  getLatestRelease: ()              => ipcRenderer.invoke('get-latest-release'),
  listDrives:       ()              => ipcRenderer.invoke('list-drives'),
  downloadISO:      (url, dest)     => ipcRenderer.invoke('download-iso', url, dest),
  flashDrive:       (iso, device)   => ipcRenderer.invoke('flash-drive', iso, device),
  onDownloadProgress: (cb)          => ipcRenderer.on('download-progress', (_e, pct) => cb(pct))
})