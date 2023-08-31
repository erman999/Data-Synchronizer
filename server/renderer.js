// Renderer.js
let serverIp = document.querySelector('#serverIp');
let port = document.querySelector('#port');

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
  let table = document.querySelector('.table-clients tbody');
  table.insertAdjacentHTML('beforeend', client);
}

function updateClient(machineId, clientIp, serverConnection, databaseConnection) {
  let row = document.querySelector(`tr[data-machineId="${machineId}"]`);
  console.log(row);
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
    case 'update':
    // Update server info texts
    serverIp.textContent = data.server.socket.serverIp;
    port.textContent = data.server.socket.port;
    // Print clients
    data.server.clients.forEach((item, i) => {
      client(item.machineId, item.clientIp, item.socket.connection, item.database.connection);
    });
    break;
    case 'new-client':
    client(data.client.machineId, data.client.clientIp, data.client.socket.connection, data.client.database.connection);
    break;
    case 'registered-client':
    updateClient(data.client.machineId, data.client.clientIp, data.client.socket.connection, data.client.database.connection);
    break;
    default:

  }
});

setTimeout(() => {
  window.ipcRender.send('messageToMain', 'Renderer ready.');
}, 2000);
