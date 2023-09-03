const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let mainWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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
const express = require('express')();
const httpServer = require('http').createServer(express);
const io = require('socket.io')(httpServer);

let promisePool = {};

let server = {
  configs: {},
  clients: [],
  database: {},
  socket: {}
};



async function startApp() {

  // Read config file
  const configs = await readConfigFile(null, 'configs.json');
  server.configs = configs;

  // Read clients file
  const clients = await readConfigFile(null, 'clients.json');
  server.clients = clients;

  // Update registered clients connection status
  if (server.clients.length > 0) {
    server.clients.forEach((item, i) => {
      item.socket.connection = false;
      item.database.connection = false;
    });
  }

  // Try to connect database
  const isDatabaseConnected = await connectToDatabase();
  server.database = isDatabaseConnected;

  // Start server
  httpServer.listen(server.configs.port, () => {
    server.socket.connection = true;
    server.socket.serverIp = getIpAdresses().v4;
    server.socket.port = server.configs.port;
    console.log(server);
    console.log(`Server listening on port ${server.configs.port}`);
    mainWindow.webContents.send('messageFromMain', {channel: 'start', server});
  });

  // Start database connection checker loop
  connectionChecker();
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
      const pool  = mysql.createPool({host: server.configs.mysqlIp, user: server.configs.mysqlUser, password: server.configs.mysqlPassword});
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
    if (server.database.connection !== true) {
      const isDatabaseConnected = await connectToDatabase();
      server.database = isDatabaseConnected;
      if (server.database.connection === true) mainWindow.webContents.send('messageFromMain', {channel: 'server-update', server});
    } else {
      // Database connection (Check connection persistence)
      let isDatabaseStillConnected = await sqlQuery('SELECT 1 AS connected;');
      if (isDatabaseStillConnected.result === false) {
        if (server.database.connection !== isDatabaseStillConnected.result) {
          server.database.connection = false;
          mainWindow.webContents.send('messageFromMain', {channel: 'server-update', server});
        }
      }
    }

  }, 15*1000);
}



async function saveClientsFile(data) {
  const filePath = path.join(__dirname, 'configs', 'clients.json');
  await fs.promises.writeFile(filePath, JSON.stringify(data));
  console.log("File [clients.json] saved.");
  return true;
}


// Socket listeners
io.on('connection', (socket) => {
  console.log('Connected socket.id:', socket.id);

  socket.on("disconnect", (reason) => {
    console.log("Disconnect socket.id:", socket.id);
    let clientIndex = server.clients.findIndex((onlineClient) => onlineClient.socketId === socket.id);
    if (clientIndex !== -1) {
      let client = server.clients[clientIndex];
      client.socket.connection = false;
      client.database.connection = false;
      mainWindow.webContents.send('messageFromMain', {channel: 'update-client', client});
    } else {
      console.log(`This socket ${socket.id} is not exist in 'server.clients' array!`);
    }
  });


  socket.on("greeting", (client) => {
    console.log("Connected client: ", client);
    // Add socketId
    client.socketId = socket.id;
    // Check new client in registered clients
    let clientIndex = server.clients.findIndex((registeredClient) => registeredClient.machineId === client.machineId);
    // If this client is not exist in registered clients
    if (clientIndex === -1) {
      // Add a name for client name
      client.name = client.machineId.split('-')[0];
      // Add registration object
      client.registration = {completed: false};
      // Add this client to clients
      server.clients.push(client);
      // Save clients file
      saveClientsFile(server.clients);
      // Tell user register/setup required.
      mainWindow.webContents.send('messageFromMain', {channel: 'new-client', client});
    } else {
      // Add preserved values to client
      client.name = server.clients[clientIndex].name;
      client.registration = server.clients[clientIndex].registration;
      // Update clients on server
      server.clients[clientIndex] = client;
      // Save clients
      saveClientsFile(server.clients);
      // Update renderer
      mainWindow.webContents.send('messageFromMain', {channel: 'registered-client', client});
    }
  });


  socket.on('update-client', (client) => {
    console.log('update-client', client);
    let clientIndex = server.clients.findIndex((onlineClient) => onlineClient.machineId === client.machineId);
    if (clientIndex !== -1) {
      // When database connection status change at client side just update connection info
      server.clients[clientIndex].database.connection = client.database.connection;
      mainWindow.webContents.send('messageFromMain', {channel: 'update-client', client: server.clients[clientIndex]});
    } else {
      console.log('update-client', "Client not found in 'server.clients' array!");
    }
  });


  socket.on('check-databases', async (data) => {
    // Check for server database connection
    if (server.database.connection !== true) {
      mainWindow.webContents.send('messageFromMain', {channel: 'check-databases', error: 'No database connection!'});
      return false;
    }

    // Get server/target database name
    let selectedDatabase = data.serverData.info.selectedDatabase;
    let machineId = data.serverData.info.machineId;

    let serverDatabase = await getDatabaseDetails(selectedDatabase);
    let clientDatabase = data.clientDatabase;
    mainWindow.webContents.send('messageFromMain', {channel: 'check-databases', databases: {serverDatabase: serverDatabase, clientDatabase: clientDatabase, machineId: machineId}});

  });



  socket.on('show-create-table', async (data) => {
    // Check for server database connection
    if (server.database.connection !== true) {
      mainWindow.webContents.send('messageFromMain', {channel: 'show-create-table', error: 'No database connection!'});
      return false;
    }

    mainWindow.webContents.send('messageFromMain', {channel: 'show-create-table', showCreate: data.showCreate});

  });

});



// IPC listeners
ipcMain.on('messageToMain', async (event, data) => {
  console.log(data);
  switch (data.channel) {
    case 'server-databases':
    if (server.database.connection) {
      // Create database array
      let databases = [];
      // Get databases from server database
      let showDatabases = await sqlQuery('SHOW DATABASES;');
      // Organise values
      showDatabases.response.forEach((db, i) => {
        databases.push(Object.values(db)[0]);
      });
      // Define SQL specific databases
      let toRemove = ['information_schema', 'performance_schema', 'mysql'];
      // Remove SQL specific databases
      databases = databases.filter((el) => !toRemove.includes(el));
      // Send databases to renderer
      mainWindow.webContents.send('messageFromMain', {channel: 'server-databases', databases});
    } else {
      console.log('Server is not connected to a database!');
      mainWindow.webContents.send('messageFromMain', {channel: 'server-databases', databases: [], error: 'No database connection!'});
    }
    break;
    case 'check-databases':

    let clientIndex = server.clients.findIndex((client) => client.machineId === data.info.machineId);
    if (clientIndex === -1) {
      console.log("Client not found!");
      mainWindow.webContents.send('messageFromMain', {channel: 'check-databases', error: 'Client not found!'});
    } else {
      console.log("Client found");
      let socketId = server.clients[clientIndex].socketId;
      io.to(socketId).emit('check-databases', data);
    }

    break;
    case 'show-create-table':

    let clientIndex2 = server.clients.findIndex((client) => client.machineId === data.machineId);
    if (clientIndex2 === -1) {
      console.log("Client not found!");
      mainWindow.webContents.send('messageFromMain', {channel: 'show-create-table', error: 'Client not found!'});
    } else {
      console.log("Client found");
      let socketId = server.clients[clientIndex2].socketId;
      io.to(socketId).emit('show-create-table', data);
    }

    break;
    default:
    console.log(`This channel [${data.channel}] is not exist!`);
  }
});

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
    let showFields = await sqlQuery(`SHOW FIELDS FROM ${tableName} FROM ${selectedDatabase};`);
    let tableObj = {table: tableName, fields: showFields.response};
    db.push(tableObj);
  }

  return db;
}



// ipcMain.handle('invoker', async (event, data) => {
//   console.log("invoker:", data);
//   return 'world';
// });
