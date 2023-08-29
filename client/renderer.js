// Renderer.js
let machineId = document.querySelector('#machineId');
let serverIp = document.querySelector('#serverIp');
let port = document.querySelector('#port');
let serverConnection = document.querySelector('#server-connection');
let databaseConnection = document.querySelector('#database-connection');


window.ipcRender.receive('messageFromMain', (data) => {
  console.log(data);
  switch (data.channel) {
    case 'update':
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
    break;
    default:

  }
});

setTimeout(() => {
  window.ipcRender.send('messageToMain', 'Renderer ready.');
}, 2000);
