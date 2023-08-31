// Renderer.js
let serverIp = document.querySelector('#serverIp');
let port = document.querySelector('#port');
let database = document.querySelector('#database');
let modal = document.querySelector('#configs-modal');
let clientMachineId = document.querySelector('#client-machineId');



// Open modal window
// document.body.addEventListener('click', (event) => {
//   console.log(event.currentTarget)
//   if (event.target.classList.contains('configs')) {
//     modal.classList.add('is-active');
//   }
// });

// Close modal window on various closing activities
document.querySelectorAll('.modal .modal-background, .modal .delete, .modal .cancel').forEach((el, i) => {
  el.addEventListener('click', () => {
    modal.classList.remove('is-active');
  });
});

function client(machineId, clientIp, serverConnection, databaseConnection) {
  let client = `<tr data-machineId="${machineId}">
  <td><span class="machineId tag is-black">${machineId}</span></td>
  <td><span class="clientIp tag is-black">${clientIp}</span></td>
  <td><span class="server-connection tag ${serverConnection ? 'is-success' : 'is-danger'}">${serverConnection ? 'Connected': 'Disconnected'}</span></td>
  <td><span class="database-connection tag ${databaseConnection ? 'is-success' : 'is-danger'}">${databaseConnection ? 'Connected': 'Disconnected'}</span></td>
  <td>
  <button class="configs button is-warning is-small">
  <span class="icon">
  <svg class="icon"><use xlink:href="./img/symbol-defs.svg#sliders"></use></svg>
  </span>
  </button>
  </td>
  </tr>`;
  // Get table body
  let table = document.querySelector('.table-clients tbody');
  // Insert html
  table.insertAdjacentHTML('beforeend', client);
  // Add listener to Configs button
  table.lastChild.querySelector('.configs').addEventListener('click', function(e) {
    // Open modal on click
    modal.classList.add('is-active');
    clientMachineId.value = machineId;
  });
}

function updateClient(machineId, clientIp, serverConnection, databaseConnection) {
  let row = document.querySelector(`tr[data-machineId="${machineId}"]`);
  row.querySelector('.clientIp').textContent = clientIp;

  let serverConnectionCol = row.querySelector('.server-connection');
  serverConnectionCol.textContent = serverConnection ? 'Connected': 'Disconnected';
  serverConnectionCol.classList.add(serverConnection ? 'is-success' : 'is-danger');
  serverConnectionCol.classList.remove(serverConnection ? 'is-danger' : 'is-success');

  let databaseConnectionCol = row.querySelector('.database-connection');
  databaseConnectionCol.textContent = databaseConnection ? 'Connected': 'Disconnected';
  databaseConnectionCol.classList.add(databaseConnection ? 'is-success' : 'is-danger');
  databaseConnectionCol.classList.remove(databaseConnection ? 'is-danger' : 'is-success');

  // row.querySelector('.configs').textContent = '';
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
    data.server.clients.forEach((item, i) => {
      client(item.machineId, item.clientIp, item.socket.connection, item.database.connection);
    });
    break;
    case 'update':
    // Update
    database.textContent = data.server.database.connection ? 'Connected' : 'Disconnected';
    database.classList.add(data.server.database.connection ? 'is-success' : 'is-danger');
    database.classList.remove(data.server.database.connection ? 'is-danger' : 'is-success');
    break;
    case 'new-client':
    client(data.client.machineId, data.client.clientIp, data.client.socket.connection, data.client.database.connection);
    break;
    case 'registered-client':
    updateClient(data.client.machineId, data.client.clientIp, data.client.socket.connection, data.client.database.connection);
    break;
    case 'update-client':
    updateClient(data.client.machineId, data.client.clientIp, data.client.socket.connection, data.client.database.connection);
    break;
    default:
    console.log('Called channel is not exist.');
  }
});

setTimeout(() => {
  window.ipcRender.send('messageToMain', 'Renderer ready.');
}, 2000);


// Alternative way to obtaion row machineId
// document.addEventListener("click", function(e){
//   const target = e.target.closest(".configs");
//   if (target) {
//     const machineId = target.parentElement.parentElement.dataset.machineid;
//     console.log(machineId);
//   }
// });
