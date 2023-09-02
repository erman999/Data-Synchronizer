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

    // if (result.hasOwnProperty('error')) {
    //   modalDatabaseHelper(result.error, 'is-danger');
    // }

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
