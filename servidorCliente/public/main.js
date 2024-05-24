const socket = io()

let rooms = []

function conectar() {
  const nome = document.getElementById('nomeUser').value;
  socket.emit('conectar', nome)
}

function getSalas() {
  socket.emit('salas')
}

function criarSala() {
  const nome_da_sala = prompt('Qual o nome da sala?')
  let tipo_de_sala = 'PUBLICA'
  let senha = ''
  if (confirm('Sala privada?')) {
    senha = prompt('Senha: ')
    tipo_de_sala = 'PRIVADA'
  }

  socket.emit('criarSala', { nome_da_sala, tipo_de_sala, senha })
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

function entrarSala(sala, pswd) {
  socket.emit('entrarSala', { sala, pswd })
}

socket.on('error', (data) => {
  console.error(data)
  alert(data)
})

socket.on('connected', (data) => {
  document.getElementById('loginButton').disabled = true
  document.getElementById('divControl').style.display = 'flex'
  const nome = document.createElement('p')
  nome.textContent = `Conectado como ${data}`
  document.getElementById('nameWrapper').appendChild(nome)
})

socket.on('close', () => {
  document.getElementById('loginButton').disabled = false
  document.getElementById('divControl').style.display = 'none'
  document.getElementById('nameWrapper').innerHTML = ''
})

socket.on('rooms', (data) => {
  rooms = JSON.parse(data)
  document.getElementById('salasList').innerHTML = ''
  rooms.map(renderSalasBtns)
  console.log(rooms)
})

socket.on('room-created', (data) => {
  getSalas()
})

socket.on('room-joined', (data) => {
  document.getElementById('divChat').style.display = 'flex'
})