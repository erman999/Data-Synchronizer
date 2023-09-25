/***** Electron *****/
// Require electron libraries
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Define mainWindow as global variable
let mainWindow;

// Create main window
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
  });
  // Load main HTML file
  mainWindow.loadFile('index.html');
  // Open the DevTools (optional)
  mainWindow.webContents.openDevTools();
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
const express = require('express')();
const httpServer = require('http').createServer(express);
const io = require('socket.io')(httpServer);

// Store database connection pool
let promisePool = {};

// Store server variables
let server = {
  configs: {},
  clients: [],
  database: {},
  socket: {}
};


/***** Functions *****/
// Start application
async function startApp() {
  // Read config file
  const configs = await readFileJson(['configs', 'configs.json']);
  server.configs = configs;
  // Read clients file
  const clients = await readFileJson(['configs', 'clients.json']);
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
  // Create HTTP server
  httpServer.listen(server.configs.port, () => {
    server.socket.connection = true;
    server.socket.serverIp = getIpAdresses().v4;
    server.socket.port = server.configs.port;
    console.log(server);
    console.log(`Server listening on port ${server.configs.port}`);
    mainWindow.webContents.send('start', server);
  });
  // Start database connection checker loop
  connectionChecker();
}

// Check file/folder existence
async function fileExists(path) {
  return fs.promises.stat(path).then(() => true, () => false);
}

// Read file as json
async function readFileJson(pathArr) {
  // Warning: Electron-Forge changes application working directory as 'resources'

  // If '__dirname' added to 'path.join' new path will be like this
  // "C:\Users\...\Client-win32-x64\resources\app.asar\configs\configs.json"

  // Calling extraResource: ['./configs'] copies 'configs' folder into resources folder
  // In order to avoid  check both development and production paths

  // Define development and Electron-Forge folder structure
  const pathDevelopment = path.join(...pathArr);
  const pathProduction = path.join('resources', ...pathArr);

  // Check file existence
  const pathCheckerDev = await fileExists(pathDevelopment);
  const pathCheckerProd = await fileExists(pathProduction);

  // If file is not existed in both paths return false
  if (!pathCheckerDev && !pathCheckerProd) return false;
  // Assign real path
  const realPath = pathCheckerDev ? pathDevelopment : pathProduction;
  // Read file
  try {
    const contents = await fs.promises.readFile(realPath, { encoding: 'utf8' });
    return JSON.parse(contents.trim());
  } catch (err) {
    console.error(err.message);
    return false;
  }
}

// Write file as json
async function writeFileJson(pathArr, data) {
  // Handle Electron-Forge folder structure
  const pathDevelopment = path.join(...pathArr);
  const pathProduction = path.join('resources', ...pathArr);

  // Check file existence
  const pathCheckerDev = await fileExists(pathDevelopment);
  const pathCheckerProd = await fileExists(pathProduction);

  // If file is not existed in both paths return false
  if (!pathCheckerDev && !pathCheckerProd) return false;
  // Assign real path
  const realPath = pathCheckerDev ? pathDevelopment : pathProduction;
  // Write file
  try {
    await fs.promises.writeFile(realPath, JSON.stringify(data));
    console.log(`File [${realPath}] saved.`);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// Connect to database
async function connectToDatabase() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Trying to connect database...");
      const pool  = mysql.createPool({host: server.configs.mysqlIp, user: server.configs.mysqlUser, password: server.configs.mysqlPassword, dateStrings: true});
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
      if (server.database.connection === true) mainWindow.webContents.send('server-update', server);
    } else {
      // Database connection (Check connection persistence)
      let isDatabaseStillConnected = await sqlQuery('SELECT 1 AS connected;');
      if (isDatabaseStillConnected.result === false) {
        if (server.database.connection !== isDatabaseStillConnected.result) {
          server.database.connection = false;
          mainWindow.webContents.send('server-update', server);
        }
      }
    }

  }, 15*1000);
}

// Check client and server database tables, table fields, column types and keys
function databaseChecker(data) {
  // Create shorthand variables
  let clientDatabase = data.clientDatabase;
  let serverDatabase = data.serverDatabase;
  let collection = [];
  let totalClientRowCounter = 0;
  let totalServerRowCounter = 0;

  // Watch results
  let totalCheckResult = true;

  // Loop through all tables
  clientDatabase.forEach((table, i) => {
    // Match info variables
    let tableMatch = true;
    let columnMatch = true;
    let counterMatch = true;
    let clientRowCounter = 0;
    let serverRowCounter = 0;

    // Check server table existance on target database
    let tableMatchIndex = serverDatabase.findIndex(item => item.table === table.table);

    // Update table match info
    if (tableMatchIndex === -1) {
      // Update match info
      tableMatch = false;
      columnMatch = false;
    } else {
      // Duplicate counters (server and client databases will be discarded and this counter will remain)
      clientRowCounter = table.count;
      serverRowCounter = serverDatabase[tableMatchIndex].count;
      // Update counters
      totalClientRowCounter += table.count;
      totalServerRowCounter += serverDatabase[tableMatchIndex].count;
    }

    // Loop through each table columns for client
    table.fields.forEach((col, i) => {
      // If table exists do a column check
      if (tableMatch) {
        // Check if server table matches with client's table columns
        let columnCheck = serverDatabase[tableMatchIndex].fields.some(item => item.Field === col.Field && item.Type === col.Type && item.Key === col.Key);
        // Update column match info
        if (!columnCheck) columnMatch = false;
      }
    });

    // Update total check result (counterMatch is a warning not an error totalCheckResult so it does not affect the result)
    if (!tableMatch || !columnMatch) totalCheckResult = false;
    // Update counter check result
    if (!tableMatch || (serverDatabase[tableMatchIndex].count > table.count)) counterMatch = false;
    // Add results to collection array
    collection.push({table: table.table, tableMatch: tableMatch, columnMatch: columnMatch, counterMatch: counterMatch, clientRowCounter: clientRowCounter, serverRowCounter: serverRowCounter});
  });
  // Put everything together
  data.collection = collection;
  data.totalCheckResult = totalCheckResult;
  data.totalClientRowCounter = totalClientRowCounter;
  data.totalServerRowCounter = totalServerRowCounter;

  return data;
}

// Find and return client object, return false if not found
function getClientByMachineId(machineId) {
  let clientIndex = server.clients.findIndex((client) => client.machineId === machineId);
  if (clientIndex === -1) {
    return false;
  } else {
    return server.clients[clientIndex];
  }
}

// Prepare MySQL/MariaDB query statements
function prepareQueryStatements(databaseName, tableName, rowsArray) {
  // Store queries in this array
  let queries = [];
  // Loop through rows
  for (let row of rowsArray) {
    // Store keys and values
    let keys = '';
    let values = '';
    // Extract object entries & detect data type
    for (const [key, value] of Object.entries(row)) {
      keys += `\`${key}\`, `;
      values += `${typeof row[key] === 'string' ? "'"+value+"'" : value}, `;
    }
    // Remove trailing characters
    keys = keys.slice(0, -2);
    values = values.slice(0, -2);
    // Prepare INSERT statement
    let query = `INSERT INTO \`${databaseName}\`.\`${tableName}\` (${keys}) VALUES (${values});`;
    // Add query to queries array
    queries.push(query);
  }
  // Return all queries
  return queries;
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


/***** Socket Listeners *****/
io.on('connection', (socket) => {
  console.log('Connected socket.id:', socket.id);

  // Get disconnected client & update client status
  socket.on("disconnect", (reason) => {
    console.log("Disconnect socket.id:", socket.id);
    let clientIndex = server.clients.findIndex((onlineClient) => onlineClient.socketId === socket.id);
    if (clientIndex !== -1) {
      let client = server.clients[clientIndex];
      client.socket.connection = false;
      client.database.connection = false;
      mainWindow.webContents.send('update-client', client);
    } else {
      console.log(`This socket ${socket.id} is not exist in 'server.clients' array!`);
    }
  });

  // Get connected client's credentials
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
      // Add binding object
      client.binding = {binded: false};
      // Add this client to clients
      server.clients.push(client);
      // Save clients file
      writeFileJson(['configs', 'clients.json'], server.clients);
      // Tell user register/setup required.
      mainWindow.webContents.send('new-client', client);
    } else {
      // Add preserved values to client
      client.name = server.clients[clientIndex].name;
      // Add binding details
      client.binding = server.clients[clientIndex].binding ?? {binded: false};
      // Update clients on server
      server.clients[clientIndex] = client;
      // Save clients
      writeFileJson(['configs', 'clients.json'], server.clients);
      // Update renderer
      mainWindow.webContents.send('registered-client', client);
    }
  });

  // Get client's database connection status
  socket.on('update-client', (data) => {
    console.log('update-client', data);
    let client = getClientByMachineId(data.machineId);
    if (client !== false) {
      client.database.connection = data.database.connection;
      mainWindow.webContents.send('update-client', client);
    }
  });

  // Get client's database table CREATE command
  socket.on('show-create-table', async (data) => {
    mainWindow.webContents.send('show-create-table', {showCreate: data.showCreate});
  });

  // Client will evaluate and send missing data through this channel
  socket.on('synchronizer', async (client) => {
    // Loop through preserved collection
    for (let table of client.binding.preserve.collection) {
      // Prepare SQL statements for each data object (this function will return array of statements)
      let statement = prepareQueryStatements(client.binding.database, table.table, table.insertData);
      // Loop through all SQL statements
      for (let query of statement) {
        // Send each statement to SQL server
        let insert = await sqlQuery(query);
      }
      // Delete inserted data
      delete table.insertData
    }
    // Update running status
    client.running = false;
    // Send results to renderer
    mainWindow.webContents.send('synchronizer', { error: false, client: client });
  });

});


/***** IPC Listeners *****/
// Send client object to renderer
ipcMain.handle('get-configs', (event, data) => {
  return server;
});

// Save sent configs and return to renderer
ipcMain.handle('save-configs', (event, data) => {
  server.configs = data;
  writeFileJson(['configs', 'configs.json'], data);
  return true;
});

// Find client and send back to renderer
ipcMain.handle('get-client', async (event, data) => {
  console.log("get-client:", data);
  let client = getClientByMachineId(data.machineId);
  return client;
});

// Change client's name and save
ipcMain.handle('change-name', async (event, data) => {
  let client = getClientByMachineId(data.machineId);
  if (client === false) return {error: true, message: 'Client not found!'};
  client.name = data.name;
  writeFileJson(['configs', 'clients.json'], server.clients);
  return {error: false, message: 'Name changed'};
});

// Refresh listed databases
ipcMain.handle('refresh-databases', async (event, data) => {
  // Check server database connection
  if (!server.database.connection) return {error: true, message: 'Server is not connected to database!', databases: []};
  // Create return database array
  let databases = [];
  // Get databases from server database
  let showDatabases = await sqlQuery('SHOW DATABASES;');
  // Organise values
  showDatabases.response.forEach((db, i) => {
    databases.push(Object.values(db)[0]);
  });
  // Define SQL specific databases
  let toRemove = ['mysql', 'information_schema', 'performance_schema'];
  // Remove SQL specific databases
  databases = databases.filter((el) => !toRemove.includes(el));
  // Send databases to renderer
  return {databases: databases, error: false};
});

// Compare client database and target server database
ipcMain.on('check-databases', async (event, data) => {
  console.log('check-databases:', data);
  // Get client
  let client = getClientByMachineId(data.machineId);
  // If client not found return error
  if (client === false) return {error: true, message: 'Client not found!'};
  // If client is not connected to database return error
  if (!client.socket.connection) return {error: true, message: 'Client offline!'};
  // Request client database details
  io.to(client.socketId).timeout(10000).emit('check-databases', false, async (err, response) => {
    let clientDatabase = response.length > 0 ? response[0] : [];
    let serverDatabase = await getDatabaseDetails(data.selectedDatabase);
    mainWindow.webContents.send('check-databases', {machineId: client.machineId, selectedDatabase: data.selectedDatabase, binding: client.binding, databases: {serverDatabase: serverDatabase, clientDatabase: clientDatabase}});
  });
});

// Save client's target database binding
ipcMain.handle('save-binding-details', async (event, data) => {
  let client = getClientByMachineId(data.machineId);
  if (client === false) return {error: true, message: 'Client not found!'};
  client.binding = data.binding;
  writeFileJson(['configs', 'clients.json'], server.clients);
  return {error: false, message: `Client binded to database ${data.binding.database}`};
});

// Send SQL CREATE command to renderer
ipcMain.on('show-create-table', async (event, data) => {
  let client = getClientByMachineId(data.machineId);
  if (client === false) return {error: true, message: 'Client not found!'};
  io.to(client.socketId).emit('show-create-table', data);
});

// Delete client
ipcMain.handle('delete-client', async (event, data) => {
  let clientIndex = server.clients.findIndex((client) => client.machineId === data.machineId);
  if (clientIndex === -1) {
    return {error: true, message: 'Client not found!'};
  } else {
    server.clients.splice(clientIndex, 1);
    writeFileJson(['configs', 'clients.json'], server.clients);
    return {error: false, message: 'Client deleted'};
  }
});

// Synchronize client's data with target server database
ipcMain.on('synchronizer', async (event, machineId) => {
  let client = getClientByMachineId(machineId);

  // Check client's connections, binding, running statuses
  if (client === false) return mainWindow.webContents.send('synchronizer', {error: true, machineId: machineId, message: 'Synchronizer: Client not found!'});
  if (client.socket.connection === false) return mainWindow.webContents.send('synchronizer', {error: true, machineId: machineId, message: 'Synchronizer: Client is not connected to server!'});
  if (client.database.connection === false) return mainWindow.webContents.send('synchronizer', {error: true, machineId: machineId, message: 'Synchronizer: Client is not connected to database!'});
  if (client.binding.binded === false) return mainWindow.webContents.send('synchronizer', {error: true, machineId: machineId, message: 'Synchronizer: Client database binding is invalid!'});
  if (!client.binding.hasOwnProperty('running')) client.running = false;
  if (client.running === true) return mainWindow.webContents.send('synchronizer', {error: true, machineId: machineId, message: 'Synchronizer is running.'});

  // Check client and server database compability
  io.to(client.socketId).timeout(10000).emit('check-databases', false, async (err, response) => {
    // Prepare database diagnosis package
    let clientDatabase = response.length > 0 ? response[0] : [];
    let serverDatabase = await getDatabaseDetails(client.binding.database);
    let databases = {clientDatabase: clientDatabase, serverDatabase: serverDatabase};
    let checkResult = databaseChecker(databases);
    let preserve = {collection: checkResult.collection, totalCheckResult: checkResult.totalCheckResult, totalClientRowCounter: checkResult.totalClientRowCounter, totalServerRowCounter: checkResult.totalServerRowCounter};
    // Diagnosis to client object
    client.binding.preserve = preserve;
    client.running = true;
    // Send client object to client (client will add data and send this package back to socket channel)
    io.to(client.socketId).emit('synchronizer', client);
  });

});
