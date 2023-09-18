// Essentials
let serverIp = document.querySelector('#serverIp');
let port = document.querySelector('#port');
let database = document.querySelector('#database');

// Modal elements
let modal = document.querySelector('#modal');
let modalMachineId = document.querySelector('#modal-machineId');
let modalName = document.querySelector('#modal-name');
let modalNameChange = document.querySelector('#modal-name-change');
let modalNameHelp = document.querySelector('#modal-name-help');
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
let modalSaveBtn = document.querySelector('#modal-save-button');

// Global variables
let preparedBinding = {};


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


function loopChecker(client) {
  return false;

  console.log('loopChecker: ', client.machineId);
  console.log(client.socket.connection, client.database.connection, client.binding.binded);

  // Check client ready for data transfer loop
  if (client.socket.connection && client.database.connection && client.binding.binded) {
    // Start loop
    console.log("Client loop started.");
    window.ipcRender.send('messageToMain', {channel: 'max-id', machineId: client.machineId});
  } else {
    // Wait for a while then try again
    console.log("Client NOT ready for loop.");
  }
}


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


modalDeleteBtn.addEventListener('click', function() {
  modalConfirmBtn.classList.toggle('is-hidden');
  modalDeleteHelp.classList.toggle('is-hidden');
});

modalConfirmBtn.addEventListener('click', function() {
  let machineId = modalMachineId.value.trim();

  window.ipcRender.invoke('delete-client', {machineId: machineId}).then((result) => {
    console.log("delete-client:", result);

    if (result.error) {
      // If gives error just show error message
      modalNameHelp.textContent = result.message;
      toast('danger', result.message);
      return;
    }

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

function modalDatabaseHelper(text, color) {
  let colors = ['is-primary', 'is-link', 'is-info', 'is-success', 'is-warning', 'is-danger', 'is-white', 'is-light', 'is-dark', 'is-black'];
  modalDatabaseHelp.classList.remove(...colors);
  modalDatabaseHelp.classList.add(color);
  modalDatabaseHelp.textContent = text;
}

function resetModalWindow() {
  // Close modal
  modal.classList.remove('is-active');
  // Clear machineId
  modalMachineId.value = '';
  // Clear show create textarea
  modalShowCreate.value = '';
  // Clear preparedBinding global variable
  preparedBinding = {};
  // Clear helpers
  modalNameHelp.textContent = '';
  // Hide Delete elements
  modalConfirmBtn.classList.add('is-hidden');
  modalDeleteHelp.classList.add('is-hidden');
  // Clear table
  let checkTable = modalTables.querySelector('tbody');
  while (checkTable.firstChild) {
    checkTable.removeChild(checkTable.lastChild);
  }
  // Update styling
  modalBindBtn.textContent = 'Bind';
  modalBindBtn.classList.add('is-link');
  modalBindBtn.classList.remove('is-danger');
  // Enable/Disable some buttons and selections
  modalServerDatabases.disabled = false;
  modalRefreshBtn.disabled = false;
  modalCheckBtn.disabled = false;
  modalBindBtn.disabled = true;
}

// Close modal window on various closing activities
document.querySelectorAll('.modal .modal-background, .modal .delete, .modal .cancel').forEach((el, i) => {
  el.addEventListener('click', resetModalWindow, false);
});

modalRefreshBtn.addEventListener('click', function() {
  // Request server databases
  window.ipcRender.invoke('refresh-databases', false).then((data) => {
    refreshDatabases(data);
  });
});

modalCheckBtn.addEventListener('click', function() {
  // Get selected database & prepare data
  let data = {selectedDatabase: modalServerDatabases.value, machineId: modalMachineId.value.trim()};
  // Send to main
  window.ipcRender.send('compare-databases', data);
});

modalNameChange.addEventListener('click', function() {
  // Get user values
  let name = modalName.value.trim();
  let machineId = modalMachineId.value.trim();
  // Send to main
  window.ipcRender.invoke('change-name', {name: name, machineId: machineId}).then((result) => {
    console.log("change-name:", result);
    if (result.error) {
      // If gives error just show error message
      modalNameHelp.textContent = result.message;
    } else {
      // Show success message and update name
      modalNameHelp.textContent = result.message;
      let row = document.querySelector(`tr[data-machineId="${machineId}"]`);
      row.querySelector('.name').textContent = name;
    }
  });
});


function lockModalFields(arg) {
  if (arg) {
    // Update styling
    modalBindBtn.textContent = 'Bind';
    modalBindBtn.classList.add('is-link');
    modalBindBtn.classList.remove('is-danger');
    // Enable/Disable some buttons and selections
    modalServerDatabases.disabled = false;
    modalRefreshBtn.disabled = false;
    modalCheckBtn.disabled = false;
    modalBindBtn.disabled = true;
    // Disable table column selection
    let selects = modalTables.querySelectorAll('tbody select');
    selects.forEach((select, i) => {
      select.disabled = false;
    });
    // Show helper text
    modalDatabaseHelper('Database unbinded!', 'is-danger');
  } else {
    // Update button styling
    modalBindBtn.textContent = 'Unbind';
    modalBindBtn.classList.add('is-danger');
    modalBindBtn.classList.remove('is-link');
    // Enable/Disable some buttons and selections
    modalServerDatabases.disabled = true;
    modalRefreshBtn.disabled = true;
    modalCheckBtn.disabled = true;
    // Disable table column selection
    let selects = modalTables.querySelectorAll('tbody select');
    selects.forEach((select, i) => {
      select.disabled = true;
    });
    // Show helper text
    modalDatabaseHelper('Database binded. Ready to save.', 'is-success');
  }
}

modalBindBtn.addEventListener('click', function() {

  // Detect if user clicked Unbind button
  if (preparedBinding.hasOwnProperty('binded') && preparedBinding.binded === true) {
    // Lock/unlock modal binding fields
    lockModalFields(true);

    // Construct data pattern
    let bindingDetails = {
      machineId: modalMachineId.value.trim(),
      binding: {binded: false}
    };
    preparedBinding = bindingDetails;
    console.log(preparedBinding);
    return false;
  }

  // Lock/unlock modal binding fields
  lockModalFields(false);
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
  let bindingDetails = {
    machineId: modalMachineId.value.trim(),
    binding: {
      binded: true,
      database: selectedDatabase,
      tables: userSelection
    }
  };
  // Put data in to global variable (save button will data read from here)
  preparedBinding = bindingDetails;
  console.log(preparedBinding);

});


modalSaveBtn.addEventListener('click', function() {
  window.ipcRender.send('messageToMain', {channel: 'save-binding-details', preparedBinding: preparedBinding});
});




function selectDatabase(target) {
  // Get database options
  let options = modalServerDatabases.querySelectorAll('option');
  // Store user target database index here
  let index = 0;
  // Loop all options
  options.forEach((option, key) => {
    // Remove selected attribute from all options
    option.removeAttribute('selected');
    // Find target database index and set it to index variable
    if (option.value == target) index = key;
  });
  // Select target index
  modalServerDatabases.selectedIndex = index;
}

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
        // Check binding details
        if (thisClient.binding.binded) {
          // Select database
          selectDatabase(thisClient.binding.database);
          // Prepare data
          let data = {selectedDatabase: thisClient.binding.database, machineId: modalMachineId.value.trim()};
          // Send to main
          window.ipcRender.send('compare-databases', data);
        }
      });
    });
  });
}





function updateClient(client) {
  let row = document.querySelector(`tr[data-machineId="${client.machineId}"]`);
  row.querySelector('.clientIp').textContent = client.clientIp;

  let serverConnectionCol = row.querySelector('.server-connection');
  serverConnectionCol.textContent = client.socket.connection ? 'Connected': 'Disconnected';
  serverConnectionCol.classList.add(client.socket.connection ? 'is-success' : 'is-danger');
  serverConnectionCol.classList.remove(client.socket.connection ? 'is-danger' : 'is-success');

  let databaseConnectionCol = row.querySelector('.database-connection');
  databaseConnectionCol.textContent = client.database.connection ? 'Connected': 'Disconnected';
  databaseConnectionCol.classList.add(client.database.connection ? 'is-success' : 'is-danger');
  databaseConnectionCol.classList.remove(client.database.connection ? 'is-danger' : 'is-success');

  loopChecker(client);
}

window.ipcRender.receive('messageFromMain', (data) => {
  console.log(data);
  switch (data.channel) {
    case 'start':
    // Print server info texts
    serverIp.textContent = data.server.socket.serverIp;
    port.textContent = data.server.socket.port;
    database.textContent = data.server.database.connection;
    // Style server info texts
    database.textContent = data.server.database.connection ? 'Connected' : 'Disconnected';
    database.classList.add(data.server.database.connection ? 'is-success' : 'is-danger');
    database.classList.remove(data.server.database.connection ? 'is-danger' : 'is-success');
    // Print clients
    data.server.clients.forEach((client, i) => {
      appendClient(client);
    });
    // Get server databases
    if (data.server.database.connection) {
      // Request server databases
      window.ipcRender.invoke('refresh-databases', false).then((data) => {
        refreshDatabases(data);
      });
    }
    break;
    case 'server-update':
    // Update server info
    database.textContent = data.server.database.connection ? 'Connected' : 'Disconnected';
    database.classList.add(data.server.database.connection ? 'is-success' : 'is-danger');
    database.classList.remove(data.server.database.connection ? 'is-danger' : 'is-success');
    // Update server databases
    window.ipcRender.invoke('refresh-databases', false).then((data) => {
      refreshDatabases(data);
    });
    break;
    case 'compare-databases':
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
        let option = `<option value="${col.Field}" ${col.Key === 'PRI' ? 'selected' : 'disabled'}>${col.Field} | ${col.Type} ${col.Key !== '' ? ' | (PRIMARY)' : '' }</option>`;
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
      </tr>`;

      // Insert elements
      checkTable.insertAdjacentHTML('beforeend', row);

      // Show CREATE TABLE query when clicked on table name
      checkTable.lastChild.querySelector('.show-create-table').addEventListener('click', function() {
        window.ipcRender.send('messageToMain', {channel: 'show-create-table', tableName: table.table, machineId: data.databases.machineId});
      });

    });


    if (preparedBinding.hasOwnProperty('binded') && preparedBinding.binded === true) {
      // Update styling
      modalBindBtn.textContent = 'Unbind';
      modalBindBtn.classList.remove('is-link');
      modalBindBtn.classList.add('is-danger');
      // Enable/Disable buttons
      modalServerDatabases.disabled = true;
      modalRefreshBtn.disabled = true;
      modalCheckBtn.disabled = true;
      modalBindBtn.disabled = false;
      // Show message
      modalDatabaseHelper('Already binded', 'is-success');
    } else {
      if (totalCheckResult) {
        modalDatabaseHelper('Ready to bind', 'is-success');
        modalBindBtn.disabled = false;
      } else {
        modalDatabaseHelper('Server database does not match with client\'s', 'is-danger');
        modalBindBtn.disabled = true;
      }
    }

    break;
    case 'show-create-table':
    // Check if there is any error
    if (data.hasOwnProperty('error')) {
      // Print error if exist
      modalDatabaseHelper(data.error, 'is-danger');
    } else {
      modalShowCreate.value = data.showCreate.response[0]['Create Table'];
    }
    break;
    case 'save-binding-details':
    // Check if there is any error
    if (data.hasOwnProperty('error')) {
      // Print error if exist
      modalDatabaseHelper(data.error, 'is-danger');
    } else {
      // Print success message
      modalDatabaseHelper(data.success, 'is-success');
      loopChecker(data.client);
    }
    break;
    case 'transfer-data':
    setTimeout(function() {
      console.log("Time is out...");
      // loopChecker(data.client);
    }, 3000);
    break;
    // case 'new-client':
    // appendClient(data.client);
    // break;
    // case 'registered-client':
    // updateClient(data.client);
    // break;
    // case 'update-client':
    // updateClient(data.client);
    // break;
    default:
    console.log('Called channel is not exist.');
  }
});



window.ipcRender.receive('new-client', (client) => {
  console.log({channel: 'new-client', client: client});
  appendClient(client);
});

window.ipcRender.receive('registered-client', (client) => {
  console.log({channel: 'registered-client', client: client});
  updateClient(client);
});

window.ipcRender.receive('update-client', (client) => {
  console.log({channel: 'update-client', client: client});
  updateClient(client);
});




function toast(type, message) {

  let body = document.querySelector('body');

  body.querySelectorAll('.notification').forEach((el, i) => {
    el.remove();
  });

  let html = `<div class="notification is-${type === 'success' ? 'success' : 'danger'}">
  <button class="delete"></button>
  <div class="is-flex is-align-items-center">
  <span class="icon">
  <svg class="icon"><use xlink:href="./img/symbol-defs.svg#icon-${type === 'success' ? 'check' : 'cross'}"></use></svg>
  </span>
  <span class="ml-2">${message}</span>
  </div>
  </div>`;

  body.insertAdjacentHTML('beforeend', html);

  let lastChild = body.lastChild;

  lastChild.querySelector('.delete').addEventListener('click', function() {
    lastChild.remove();
  });

  setTimeout(function() {
    lastChild.remove();
  }, 3000);

}
