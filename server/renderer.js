// Renderer.js
let serverIp = document.querySelector('#serverIp');
let port = document.querySelector('#port');
let database = document.querySelector('#database');

let modal = document.querySelector('#modal');
let modalMachineId = document.querySelector('#modal-machineId');
let modalName = document.querySelector('#modal-name');
let modalClientdb = document.querySelector('#modal-clientdb');
let modalTables = document.querySelector('#modal-tables');
let modalServerDatabases = document.querySelector('#modal-server-databases');

let modalRefreshBtn = document.querySelector('#modal-refresh-button');
let modalCheckBtn = document.querySelector('#modal-check-button');
let modalBindBtn = document.querySelector('#modal-bind-button');
let modalDatabaseHelp = document.querySelector('#modal-database-help');
let modalShowCreate = document.querySelector('#modal-show-create');
let modalSaveBtn = document.querySelector('#modal-save-button');


// modalServerDatabases.addEventListener('change', function() {
//   modalBindBtn.disabled = true;
// });

function modalDatabaseHelper(text, color) {
  let colors = ['is-primary', 'is-link', 'is-info', 'is-success', 'is-warning', 'is-danger', 'is-white', 'is-light', 'is-dark', 'is-black'];
  modalDatabaseHelp.classList.remove(...colors);
  modalDatabaseHelp.classList.add(color);
  modalDatabaseHelp.textContent = text;
}

// Close modal window on various closing activities
document.querySelectorAll('.modal .modal-background, .modal .delete, .modal .cancel').forEach((el, i) => {
  el.addEventListener('click', () => {
    modal.classList.remove('is-active');
  });
});

modalRefreshBtn.addEventListener('click', function() {
  window.ipcRender.send('messageToMain', {channel: 'server-databases'});
});

modalCheckBtn.addEventListener('click', function() {
  // Get selected database value
  let selectedDatabase = modalServerDatabases.value;
  let data = {selectedDatabase: selectedDatabase, machineId: modalMachineId.value.trim()};

  if (selectedDatabase == 0) {
    modalDatabaseHelper('Please select a valid database!', 'is-danger')
  } else {
    window.ipcRender.send('messageToMain', {channel: 'check-databases', info: data});
  }

});


modalBindBtn.addEventListener('click', function() {

  let userSelection = [];

  let selectedDatabase = modalServerDatabases.options[modalServerDatabases.selectedIndex].value;

  let selects = modalTables.querySelectorAll('tbody select');
  selects.forEach((select, i) => {
    let selTable = select.dataset.table;
    let selColumn = select.options[select.selectedIndex].value;
    userSelection.push({table: selTable, column: selColumn});
    select.disabled = true;
  });

  let bindingOptions = {
    machineId: modalMachineId.value.trim(),
    binding: {
      database: selectedDatabase,
      tables: userSelection
    }
  };

  console.log(bindingOptions);

  modalBindBtn.textContent = 'Unbind';
  modalBindBtn.classList.add('is-danger');
  modalBindBtn.classList.remove('is-link');

  // Disable/Enable some user functions
  modalServerDatabases.disabled = true;
  modalRefreshBtn.disabled = true;
  modalCheckBtn.disabled = true;
  modalSaveBtn.disabled = false;

});



function appendClient(client) {
  let html = `<tr data-machineId="${client.machineId}">
  <td><span class="name tag is-black">${client.name}</span></td>
  <td><span class="clientIp tag is-black">${client.clientIp}</span></td>
  <td><span class="server-connection tag ${client.socket.connection ? 'is-success' : 'is-danger'}">${client.socket.connection ? 'Connected': 'Disconnected'}</span></td>
  <td><span class="database-connection tag ${client.database.connection ? 'is-success' : 'is-danger'}">${client.database.connection ? 'Connected': 'Disconnected'}</span></td>
  <td>
  <button class="configs button is-warning is-small">
  <span class="icon">
  <svg class="icon"><use xlink:href="./img/symbol-defs.svg#sliders"></use></svg>
  </span>
  </button>
  </td>
  </tr>`;

  let table = document.querySelector('.table-clients tbody');
  table.insertAdjacentHTML('beforeend', html);

  table.lastChild.querySelector('.configs').addEventListener('click', function(e) {
    modal.classList.add('is-active');
    modalMachineId.value = client.machineId;
    modalName.value = client.name;
    modalClientdb.value = client.configs.mysqlDatabase;
    // Refresh databases
    window.ipcRender.send('messageToMain', {channel: 'server-databases'});
    // Clear table
    let checkTable = modalTables.querySelector('tbody');
    while (checkTable.firstChild) {
      checkTable.removeChild(checkTable.lastChild);
    }
    // Clear show create textarea
    modalShowCreate.value = '';
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
      window.ipcRender.send('messageToMain', {channel: 'server-databases'});
    }
    break;
    case 'server-update':
    // Update server info
    database.textContent = data.server.database.connection ? 'Connected' : 'Disconnected';
    database.classList.add(data.server.database.connection ? 'is-success' : 'is-danger');
    database.classList.remove(data.server.database.connection ? 'is-danger' : 'is-success');
    // Update server databases
    window.ipcRender.send('messageToMain', {channel: 'server-databases'});
    break;
    case 'server-databases':

    if (data.hasOwnProperty('error')) {
      modalDatabaseHelper(data.error, 'is-danger');
    }

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

    // Helper message
    if (data.databases.length === 0) {
      modalDatabaseHelper('No database connection!', 'is-danger');
    } else {
      modalDatabaseHelper(`Listing ${data.databases.length} databases`, 'is-black');
    }

    break;
    case 'check-databases':
    // Check if there is any error
    if (data.hasOwnProperty('error')) {
      // Print error if exist
      modalDatabaseHelper(data.error, 'is-danger');
    } else {

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
          let option = `<option value="${col.Field}" ${col.Key === 'PRI' ? 'selected' : ''}>${col.Field} | ${col.Type} ${col.Key !== '' ? ' | (PRIMARY)' : '' }</option>`;
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

        // Show CREATE TABLE query when clicked on table name link
        checkTable.lastChild.querySelector('.show-create-table').addEventListener('click', function() {
          window.ipcRender.send('messageToMain', {channel: 'show-create-table', tableName: table.table, machineId: data.databases.machineId});
        });

      });

      // Show
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
    case 'new-client':
    appendClient(data.client);
    break;
    case 'registered-client':
    updateClient(data.client);
    break;
    case 'update-client':
    updateClient(data.client);
    break;
    default:
    console.log('Called channel is not exist.');
  }
});


// SHOW KEYS FROM table WHERE Key_name = 'PRIMARY'
// SELECT MAX(id) FROM tablename;


// window.ipcRender.invoke('invoker', 'hello').then((result) => {
//   console.log(result);
// });
