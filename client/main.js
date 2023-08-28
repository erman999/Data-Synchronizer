const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let mainWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // DOMContentLoaded equivalent
  mainWindow.webContents.once('did-finish-load', async () => {
    startApp();
  });

})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})



/********** Application Specific Codes **********/
const fs = require('fs');
const os = require('os');
const mysql = require('mysql2');
const { io } = require("socket.io-client");
const nodeMachineId = require('node-machine-id');

let socket = {};
let promisePool = {};

let client = {
  machineId: nodeMachineId.machineIdSync({original: true}),
  configs: {},
  database: {},
  socket: {}
};



async function startApp() {

  // Read config file
  const configs = await readConfigFile(null, 'configs.json');
  client.configs = configs;

  // Try to connect database
  const isDatabaseConnected = await connectToDatabase();
  client.database = isDatabaseConnected;

  // Try to connect server
  const isServerConnected = await connectToServer();
  client.socket = isServerConnected;

  // Add socket events
  socketEvents();

  // Display client status
  console.log(client);
  mainWindow.webContents.send('messageFromMain', client);

  // Start database connection checker loop
  connectionChecker();


}




ipcMain.on('messageToMain', (event, message) => {
  console.log(message);
});




// Read file in 'configs' folder
async function readConfigFile(event, data) {
  const filePath = path.join(__dirname, 'configs', data);
  try {
    const contents = await fs.promises.readFile(filePath, { encoding: 'utf8' });
    return JSON.parse(contents.trim());
  } catch (err) {
    console.error(err.message);
    return false;
  }
}

// Connect to database
async function connectToDatabase() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Trying to connect database...");
      const pool  = mysql.createPool({host: client.configs.mysqlIp, user: client.configs.mysqlUser, password: client.configs.mysqlPassword, database: client.configs.mysqlDatabase});
      const poolTest = pool.promise();
      const [rows, fields] = await poolTest.query("SELECT 1 AS connected;");
      promisePool = poolTest;
      resolve({connection: true});
    } catch (e) {
      promisePool = {};
      resolve({connection: false, response: e});
    }
  });
}

// Connect to server
async function connectToServer() {
  return new Promise((resolve, reject) => {

    console.log("Trying to connect server...");
    socket = io('http://' + client.configs.serverIp + ':' + client.configs.port);


    socket.on("connect", () => {
      console.log("Socket [connect] -> socket.connected: ", socket.connected);
      if (client.socket.hasOwnProperty('connection')) {
        client.socket.connection = true;
        mainWindow.webContents.send('messageFromMain', client);
      }
      resolve({connection: true});
    });


    socket.on("disconnect", () => {
      console.log("Socket [disconnect] -> socket.connected: ", socket.connected);
      if (client.socket.hasOwnProperty('connection')) {
        client.socket.connection = false;
        mainWindow.webContents.send('messageFromMain', client);
      }
      resolve({connection: false});
    });


    socket.on("connect_error", () => {
      console.log("Socket [connect_error] -> socket.connected: ", socket.connected);
      if (client.socket.hasOwnProperty('connection') && client.socket.connection !== false) {
        client.socket.connection = false;
        mainWindow.webContents.send('messageFromMain', client);
      }
      resolve({connection: false});
    });


  });
}


// Run queries without crash
async function sqlQuery(query) {
  try {
    const [rows, fields] = await promisePool.query(query);
    return {result: true, response: rows};
  } catch (e) {
    return {result: false, response: e};
  }
}


// Check database connection in given time interval
function connectionChecker() {
  setInterval(async() => {

    // Database connection (Check connection on start and connect if not established)
    if (client.database.connection !== true) {
      const isDatabaseConnected = await connectToDatabase();
      client.database = isDatabaseConnected;
      if (client.database.connection === true) mainWindow.webContents.send('messageFromMain', client);
    } else {
      // Database connection (Check connection persistence)
      let isDatabaseStillConnected = await sqlQuery('SELECT 1 AS connected;');
      if (isDatabaseStillConnected.result === false) {
        if (client.database.connection !== isDatabaseStillConnected.result) {
          client.database.connection = false;
          mainWindow.webContents.send('messageFromMain', client);
        }
      }
    }

  }, 15*1000);
}


function socketEvents() {


  socket.emit("greeting", client);
  socket.on("greeting", (arg) => {
    console.log(arg);
  });

}
