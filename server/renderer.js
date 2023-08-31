// Renderer.js
let serverIp = document.querySelector('#serverIp');
let port = document.querySelector('#port');
let database = document.querySelector('#database');

let modal = document.querySelector('#modal');
let modalMachineId = document.querySelector('#modal-machineId');
let modalName = document.querySelector('#modal-name');
let modalClientdb = document.querySelector('#modal-clientdb');
let modalTargetdb = document.querySelector('#modal-targetdb');
let modalTables = document.querySelector('#modal-tables');

// Close modal window on various closing activities
document.querySelectorAll('.modal .modal-background, .modal .delete, .modal .cancel').forEach((el, i) => {
  el.addEventListener('click', () => {
    modal.classList.remove('is-active');
  });
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
    break;
    case 'server-update':
    // Update server info
    database.textContent = data.server.database.connection ? 'Connected' : 'Disconnected';
    database.classList.add(data.server.database.connection ? 'is-success' : 'is-danger');
    database.classList.remove(data.server.database.connection ? 'is-danger' : 'is-success');
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





// 
// SHOW KEYS FROM table WHERE Key_name = 'PRIMARY'
// SELECT MAX(id) FROM tablename;


let infox = {
  tables: [
    {name: 'ateqtest', primary: 'ateqTestId'}
  ]
}
