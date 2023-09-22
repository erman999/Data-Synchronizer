/***** Elements *****/
let machineId = document.querySelector('#machineId');
let serverIp = document.querySelector('#serverIp');
let port = document.querySelector('#port');
let serverConnection = document.querySelector('#server-connection');
let databaseConnection = document.querySelector('#database-connection');
let settings = document.querySelector('#settings');

/***** Settings - Modal *****/
let modal = document.querySelector('#modal');
let modalServerIp = document.querySelector('#modal-server-ip');
let modalServerPort = document.querySelector('#modal-server-port');
let modalMysqlIp = document.querySelector('#modal-mysql-ip');
let modalMysqlUser = document.querySelector('#modal-mysql-user');
let modalMysqlPassword = document.querySelector('#modal-mysql-password');
let modalMysqlDatabase= document.querySelector('#modal-mysql-database');
let modalSaveBtn = document.querySelector('#modal-save-button');


/***** Event Listeners *****/
// Close modal window on various closing activities
document.querySelectorAll('.modal .modal-background, .modal .delete, .modal .cancel').forEach((el, i) => {
  // Add elements to click listener
  el.addEventListener('click', resetModalWindow, false);
});

// Open modal window and load client configurations to modal window
settings.addEventListener('click', function() {
  // Open modal window
  modal.classList.add('is-active');
  // Load client configs
  window.ipcRender.invoke('get-configs', false).then((result) => {
    console.log(result);
    modalServerIp.value = result.configs.serverIp;
    modalServerPort.value = result.configs.port;
    modalMysqlIp.value = result.configs.mysqlIp;
    modalMysqlUser.value = result.configs.mysqlUser;
    modalMysqlPassword.value = result.configs.mysqlPassword;
    modalMysqlDatabase.value = result.configs.mysqlDatabase;
  });
});

// Save user defined configs
modalSaveBtn.addEventListener('click', function() {
  // Prepare client configs
  let configs = {
    serverIp: modalServerIp.value.trim(),
    port: modalServerPort.value.trim(),
    mysqlIp: modalMysqlIp.value.trim(),
    mysqlUser: modalMysqlUser.value.trim(),
    mysqlPassword: modalMysqlPassword.value.trim(),
    mysqlDatabase: modalMysqlDatabase.value.trim(),
  };

  // Save file
  window.ipcRender.invoke('save-configs', configs).then((result) => {
    console.log('save-configs', result);
    toast('success', 'Configs successfully saved. Restart application to connect with new configurations.');
  });
});


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


/***** Functions *****/
// Reset modal window (usually on close activity)
function resetModalWindow() {
  // Close modal
  modal.classList.remove('is-active');
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
  }, 5000);

  return false;
}
