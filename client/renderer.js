
window.ipcRender.receive('messageFromMain', (message) => {
  console.log(message);
});

setTimeout(() => {
  window.ipcRender.send('messageToMain', 'Hello from renderer !!!');
}, 2000);
