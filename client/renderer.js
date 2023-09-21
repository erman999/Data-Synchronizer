/***** Elements *****/
let machineId = document.querySelector('#machineId');
let serverIp = document.querySelector('#serverIp');
let port = document.querySelector('#port');
let serverConnection = document.querySelector('#server-connection');
let databaseConnection = document.querySelector('#database-connection');

/***** IPC Listeners *****/
window.ipcRender.receive('update', (data) => {
  console.log(data);
  // Update texts
  machineId.textContent = data.client.machineId;
  serverIp.textContent = data.client.configs.serverIp;
  port.textContent = data.client.configs.port;
  serverConnection.textContent = data.client.socket.connection ? 'Connected' : 'Disconnected';
  databaseConnection.textContent = data.client.database.connection ? 'Connected' : 'Disconnected';
  // Update styles
  serverConnection.classList.remove('is-black', 'is-success', 'is-danger');
  databaseConnection.classList.remove('is-black', 'is-success', 'is-danger');
  data.client.socket.connection ? serverConnection.classList.add('is-success') : serverConnection.classList.add('is-danger');
  data.client.database.connection ? databaseConnection.classList.add('is-success') : databaseConnection.classList.add('is-danger');
});
