/***** Elements *****/
let serverIp = document.querySelector('#serverIp');
let port = document.querySelector('#port');
let database = document.querySelector('#database');


/***** Elements - Modal *****/
let modal = document.querySelector('#modal');
let modalMachineId = document.querySelector('#modal-machineId');
let modalName = document.querySelector('#modal-name');
let modalNameChange = document.querySelector('#modal-name-change');
let modalClientdb = document.querySelector('#modal-clientdb');
let modalTables = document.querySelector('#modal-tables');
let modalServerDatabases = document.querySelector('#modal-server-databases');
let modalRefreshBtn = document.querySelector('#modal-refresh-button');
let modalCheckBtn = document.querySelector('#modal-check-button');
let modalBindBtn = document.querySelector('#modal-bind-button');
let modalDatabaseHelp = document.querySelector('#modal-database-help');
let modalShowCreate = document.querySelector('#modal-show-create');
let modalDeleteBtn = document.querySelector('#modal-delete-button');
let modalConfirmBtn = document.querySelector('#modal-confirm-button');
let modalDeleteHelp = document.querySelector('#modal-delete-help');


/***** Event listeners *****/
// Close modal window on various closing activities
document.querySelectorAll('.modal .modal-background, .modal .delete, .modal .cancel').forEach((el, i) => {
  // Add elements to click listener
  el.addEventListener('click', resetModalWindow, false);
});

// Change client display name
modalNameChange.addEventListener('click', function() {
  // Get client info
  let name = modalName.value.trim();
  let machineId = modalMachineId.value.trim();
  // Send to main
  window.ipcRender.invoke('change-name', {name: name, machineId: machineId}).then((result) => {
    // If gives error just show error message
    if (result.error) return toast('danger', result.message);
    // Show success message and update name
    toast('success', result.message);
    // Get main screen client row
    let row = document.querySelector(`tr[data-machineId="${machineId}"]`);
    // Change name client's name on main screen
    row.querySelector('.name').textContent = name;
  });
});

// Refresh server databases
modalRefreshBtn.addEventListener('click', function() {
  // Request server databases
  window.ipcRender.invoke('refresh-databases', false).then((data) => {
    refreshDatabases(data);
  });
});

// Run a check diagnosis for Client-Server database match
modalCheckBtn.addEventListener('click', function() {
  // Check for database selection
  if (modalServerDatabases.value == 0) return toast('danger', 'Please select a valid database!');
  // Get selected database & prepare data
  let data = {selectedDatabase: modalServerDatabases.value, machineId: modalMachineId.value.trim()};
  // Send to main
  window.ipcRender.send('compare-databases', data);
});

// Bind client database to a server database
modalBindBtn.addEventListener('click', function() {
  // Get machineId
  let machineId = modalMachineId.value.trim();
  // Get user database selection
  let selectedDatabase = modalServerDatabases.options[modalServerDatabases.selectedIndex].value;
  // Collect user selections in an array
  let userSelection = [];
  // Get table selections
  let selects = modalTables.querySelectorAll('tbody select');
  // Find selections and store in created container
  selects.forEach((select, i) => {
    let selTable = select.dataset.table;
    let selColumn = select.options[select.selectedIndex].value;
    userSelection.push({table: selTable, column: selColumn});
  });
  // Construct data pattern
  let bindingData = {
    machineId: machineId,
    binding: {
      binded: true,
      database: selectedDatabase,
      tables: userSelection
    }
  };
  // Send data to main
  window.ipcRender.invoke('save-binding-details', bindingData).then((result) => {
    // Show error
    if (result.error) return toast('danger', result.message);
    // Find that row
    // let row = document.querySelector(`tr[data-machineId="${machineId}"]`);
    // Show notification
    toast('success', result.message);

    // FIXME: Looperın başlatılması gerek
    // loopChecker(data.client);
  });
});

// Delete client (ask for confirmation)
modalDeleteBtn.addEventListener('click', function() {
  // Confirm delete client
  modalConfirmBtn.classList.toggle('is-hidden');
  // Show/Hide helper
  modalDeleteHelp.classList.toggle('is-hidden');
});


// Confirm client deletion
modalConfirmBtn.addEventListener('click', function() {
  // Get machineId
  let machineId = modalMachineId.value.trim();
  // Delete client from main
  window.ipcRender.invoke('delete-client', {machineId: machineId}).then((result) => {
    // If gives error just show error message
    if (result.error) return toast('danger', result.message);
    // Close modal window
    document.querySelector('.modal .cancel').click();
    // Find that row
    let row = document.querySelector(`tr[data-machineId="${machineId}"]`);
    // Remove the row
    row.remove();
    // Show notification
    toast('success', result.message);
  });
});


/***** IPC Listeners *****/
// Receive server info and display on main screen
window.ipcRender.receive('start', (data) => {
  console.log({channel: 'start', data: data});
  // Print server info texts
  serverIp.textContent = data.socket.serverIp;
  port.textContent = data.socket.port;
  database.textContent = data.database.connection;
  // Style server info texts
  database.textContent = data.database.connection ? 'Connected' : 'Disconnected';
  database.classList.add(data.database.connection ? 'is-success' : 'is-danger');
  database.classList.remove(data.database.connection ? 'is-danger' : 'is-success');
  // Print clients
  data.clients.forEach((client, i) => {
    appendClient(client);
  });
  // Get server databases
  if (data.database.connection) {
    // Request server databases
    window.ipcRender.invoke('refresh-databases', false).then((data) => {
      refreshDatabases(data);
    });
  }
});

// Recive database connection changes
window.ipcRender.receive('server-update', (data) => {
  console.log({channel: 'server-update', data: data});
  // Update server info
  database.textContent = data.database.connection ? 'Connected' : 'Disconnected';
  database.classList.add(data.database.connection ? 'is-success' : 'is-danger');
  database.classList.remove(data.database.connection ? 'is-danger' : 'is-success');
  // Update server databases
  window.ipcRender.invoke('refresh-databases', false).then((data) => {
    refreshDatabases(data);
  });
});

// New client connection
window.ipcRender.receive('new-client', (client) => {
  console.log({channel: 'new-client', client: client});
  appendClient(client);
});

// Registered client connection
window.ipcRender.receive('registered-client', (client) => {
  console.log({channel: 'registered-client', client: client});
  updateClient(client);
});

// Client status update
window.ipcRender.receive('update-client', (client) => {
  console.log({channel: 'update-client', client: client});
  updateClient(client);
});

// Compare client database with server target database
window.ipcRender.receive('compare-databases', (data) => {
  console.log({channel: 'compare-databases', data: data});
  // Define shorthand variables
  let clientDatabase = data.databases.clientDatabase;
  let serverDatabase = data.databases.serverDatabase;
  // Get only table body
  let checkTable = modalTables.querySelector('tbody');
  // Clear table
  while (checkTable.firstChild) {
    checkTable.removeChild(checkTable.lastChild);
  }
  // Watch results
  let totalCheckResult = true;
  // Loop for each client table
  clientDatabase.forEach((table, i) => {
    // Match info variables
    let tableMatch = true;
    let columnMatch = true;
    // Check server table existance on target database
    let tableMatchIndex = serverDatabase.findIndex(item => item.table === table.table);
    // Update table match info
    if (tableMatchIndex === -1) {
      tableMatch = false;
      columnMatch = false;
    }
    // HTML collector for option elements
    let options = '';
    // Loop through each table columns for client
    table.fields.forEach((col, i) => {
      // Create options
      let option = `<option value="${col.Field}" ${col.Key === 'PRI' ? 'selected' : 'disabled'}>${col.Field}</option>`;
      // Append in options
      options += option;
      // If table exists do a column check
      if (tableMatch) {
        // Check if server table matches with client's table columns
        let columnCheck = serverDatabase[tableMatchIndex].fields.some(item => item.Field === col.Field && item.Type === col.Type && item.Key === col.Key);
        // Update column match info
        if (!columnCheck) columnMatch = false;
      }
    });
    // Update total check result
    if (!tableMatch || !columnMatch) totalCheckResult = false;
    // Create table row
    let row = `<tr>
    <td><a href="#" class="show-create-table">${table.table}</a></td>
    <td>
    <div class="select is-small is-fullwidth">
    <select data-table="${table.table}">
    ${options}
    </select>
    </div>
    </td>
    <td><span class="tag ${tableMatch ? 'is-success' : 'is-danger'}">${tableMatch ? 'OK' : 'NOK'}</span></td>
    <td><span class="tag ${columnMatch ? 'is-success' : 'is-danger'}">${columnMatch ? 'OK' : 'NOK'}</span></td>
    <td>700000</td>
    <td>700000</td>
    </tr>`;
    // Insert elements
    checkTable.insertAdjacentHTML('beforeend', row);
    // Show CREATE TABLE query when clicked on table name
    checkTable.lastChild.querySelector('.show-create-table').addEventListener('click', function() {
      window.ipcRender.send('show-create-table', {machineId: data.machineId, tableName: table.table});
    });
  });
});

// Show client database table CREATE command
window.ipcRender.receive('show-create-table', (data) => {
  modalShowCreate.value = data.showCreate.response[0]['Create Table'];
});

// Data transfer loop
window.ipcRender.receive('transfer-data', (data) => {
  console.log({channel: 'transfer-data', data: data});
  setTimeout(function() {
    console.log("Time is out...");
    // loopChecker(data);
  }, 3000);
});


/***** Functions *****/
// Render client on main screen
function appendClient(client) {
  // Create client HTML
  let html = `<tr data-machineId="${client.machineId}">
  <td><span class="name tag is-black">${client.name}</span></td>
  <td><span class="clientIp tag is-black">${client.clientIp}</span></td>
  <td><span class="server-connection tag ${client.socket.connection ? 'is-success' : 'is-danger'}">${client.socket.connection ? 'Connected': 'Disconnected'}</span></td>
  <td><span class="database-connection tag ${client.database.connection ? 'is-success' : 'is-danger'}">${client.database.connection ? 'Connected': 'Disconnected'}</span></td>
  <td>
  <button class="sync button is-small ${client.binding.binded ? 'is-success' : 'is-danger'}">
  <span class="icon">
  <svg class="icon"><use xlink:href="./img/symbol-defs.svg#${client.binding.binded ? 'icon-check' : 'icon-cross'}"></use></svg>
  </span>
  </button>
  </td>
  <td>
  <button class="configs button is-warning is-small">
  <span class="icon">
  <svg class="icon"><use xlink:href="./img/symbol-defs.svg#icon-menu"></use></svg>
  </span>
  </button>
  </td>
  </tr>`;
  // Get clients table
  let table = document.querySelector('.table-clients tbody');
  // Insert prepared HTML
  table.insertAdjacentHTML('beforeend', html);
  // Get last inserted element
  table.lastChild.querySelector('.configs').addEventListener('click', function(e) {
    // Open modal window
    modal.classList.add('is-active');
    // Request server databases
    window.ipcRender.invoke('refresh-databases', false).then((data) => {
      refreshDatabases(data);
    }).then(() => {
      // Request updated client object
      window.ipcRender.invoke('get-client', {machineId: client.machineId}).then((thisClient) => {
        console.log('get-client', thisClient);
        // Print client information
        modalMachineId.value = thisClient.machineId;
        modalName.value = thisClient.name;
        modalClientdb.value = thisClient.configs.mysqlDatabase;
        // Check client connections
        if (!thisClient.socket.connection || !thisClient.database.connection) {
          modalServerDatabases.disabled = true;
          modalBindBtn.disabled = true;
          modalCheckBtn.disabled = true;
          modalRefreshBtn.disabled = true;
          toast('danger', 'In order to change settings client must be connected to server and database!');
          return false;
        }
        // Check binding details
        if (thisClient.binding.binded) {
          // Select client's binded database
          let options = modalServerDatabases.querySelectorAll('option');
          // Store user target database index here
          let index = 0;
          // Loop all options
          options.forEach((option, key) => {
            // Remove selected attribute from all options
            option.removeAttribute('selected');
            // Find target database index and set it to index variable
            if (option.value == thisClient.binding.database) index = key;
          });
          // Select target index
          modalServerDatabases.selectedIndex = index;
          // Prepare data
          let data = {selectedDatabase: thisClient.binding.database, machineId: modalMachineId.value.trim()};
          // Send to main
          window.ipcRender.send('compare-databases', data);
        } else {
          toast('danger', 'This client is not binded to any database!');
        }
      });
    });
  });
}

// Update client info
function updateClient(client) {
  // Get client row on main screen
  let row = document.querySelector(`tr[data-machineId="${client.machineId}"]`);
  // Update client ip adress
  row.querySelector('.clientIp').textContent = client.clientIp;
  // Update client server connection
  let serverConnectionCol = row.querySelector('.server-connection');
  serverConnectionCol.textContent = client.socket.connection ? 'Connected': 'Disconnected';
  serverConnectionCol.classList.add(client.socket.connection ? 'is-success' : 'is-danger');
  serverConnectionCol.classList.remove(client.socket.connection ? 'is-danger' : 'is-success');
  // Update client database connection
  let databaseConnectionCol = row.querySelector('.database-connection');
  databaseConnectionCol.textContent = client.database.connection ? 'Connected': 'Disconnected';
  databaseConnectionCol.classList.add(client.database.connection ? 'is-success' : 'is-danger');
  databaseConnectionCol.classList.remove(client.database.connection ? 'is-danger' : 'is-success');
  // Start loop checker
  loopChecker(client);
}

// Toast notification
function toast(type, message) {
  // Get body element
  let body = document.querySelector('body');
  // Remove previous messages
  body.querySelectorAll('.notification').forEach((el, i) => {
    el.remove();
  });
  // Create new notification element
  let html = `<div class="notification is-${type === 'success' ? 'success' : 'danger'}">
  <button class="delete"></button>
  <div class="is-flex is-align-items-center">
  <span class="icon">
  <svg class="icon"><use xlink:href="./img/symbol-defs.svg#icon-${type === 'success' ? 'check' : 'cross'}"></use></svg>
  </span>
  <span class="ml-2">${message}</span>
  </div>
  </div>`;
  // Append notification element to body
  body.insertAdjacentHTML('beforeend', html);
  // Grab last child from body
  let lastChild = body.lastChild;
  // Listen close notification activity
  lastChild.querySelector('.delete').addEventListener('click', function() {
    lastChild.remove();
  });
  // Remove notification after a while
  setTimeout(function() {
    lastChild.remove();
  }, 3000);

  return false;
}

// List server databases on modal screen
function refreshDatabases(data) {
  // Show error if exists
  if (data.error) {
    modalDatabaseHelper(data.message, 'is-danger');
    return false;
  }
  // Show number of databases
  modalDatabaseHelper(`Listing ${data.databases.length} databases`, 'is-black');
  // Remove previous options
  while (modalServerDatabases.firstChild) {
    modalServerDatabases.removeChild(modalServerDatabases.lastChild);
  }
  // Add Select database option
  let option = `<option value="0" selected disabled>Select database</option>`;
  modalServerDatabases.insertAdjacentHTML('beforeend', option);
  // Append options
  data.databases.forEach((db, i) => {
    let option = `<option value="${db}">${db}</option>`;
    modalServerDatabases.insertAdjacentHTML('beforeend', option);
  });
}

// Database helper text messages
function modalDatabaseHelper(text, color) {
  // Define colors
  let colors = ['is-primary', 'is-link', 'is-info', 'is-success', 'is-warning', 'is-danger', 'is-white', 'is-light', 'is-dark', 'is-black'];
  // Remove current color
  modalDatabaseHelp.classList.remove(...colors);
  // Add new color
  modalDatabaseHelp.classList.add(color);
  // Append text
  modalDatabaseHelp.textContent = text;
}

// Reset modal window (usually on close activity)
function resetModalWindow() {
  // Close modal
  modal.classList.remove('is-active');
  // Enable buttons
  modalServerDatabases.disabled = false;
  modalBindBtn.disabled = false;
  modalCheckBtn.disabled = false;
  modalRefreshBtn.disabled = false;
  // Clear machineId
  modalMachineId.value = '';
  // Clear show create textarea
  modalShowCreate.value = '';
  // Hide Delete elements
  modalConfirmBtn.classList.add('is-hidden');
  modalDeleteHelp.classList.add('is-hidden');
  // Clear table
  let checkTable = modalTables.querySelector('tbody');
  while (checkTable.firstChild) {
    checkTable.removeChild(checkTable.lastChild);
  }
}

// Check client's connetions and start data transfer loop
function loopChecker(client) {
  return false;

  console.log('loopChecker: ', client.machineId);
  console.log(client.socket.connection, client.database.connection, client.binding.binded);

  // Check client ready for data transfer loop
  if (client.socket.connection && client.database.connection && client.binding.binded) {
    // Start loop
    console.log("Client loop started.");
    window.ipcRender.send('max-id', {machineId: client.machineId});
  } else {
    // Wait for a while then try again
    console.log("Client NOT ready for loop.");
  }
}

// FIXME: This may no be neccessary
function syncStyler(machineId, color) {
  let colors = ['is-loading', 'is-primary', 'is-link', 'is-info', 'is-success', 'is-warning', 'is-danger', 'is-white', 'is-light', 'is-dark', 'is-black'];

  let row = document.querySelector(`tr[data-machineId="${machineId}"]`);
  let btn = document.querySelector('button.sync');
  let svg = btn.querySelector('svg use');
  let xlink = svg.getAttribute('xlink:href').split('#');

  btn.classList.remove(...colors);

  switch (color) {
    case 'is-loading':
    btn.classList.add('is-loading', 'is-link');
    break;
    case 'is-success':
    btn.classList.add('is-success');
    svg.setAttribute('xlink:href', xlink[0] + '#icon-check');
    break;
    case 'is-danger':
    btn.classList.add('is-danger');
    svg.setAttribute('xlink:href', xlink[0] + '#icon-cross');
    break;
    default:
    // Nothing to do here
  }
}
