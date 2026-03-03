const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printTicket: (data) => ipcRenderer.invoke('print-ticket', data),
  getBranchId: () => process.env.BRANCH_ID,
});
