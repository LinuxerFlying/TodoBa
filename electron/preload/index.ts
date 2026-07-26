import { contextBridge, ipcRenderer } from 'electron';

const api = {
  ping: () => ipcRenderer.invoke('ping'),
  todos: {
    list: () => ipcRenderer.invoke('todos:list'),
    read: (id: string) => ipcRenderer.invoke('todos:read', { id }),
    create: (data: unknown) => ipcRenderer.invoke('todos:create', { data }),
    update: (id: string, patch: unknown) =>
      ipcRenderer.invoke('todos:update', { id, patch }),
    delete: (id: string) => ipcRenderer.invoke('todos:delete', { id }),
    batchUpdate: (ids: string[], patch: unknown) =>
      ipcRenderer.invoke('todos:batchUpdate', { ids, patch }),
    versions: (id: string) => ipcRenderer.invoke('todos:versions', { id }),
    readVersion: (id: string, version: string) =>
      ipcRenderer.invoke('todos:readVersion', { id, version }),
    rollback: (id: string, version: string) =>
      ipcRenderer.invoke('todos:rollback', { id, version }),
    onChange: (cb: (payload: unknown) => void) => {
      const handler = (_e: unknown, payload: unknown) => cb(payload);
      ipcRenderer.on('vault:changed', handler);
      return () => ipcRenderer.removeListener('vault:changed', handler);
    }
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', { key }),
    set: (key: string, value: unknown) =>
      ipcRenderer.invoke('settings:set', { key, value })
  },
  vault: {
    pick: () => ipcRenderer.invoke('vault:pick'),
    scan: () => ipcRenderer.invoke('vault:scan')
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  }
};

contextBridge.exposeInMainWorld('api', api);
export type Api = typeof api;
