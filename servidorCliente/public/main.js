const socket = io()

let rooms = []
let username
let currentRoom = { nome: null, clientes: [], banidos: [] }
let roomEvents = []

function conectar() {
  const nome = document.getElementById('nomeUser').value;
  socket.emit('conectar', nome)
}

function desconectar() {
  socket.emit('desconectar')
}

let inputConectar = document.getElementById('nomeUser')
inputConectar.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault()
    document.getElementById("loginButton").click()
  }
})

function getAuth() {
  socket.emit('autenticacao', username)
}

function getSalas() {
  console.log('current', currentRoom);
  socket.emit('salas')
}

function criarSala() {
  if (currentRoom.nome == null) {
    const nome_da_sala = prompt('Qual o nome da sala?')
    if (nome_da_sala == null || nome_da_sala == '') return
    let tipo_de_sala = 'PUBLICA'
    let senha = ''
    if (confirm('Sala privada?')) {
      senha = prompt('Senha: ')
      tipo_de_sala = 'PRIVADA'
    }

    currentRoom = { nome: nome_da_sala, clientes: [username], banidos: [] }
    socket.emit('criarSala', { nome_da_sala, tipo_de_sala, senha })
  } else {
    alert('Saia de sua sala atual e e tente novamente')
  }
}

const renderSalasBtns = (sala => {
  const button = document.createElement('button')
  button.className = 'salasButton'
  button.textContent = sala.nome_da_sala
  if (sala.tipo_de_sala == 'PRIVADA') {
    const img = document.createElement('img')
    img.src = './lock.png'
    img.height = '16'
    button.appendChild(img)
    button.onclick = () => { const pswd = prompt('Entrar na sala?', 'Senha'); if (pswd != null) { entrarSala(sala.nome_da_sala, pswd) } }
  } else {
    button.onclick = () => { if (confirm('Entrar na sala?')) { entrarSala(sala.nome_da_sala, '') } }
  }

  document.getElementById('salasList').appendChild(button)
})

const renderClients = (sala => {
  document.getElementById('clientsList').innerHTML = ''
  console.log(sala);
  if (sala.clientes.length == 0) return

  sala.clientes.map(username => {
    const button = document.createElement('button')
    button.className = 'clientsButton'
    button.textContent = username
    button.onclick = () => { if (confirm('Banir usuario?')) { banirUser(username) } }
    document.getElementById('clientsList').appendChild(button)
  })
})

function entrarSala(sala, pswd) {
  if (currentRoom.nome == null) {
    socket.emit('entrarSala', { sala, pswd })
    currentRoom = { nome: sala, clientes: [], banidos: [] }
  } else {
    alert('Saia de sua sala atual e e tente novamente')
  }
}

let input = document.getElementById('chatInput')
input.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault()
    document.getElementById("sendButton").click()
  }
})

function enviarMsg() {
  let mensagem = document.getElementById('chatInput').value
  if (mensagem == null || mensagem == '') return
  document.getElementById('chatInput').value = ''
  roomEvents.push(`${username} >> ${mensagem}`)
  socket.emit('enviarMsg', { 'nome_da_sala': currentRoom.nome, mensagem })
  renderChat()
}

function banirUser(username) {
  if (username == currentRoom.clientes[0]) {
    alert('Não é possível banir o criador da sala')
    return
  }
  socket.emit('banirUser', { 'nome_da_sala': currentRoom.nome, 'usuario': username })
}

function sairSala() {
  if (username == currentRoom.clientes[0]) {
    if (confirm('Realmente deseja sair da sala? (ela será fechada)')) {
      socket.emit('fecharSala', currentRoom.nome)
    }
  }
  socket.emit('sairSala', currentRoom.nome)
}

function fecharSala() {
  if (username == currentRoom.clientes[0]) {
    if (confirm('Realmente deseja fechar a sala?')) {
      socket.emit('fecharSala', currentRoom.nome)
    }
  } else {
    alert('Somente o criador da sala pode fechar a sala')
  }
}

socket.on('error', (data) => {
  console.error(data)
  if (data[0] == `Usuario_banido`) {
    currentRoom = { nome: null, clientes: [], banidos: [] }
  }
  alert(data)
})

socket.on('connected', (data) => {
  document.getElementById('loginButton').style.display = 'none'
  document.getElementById('logoutButton').style.display = 'block'
  document.getElementById('divControl').style.display = 'flex'
  document.getElementById('nomeUser').disabled = true

  const nome = document.createElement('p')
  nome.textContent = `Conectado como ${data}`
  username = data
  document.getElementById('nameWrapper').appendChild(nome)

  // getSalas()
  getAuth()
})

socket.on('close', () => {
  document.getElementById('loginButton').style.display = 'block'
  document.getElementById('logoutButton').style.display = 'none'
  document.getElementById('nomeUser').disabled = false
  document.getElementById('divControl').style.display = 'none'
  document.getElementById('divChat').style.display = 'none'
  document.getElementById('adminPanel').style.display = 'none'
  document.getElementById('nameWrapper').innerHTML = ''
  roomEvents = []
})

socket.on('rooms', (data) => {
  rooms = JSON.parse(data)
  document.getElementById('salasList').innerHTML = ''
  rooms.map(renderSalasBtns)
  console.log(rooms)
})

socket.on('room-created', (data) => {
  getSalas()
  document.getElementById('divChat').style.display = 'flex'
  document.getElementById('sairButton').style.display = 'block'
  document.getElementById('adminPanel').style.display = 'flex'
  roomEvents = ['SALA INGRESSADA']
  renderChat()
  renderClients(currentRoom)
})

socket.on('joined-room', (data) => {
  document.getElementById('divChat').style.display = 'flex'
  document.getElementById('sairButton').style.display = 'block'
  roomEvents = ['SALA INGRESSADA']
  renderChat()
})

socket.on('room-joined', (data) => {
  currentRoom.clientes.push(data)
  roomEvents.push(`${data} ENTROU NA SALA`)
  renderChat()
  renderClients(currentRoom)
})

socket.on('new-message', ({ originUser, fullMessage }) => {
  roomEvents.push(`${originUser} >> ${fullMessage}`)
  renderChat()
})

function renderChat() {
  document.getElementById('messages').innerHTML = ''
  roomEvents.map((log) => {
    let msgP = document.createElement('p')
    msgP.textContent = log
    document.getElementById('messages').appendChild(msgP)
  })
}

socket.on('left-room', (data) => {
  document.getElementById('divChat').style.display = 'none'
  document.getElementById('sairButton').style.display = 'none'
  document.getElementById('adminPanel').style.display = 'none'
  currentRoom = { nome: null, clientes: [], banidos: [] }
})

socket.on('room-left', (data) => {
  currentRoom.clientes = currentRoom.clientes.filter((user) => user != data)
  roomEvents.push(`${data} SAIU DA SALA`)
  renderChat()
  renderClients(currentRoom)
})

socket.on('closed-room', (data) => {
  alert('Sala fechada com sucesso')
  document.getElementById('divChat').style.display = 'none'
  document.getElementById('sairButton').style.display = 'none'
  document.getElementById('adminPanel').style.display = 'none'
  getSalas()
  currentRoom = { nome: null, clientes: [], banidos: [] }
})

socket.on('room-closed', (data) => {
  alert('O administrador fechou a sala ' + data)
  document.getElementById('divChat').style.display = 'none'
  document.getElementById('sairButton').style.display = 'none'
  document.getElementById('adminPanel').style.display = 'none'
  getSalas()
  currentRoom = { nome: null, clientes: [], banidos: [] }
})

socket.on('banned', (data) => {
  currentRoom = { nome: null, clientes: [], banidos: [] }
  alert(`Voce foi banido da sala`)
  document.getElementById('divChat').style.display = 'none'
  document.getElementById('sairButton').style.display = 'none'
  document.getElementById('adminPanel').style.display = 'none'
  getSalas()
})

socket.on('userBanned', () => {
  alert('Usuário banido com sucesso')
})