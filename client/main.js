/***** Electron *****/
// Require electron libraries
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
if (require('electron-squirrel-startup')) app.quit();

// Define mainWindow as global variable
let mainWindow;

// Create main window
function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 600,
    height: 450,
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  // Load main HTML file
  mainWindow.loadFile('index.html');
  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

// Start app
app.whenReady().then(() => {
  // Create window
  createWindow();
  // (macOS) Emitted when the application is activated
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  // Emitted when the navigation is done. Kind of DOMContentLoaded equivalent
  mainWindow.webContents.once('did-finish-load', async () => {
    startApp();
  });
});

// Emitted when all windows have been closed
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});


/***** Applicaton *****/
// Call required libraries
const fs = require('fs');
const os = require('os');
const mysql = require('mysql2');
const { io } = require("socket.io-client");
const nodeMachineId = require('node-machine-id');

// Global variables
let socket = {};
let promisePool = {};
const ROW_LIMIT = 100;

// Store client variables
let client = {
  machineId: nodeMachineId.machineIdSync({original: true}),
  clientIp: getIpAdresses().v4,
  configs: {},
  database: {},
  socket: {}
};


/***** Functions *****/
// Start application
async function startApp() {
  // Read config file
  const configs = await readConfigFile(null, 'configs.json');
  client.configs = configs;
  // Try to connect database
  const isDatabaseConnected = await connectToDatabase();
  client.database = isDatabaseConnected;
  // Try to connect server
  const isServerConnected = await connectToServer();
  // Start database connection checker loop
  connectionChecker();
}

// Get external IP adresses (IPv4 & IPv6)
function getIpAdresses() {
  let ip = {};
  const networkInterfaces = os.networkInterfaces();
  Object.keys(networkInterfaces).forEach((name, index) => {
    networkInterfaces[name].forEach((item) => {
      if (!item.internal) {
        if (item.family === 'IPv4') {
          ip.v4 = item.address;
        } else if (item.family === 'IPv6') {
          ip.v6 = item.address;
        }
      }
    });
  });
  return ip;
}

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

// Save file to target location
async function saveConfigsFile(data) {
  const filePath = path.join(__dirname, 'configs', 'configs.json');
  await fs.promises.writeFile(filePath, JSON.stringify(data));
  console.log("File [configs.json] saved.");
  return true;
}

// Connect to database
async function connectToDatabase() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Trying to connect database...");
      const pool  = mysql.createPool({host: client.configs.mysqlIp, user: client.configs.mysqlUser, password: client.configs.mysqlPassword, database: client.configs.mysqlDatabase, dateStrings: true});
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

// Check database connection in given time interval
function connectionChecker() {
  setInterval(async() => {

    // Database connection (Check connection on start and connect if not established)
    if (client.database.connection !== true) {
      const isDatabaseConnected = await connectToDatabase();
      client.database = isDatabaseConnected;
      if (client.database.connection === true) {
        mainWindow.webContents.send('update', {client: client});
        socket.emit('update-client', client);
      }
    } else {
      // Database connection (Check connection persistence)
      let isDatabaseStillConnected = await sqlQuery('SELECT 1 AS connected;');
      if (isDatabaseStillConnected.result === false) {
        if (client.database.connection !== isDatabaseStillConnected.result) {
          client.database.connection = false;
          mainWindow.webContents.send('update', {client: client});
          socket.emit('update-client', client);
        }
      }
    }

  }, 15*1000);
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

// Run SQL SHOW CREATE TABLE query and return single SQL CREATE statement for the table
async function showCreateTable(tableName) {
  if (client.database.connection !== true) return {error: 'No database connection!'};
  let showCreate = await sqlQuery(`SHOW CREATE TABLE ${tableName};`);
  return showCreate;
}

// Create collection of database table fields (including keys, types, defaults, nulls, extras)
async function getDatabaseDetails(selectedDatabase) {
  // Warning: forEach doesn't strictly follow async/await rules.
  // https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop?rq=1

  // Create database array
  let db = [];
  // Get database tables
  let showTables = await sqlQuery(`SHOW TABLES FROM ${selectedDatabase};`);
  // Merge table names with fields
  for (const table of showTables.response) {
    let tableName = Object.values(table)[0];
    let showFields = await sqlQuery(`SHOW FIELDS FROM \`${selectedDatabase}\`.\`${tableName}\`;`);
    let countRows = await sqlQuery(`SELECT COUNT(*) AS counter FROM \`${selectedDatabase}\`.\`${tableName}\`;`);
    db.push({table: tableName, fields: showFields.response, count: countRows.response[0].counter});
  }
  return db;
}

// Connect to server
async function connectToServer() {
  return new Promise((resolve, reject) => {
    console.log("Trying to connect server...");

    // Connect to server
    socket = io('http://' + client.configs.serverIp + ':' + client.configs.port);

    /***** Socket Listeners *****/
    // Detect connection, send greeting to server and update status
    socket.on("connect", () => {
      console.log("Socket [connect] -> socket.connected: ", socket.connected);
      client.socket.connection = true;
      client.socket.event = "connect";
      mainWindow.webContents.send('update', {client: client});
      socket.emit("greeting", client);
      resolve();
    });

    // Detect disconnection and update status
    socket.on("disconnect", () => {
      console.log("Socket [disconnect] -> socket.connected: ", socket.connected);
      client.socket.connection = false;
      client.socket.event = "disconnect";
      mainWindow.webContents.send('update', {client: client});
      resolve();
    });

    // Listen connection error (automatically try to connect)
    socket.on("connect_error", () => {
      console.log("Socket [connect_error] -> socket.connected: ", socket.connected);
      if (client.socket.connection !== false) {
        client.socket.connection = false;
        client.socket.event = "connect_error";
        mainWindow.webContents.send('update', {client: client});
      }
      resolve();
    });

    // Get database details and return to server socket
    socket.on("check-databases", async (data, callback) => {
      let db = await getDatabaseDetails(client.configs.mysqlDatabase);
      callback(db);
    });

    // Get SQL SHOW CREATE statement and emit to server socket
    socket.on("show-create-table", async (data) => {
      let showCreate = await showCreateTable(data.tableName);
      socket.emit('show-create-table', {showCreate: showCreate});
    });

    // Listen synchronizer, evaluate and find missing data, emit prepared data to server
    socket.on("synchronizer", async (client) => {
      for (let table of client.binding.preserve.collection) {
        let insertData = await sqlQuery(`SELECT * FROM \`${client.configs.mysqlDatabase}\`.\`${table.table}\` LIMIT ${ROW_LIMIT} OFFSET ${table.serverRowCounter};`);
        if (insertData.result) table.insertData = insertData.response;
      }
      socket.emit('synchronizer', client);
    });

  });
}


/***** IPC Listeners *****/
// Send client object to renderer
ipcMain.handle('get-configs', (event, data) => {
  return client;
});

// Save sent configs and return to renderer
ipcMain.handle('save-configs', (event, data) => {
  client.configs = data;
  saveConfigsFile(data);
  return true;
});
