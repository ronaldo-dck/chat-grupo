const socket = io()

function conectar() {
  const nome = document.getElementById('nomeUser').value;
  socket.emit('conectar', nome)
}

socket.on('connected', (data) => {
  alert("Conexão bem sucecida")
  document.getElementById('loginButton').ariaDisabled = true
  document.getElementById('divControl').style.display = 'flex'
  console.log(data)
})

socket.on('error', (data) => { 
  console.error(data)
})