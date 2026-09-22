import { contextBridge, ipcRenderer } from 'electron';

const api = {
  ping: () => ipcRenderer.invoke('ping'),
  appVersion: () => ipcRenderer.invoke('app:version'),
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
  assets: {
    import: () => ipcRenderer.invoke('assets:import')
  },
  sync: {
    getConfig: () => ipcRenderer.invoke('sync:getConfig'),
    saveConfig: (config: unknown) => ipcRenderer.invoke('sync:saveConfig', config),
    testConnection: (config: unknown) =>
      ipcRenderer.invoke('sync:testConnection', config),
    push: () => ipcRenderer.invoke('sync:push'),
    pull: () => ipcRenderer.invoke('sync:pull'),
    getState: () => ipcRenderer.invoke('sync:getState'),
    setAuto: (enabled: boolean) => ipcRenderer.invoke('sync:setAuto', { enabled }),
    onProgress: (cb: (payload: unknown) => void) => {
      const handler = (_e: unknown, payload: unknown) => cb(payload);
      ipcRenderer.on('sync:progress', handler);
      return () => ipcRenderer.removeListener('sync:progress', handler);
    },
    onPulled: (cb: (payload: unknown) => void) => {
      const handler = (_e: unknown, payload: unknown) => cb(payload);
      ipcRenderer.on('sync:pulled', handler);
      return () => ipcRenderer.removeListener('sync:pulled', handler);
    },
    onState: (cb: (payload: unknown) => void) => {
      const handler = (_e: unknown, payload: unknown) => cb(payload);
      ipcRenderer.on('sync:state', handler);
      return () => ipcRenderer.removeListener('sync:state', handler);
    },
    encryption: {
      getState: () => ipcRenderer.invoke('sync:encryption:getState'),
      enable: (password: string, remember: boolean) =>
        ipcRenderer.invoke('sync:encryption:enable', { password, remember }),
      disable: () => ipcRenderer.invoke('sync:encryption:disable'),
      unlock: (password: string) =>
        ipcRenderer.invoke('sync:encryption:unlock', { password }),
      lock: () => ipcRenderer.invoke('sync:encryption:lock'),
      changePassword: (
        oldPassword: string,
        newPassword: string,
        remember: boolean
      ) =>
        ipcRenderer.invoke('sync:encryption:changePassword', {
          oldPassword,
          newPassword,
          remember
        })
    }
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },
  updater: {
    getState: () => ipcRenderer.invoke('updater:getState'),
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onChange: (cb: (payload: unknown) => void) => {
      const handler = (_e: unknown, payload: unknown) => cb(payload);
      ipcRenderer.on('updater:state', handler);
      return () => ipcRenderer.removeListener('updater:state', handler);
    }
  }
};

contextBridge.exposeInMainWorld('api', api);
export type Api = typeof api;
