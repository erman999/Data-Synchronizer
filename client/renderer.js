
window.ipcRender.receive('messageFromMain', (message) => {
  console.log(message);
});

setTimeout(() => {
  window.ipcRender.send('messageToMain', 'Renderer ready.');
}, 2000);
