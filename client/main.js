const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let mainWindow;

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
  clientIp: getIpAdresses().v4,
  configs: {},
  database: {},
  socket: {}
};


async function startApp() {

  // Test amaçlıdır silinecek
  client.machineId = 'test_' + 1000;
  // Test amaçlıdır silinecek

  

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




ipcMain.on('messageToMain', (event, message) => {
  console.log(message);
});


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
      client.socket.connection = true;
      client.socket.event = "connect";
      mainWindow.webContents.send('messageFromMain', {channel: 'update', client});
      socket.emit("greeting", client);
      resolve();
    });


    socket.on("disconnect", () => {
      console.log("Socket [disconnect] -> socket.connected: ", socket.connected);
      client.socket.connection = false;
      client.socket.event = "disconnect";
      mainWindow.webContents.send('messageFromMain', {channel: 'update', client});
      resolve();
    });


    socket.on("connect_error", () => {
      console.log("Socket [connect_error] -> socket.connected: ", socket.connected);
      if (client.socket.connection !== false) {
        client.socket.connection = false;
        client.socket.event = "connect_error";
        mainWindow.webContents.send('messageFromMain', {channel: 'update', client});
      }
      resolve();
    });


    socket.on("check-databases", async (data) => {
      console.log("Socket called: check-databases");
      let db = await getDatabaseDetails(client.configs.mysqlDatabase);
      socket.emit('check-databases', {clientDatabase: db, serverData: data});
    });


    socket.on("show-create-table", async (data) => {
      console.log("Socket called: show-create-table");
      let showCreate = await showCreateTable(data.tableName);
      socket.emit('show-create-table', {showCreate: showCreate});
    });


    socket.on("max-id", async (client) => {
      console.log("Socket called: max-id");
      for (const tbl of client.binding.tables) {
        let maxId = await sqlQuery(`SELECT MAX(\`${tbl.column}\`) AS maxId FROM \`${tbl.table}\`;`);
        if (maxId.result) {
          tbl.clientMaxId = maxId.response[0].maxId === null ? 0 : maxId.response[0].maxId;
          tbl.clientError = false;
        } else {
          tbl.clientMaxId = 0;
          tbl.clientError = true;
        }
      }
      console.log(client);
      socket.emit('max-id', client);
    });




    socket.on("transfer-data", async (client) => {
      console.log("Socket called: transfer-data");


      for (const tbl of client.binding.tables) {
        let chunk = await sqlQuery(`SELECT * FROM \`${tbl.table}\` WHERE \`${tbl.column}\` > ${tbl.serverMaxId} LIMIT 100;`);
        console.log(chunk);
      }

      console.log(client);
      socket.emit('transfer-data', client);
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
      if (client.database.connection === true) {
        mainWindow.webContents.send('messageFromMain', {channel: 'update', client});
        socket.emit('update-client', client);
      }
    } else {
      // Database connection (Check connection persistence)
      let isDatabaseStillConnected = await sqlQuery('SELECT 1 AS connected;');
      if (isDatabaseStillConnected.result === false) {
        if (client.database.connection !== isDatabaseStillConnected.result) {
          client.database.connection = false;
          mainWindow.webContents.send('messageFromMain', {channel: 'update', client});
          socket.emit('update-client', client);
        }
      }
    }

  }, 15*1000);
}


async function getDatabaseDetails(selectedDatabase) {
  // Warning: forEach doesn't strictly follow async/await rules.
  // https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop?rq=1

  // Catch errors
  if (client.database.connection !== true) return {error: 'No database connection!'};

  // Create database array
  let db = [];
  // Get database tables
  let showTables = await sqlQuery(`SHOW TABLES FROM ${selectedDatabase};`);
  // Merge table names with fields
  for (const table of showTables.response) {
    let tableName = Object.values(table)[0];
    let showFields = await sqlQuery(`SHOW FIELDS FROM ${tableName} FROM ${selectedDatabase};`);
    let tableObj = {table: tableName, fields: showFields.response};
    db.push(tableObj);
  }

  return db;
}


async function showCreateTable(tableName) {

  // Catch errors
  if (client.database.connection !== true) return {error: 'No database connection!'};

  let showCreate = await sqlQuery(`SHOW CREATE TABLE ${tableName};`);

  return showCreate;
}
