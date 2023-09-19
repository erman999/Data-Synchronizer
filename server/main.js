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
      mainWindow.webContents.send('update-client', client);
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
      // Add binding object
      client.binding = {binded: false};
      // Add this client to clients
      server.clients.push(client);
      // Save clients file
      saveClientsFile(server.clients);
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
      saveClientsFile(server.clients);
      // Update renderer
      mainWindow.webContents.send('registered-client', client);
    }
  });


  socket.on('update-client', (data) => {
    console.log('update-client', data);
    let client = getClientByMachineId(data.machineId);
    if (client !== false) {
      client.database.connection = data.database.connection;
      mainWindow.webContents.send('update-client', client);
    }
  });



  // socket.on('compare-databases', async (data) => {
  //   console.log("compare-databases:", data);
  //   // Check for server database connection
  //   if (!server.database.connection) {
  //     // Server is not connected to a database
  //     // FIXME: Add error message here
  //     return false;
  //   }
  //   // Get client
  //   let client = getClientByMachineId(data.serverData.machineId);
  //   // Organise client information
  //   let selectedDatabase = client.binding.database;
  //   let machineId = client.machineId;
  //   // Get server database details
  //   let serverDatabase = await getDatabaseDetails(selectedDatabase);
  //   // Set received client database details
  //   let clientDatabase = data.clientDatabase;
  //   // Send data back to renderer
  //   // mainWindow.webContents.send('messageFromMain', {channel: 'check-databases', databases: {serverDatabase: serverDatabase, clientDatabase: clientDatabase, machineId: machineId}});
  // });



  socket.on('show-create-table', async (data) => {
    mainWindow.webContents.send('show-create-table', {showCreate: data.showCreate});
  });




  socket.on('max-id', async (client) => {

    for (const tbl of client.binding.tables) {
      let maxId = await sqlQuery(`SELECT MAX(\`${tbl.column}\`) AS maxId FROM \`${client.binding.database}\`.\`${tbl.table}\`;`);
      if (maxId.result) {
        tbl.serverMaxId = maxId.response[0].maxId === null ? 0 : maxId.response[0].maxId;
        tbl.serverError = false;
      } else {
        tbl.serverMaxId = 0;
        tbl.serverError = true;
      }
    }

    // Check is there any error. If so, returns 'true' else 'false'
    let isThereAnyError = client.binding.tables.every(item => item.clientError === true || item.serverError === true);
    if (isThereAnyError) {
      // Display some error message on the screen
      console.log("Some errors found!");
      return false;
    } else {
      io.to(client.socketId).emit('transfer-data', client);
    }

    console.log(client.binding);
    console.log("isThereAnyError:", isThereAnyError);
  });



  socket.on('transfer-data', async (client) => {

    // HAHAHAHAHAHAHAHAHAHAH
    for (let tbl of client.binding.insert) {

      if (tbl.result) {
        for (let row of tbl.response) {

          let keys = '';
          let values = '';

          for (const [key, value] of Object.entries(row)) {
            keys += `\`${key}\`, `;
            values += `${typeof row[key] === 'string' ? "'"+value+"'" : value}, `;
          }

          keys = keys.slice(0, -2);
          values = values.slice(0, -2);

          // console.log(keys);
          // console.log(values);

          let query = `INSERT INTO \`${client.binding.database}\`.\`${tbl.table}\` (${keys}) VALUES (${values});`;

          console.log("------------");
          console.log(query);
          let insert = await sqlQuery(query);
          console.log(insert);
          console.log("------------");
        }
      }

    }

    client.binding.insert = {};


    // let maxId = await sqlQuery(``);
    mainWindow.webContents.send('messageFromMain', {channel: 'transfer-data', client: client});
  });



});



// IPC listeners
ipcMain.on('messageToMain', async (event, data) => {
  console.log(data);
  switch (data.channel) {

    case 'max-id':
    let client = getClientByMachineId(data.machineId);
    if (client !== false) {
      io.to(client.socketId).emit('max-id', client);
    } else {
      console.log("max-id: Client not found.");
    }
    break;
    default:
    console.log(`This channel [${data.channel}] is not exist!`);
  }
});



ipcMain.on('show-create-table', async (event, data) => {
  console.log("show-create-table:", data);
  let client = getClientByMachineId(data.machineId);
  if (client === false) return {error: true, message: 'Client not found!'};
  io.to(client.socketId).emit('show-create-table', data);
});



ipcMain.handle('save-binding-details', async (event, data) => {
  console.log("save-binding-details:", data);
  // Error
  let client = getClientByMachineId(data.machineId);
  if (client === false) return {error: true, message: 'Client not found!'};
  // Success
  client.binding = data.binding;
  saveClientsFile(server.clients);
  return {error: false, message: `Client binded to server '${data.binding.database}' database`};
});




function getClientByMachineId(machineId) {
  let clientIndex = server.clients.findIndex((client) => client.machineId === machineId);
  if (clientIndex === -1) {
    return false;
  } else {
    return server.clients[clientIndex];
  }
}


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


ipcMain.handle('delete-client', async (event, data) => {
  console.log("delete-client:", data);

  let clientIndex = server.clients.findIndex((client) => client.machineId === data.machineId);
  if (clientIndex === -1) {
    return {error: true, message: 'Client not found!'};
  } else {
    server.clients.splice(clientIndex, 1);
    saveClientsFile(server.clients);
    return {error: false, message: 'Client deleted'};
  }

});


ipcMain.handle('change-name', async (event, data) => {
  console.log("change-name:", data);
  let client = getClientByMachineId(data.machineId);
  if (client === false) return {error: true, message: 'Client not found!'};
  client.name = data.name;
  saveClientsFile(server.clients);
  return {error: false, message: 'Name changed'};
});


ipcMain.handle('get-client', async (event, data) => {
  console.log("get-client:", data);
  let client = getClientByMachineId(data.machineId);
  return client;
});


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



ipcMain.on('compare-databases', async (event, data) => {
  console.log('compare-databases:', data);
  // Get client
  let client = getClientByMachineId(data.machineId);
  // If client not found return error
  if (client === false) return {error: true, message: 'Client not found!'};
  // If client is not connected to database return error
  if (!client.socket.connection) return {error: true, message: 'Client offline!'};
  // Request client database details
  io.to(client.socketId).timeout(10000).emit('compare-databases', false, async (err, response) => {
    let clientDatabase = response.length > 0 ? response[0] : [];
    let serverDatabase = await getDatabaseDetails(data.selectedDatabase);
    // let databases = {serverDatabase: serverDatabase, clientDatabase: clientDatabase};
    // mainWindow.webContents.send('messageFromMain', {channel: 'compare-databases', databases: {serverDatabase: serverDatabase, clientDatabase: clientDatabase, machineId: data.machineId}});

    mainWindow.webContents.send('compare-databases', {machineId: client.machineId, databases: {serverDatabase: serverDatabase, clientDatabase: clientDatabase}});
  });
});
