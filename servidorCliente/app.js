const net = require('net')
const express = require('express')
const crypto = require('crypto');
const path = require('path')
const app = express()
const PORT = process.env.PORT || 9990
const server = app.listen(PORT, () => console.log(`Client server on port ${PORT}`))

const io = require('socket.io')(server)

app.use(express.static(path.join(__dirname, 'public')))

let socketsConected = new Set()
let clients = {}

io.on('connection', onConnected)

function onConnected(socket) {
  console.log('Socket connected', socket.id)
  socketsConected.add(socket.id)

  socket.emit('close')

  socket.on('conectar', (nome) => {
    clients[socket.id] = new ChatClient(nome, socket)
  })

  socket.on('desconectar', (nome) => {
    clients[socket.id].close()
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id)
    socketsConected.delete(socket.id)
    if (clients[socket.id])
      clients[socket.id].close()
  })
  
  socket.on('autenticacao', (username) => {
    clients[socket.id].authenticate(username)
  })

  socket.on('salas', () => {
    clients[socket.id].listRooms()
  })

  socket.on('criarSala', (sala) => {
    clients[socket.id].createRoom(sala)
  })

  socket.on('entrarSala', ({ sala, pswd }) => {
    clients[socket.id].joinRoom(sala, pswd)
  })

  socket.on('enviarMsg', ({ nome_da_sala, mensagem }) => {
    console.log(nome_da_sala, mensagem);
    clients[socket.id].sendMessageToRoom(nome_da_sala, mensagem)
  })

  socket.on('banirUser', ({ nome_da_sala, usuario }) => {
    clients[socket.id].banUser(nome_da_sala, usuario)
  })

  socket.on('sairSala', (nome_da_sala) => {
    clients[socket.id].leaveRoom(nome_da_sala)
  })

  socket.on('fecharSala', (nome_da_sala) => {
    clients[socket.id].closeRoom(nome_da_sala)
  })

  socket.on('message', (data) => {
    console.log('message')
    socket.broadcast.emit('chat-message', data)
  })

  socket.on('feedback', (data) => {
    console.log('feedback')
    socket.broadcast.emit('feedback', data)
  })
}


class ChatClient {
  constructor(username, socket) {
    this.client = new net.Socket();
    this.front = new CommandHandler(socket, username)
    this.username = username;
    this.secureKey = null

    this.client.on('data', (data) => {
      const message = data.toString().trim();

      const [command, ...params] = message.split(' ');
      if (this.front[command]) {
        this.front[command](params);
      } else {
        socket.emit('error', `ERRO Comando desconhecido: ${command}\n`);
      }
    });

    this.client.on('close', () => {
      console.log(`Conexão encerrada [${this.username}]`);
      socket.emit('close');
    });

    this.client.on('error', (err) => {
      console.error(`Erro [${this.username}]:`, err);
    });

    this.connect()
  }

  async connect(host = '127.0.0.1', port = 9999) {
    this.client.connect(port, host, () => {
      // console.log(`Conectado ao servidor [${this.username}]`);
      this.register(this.username);
    });
  }

  register(username) {
    this.sendMessage(`REGISTRO ${username}`);
  }

  createRoom(sala) {
    if (sala.tipo_de_sala == 'PRIVADA') {
      const passwordHash = crypto.createHash('sha256').update(sala.senha).digest('hex');
      this.sendMessage(`CRIAR_SALA PRIVADA ${sala.nome_da_sala} ${passwordHash}`);
    } else {
      this.sendMessage(`CRIAR_SALA PUBLICA ${sala.nome_da_sala}`);
    }
  }

  authenticate(username) {
    this.sendMessage(`AUTENTICACAO ${username}`);
  }

  listRooms() {
    this.sendMessage('LISTAR_SALAS');
  }

  joinRoom(roomName, password = '') {
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    this.sendMessage(`ENTRAR_SALA ${roomName} ${passwordHash}`);
  }

  sendMessageToRoom(roomName, message) {
    this.sendMessage(`ENVIAR_MENSAGEM ${roomName} ${message}`);
  }

  banUser(roomName, username) {
    this.sendMessage(`BANIR_USUARIO ${roomName} ${username}`);
  }

  leaveRoom(roomName) {
    this.sendMessage(`SAIR_SALA ${roomName}`);
  }

  closeRoom(roomName) {
    this.sendMessage(`FECHAR_SALA ${roomName}`);
  }

  sendMessage(message) {
    this.client.write(`${message}\n`);
  }

  close() {
    this.client.end();
  }
}

class CommandHandler {
  constructor(socket, username) {
    this.socket = socket;
    this.username = username;
  }

  REGISTRO_OK(params) {
    this.socket.emit('connected', this.username);
  }

  CHAVE_PUBLICA(params) {
    // this.socket.emit('public-key', params);
    clients[this.socket.id].secureKey = params[0]
  }

  SALAS(params) {
    this.socket.emit('rooms', params);
  }

  CRIAR_SALA_OK(params) {
    this.socket.emit('room-created', params);
  }

  ENTRAR_SALA_OK(params) {
    this.socket.emit('joined-room', params);
  }

  ENTROU(params) {
    const [room, username] = params;
    this.socket.emit('room-joined', username)
  }

  MENSAGEM(params) { 
    const [originUser, ...messageParts] = params;
    const fullMessage = messageParts.join(' ');
    this.socket.emit('new-message', {originUser, fullMessage})
  }

  SAIR_SALA_OK() {
    this.socket.emit('left-room');
  }

  FECHAR_SALA_OK() {
    this.socket.emit('closed-room');
  }

  SAIU(params) {
    const [room, username] = params;
    this.socket.emit('room-left', username);
  }

  SALA_FECHADA(params) {
    const [room] = params;
    this.socket.emit('room-closed', room);
  }

  BANIDO_DA_SALA(params) {
    const [room] = params;
    this.socket.emit('banned', {room});
  }

  BANIR_USUARIO_OK() {
    this.socket.emit('userBanned');
  }

  ERRO(params) {
    this.socket.emit('error', params);
  }
}