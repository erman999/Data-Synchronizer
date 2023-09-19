// Import the necessary Electron components
const contextBridge = require('electron').contextBridge;
const ipcRenderer = require('electron').ipcRenderer;

// White-listed channels
const ipc = {
  // From render to main
  'render': {
    'send': [
      'messageToMain',
      'compare-databases',
      'show-create-table'
    ],
    // From main to render
    'receive': [
      'messageFromMain',
      'new-client',
      'registered-client',
      'update-client',
      'compare-databases',
      'show-create-table'
    ],
    // From render to main and back again
    'sendReceive': [
      'get-client',
      'refresh-databases',
      'compare-databases',
      'change-name',
      'delete-client',
      'save-binding-details'

    ]
  }
};

// Exposed protected methods in the render process
contextBridge.exposeInMainWorld(
  // Allowed 'ipcRenderer' methods
  'ipcRender', {
    // From render to main
    send: (channel, args) => {
      let validChannels = ipc.render.send;
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, args);
      }
    },
    // From main to render
    receive: (channel, listener) => {
      let validChannels = ipc.render.receive;
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => listener(...args));
      }
    },
    // From render to main and back again
    invoke: (channel, args) => {
      let validChannels = ipc.render.sendReceive;
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, args);
      }
    }
  }
);

/**
* Render --> Main
* ---------------
* Render:  window.ipcRender.send('channel', data); // Data is optional.
* Main:    electronIpcMain.on('channel', (event, data) => { methodName(data); })
*
* Main --> Render
* ---------------
* Main:    windowName.webContents.send('channel', data); // Data is optional.
* Render:  window.ipcRender.receive('channel', (data) => { methodName(data); });
*
* Render --> Main (Value) --> Render
* ----------------------------------
* Render:  window.ipcRender.invoke('channel', data).then((result) => { methodName(result); });
* Main:    electronIpcMain.handle('channel', (event, data) => { return someMethod(data); });
*
* Render --> Main (Promise) --> Render
* ------------------------------------
* Render:  window.ipcRender.invoke('channel', data).then((result) => { methodName(result); });
* Main:    electronIpcMain.handle('channel', async (event, data) => {
  *              return await promiseName(data)
  *                  .then(() => { return result; })
  *          });
  */
