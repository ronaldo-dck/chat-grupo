const net = require('net')
const express = require('express')
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

  socket.on('conectar', (nome) => {
    clients[socket.id] = new ChatClient(nome, socket)
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id)
    socketsConected.delete(socket.id)
    clients[socket.id].close()
  })

  socket.on('message', (data) => {
    // console.log(data)
    socket.broadcast.emit('chat-message', data)
  })

  socket.on('feedback', (data) => {
    socket.broadcast.emit('feedback', data)
  })
}


class ChatClient {
  constructor(username, socket) {
    this.client = new net.Socket();
    this.front = new CommandHandler(socket)
    this.username = username;

    this.client.on('data', (data) => {
      const message = data.toString().trim();
      console.log(`Servidor [${this.username}]:`, message);
      
      const [command, ...params] = message.split(' ');
      if (this.front[command]) {
        this.front[command](params);
      } else {
        socket.emit('error', `ERRO Comando desconhecido: ${command}\n`);
      }
    });

    this.client.on('close', () => {
      console.log(`Conexão encerrada [${this.username}]`);
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

  createRoom(roomName, isPrivate = false, password = '') {
    if (isPrivate) {
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      this.sendMessage(`CRIAR_SALA PRIVADA ${roomName} ${passwordHash}`);
    } else {
      this.sendMessage(`CRIAR_SALA PUBLICA ${roomName}`);
    }
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

  leaveRoom(roomName) {
    this.sendMessage(`SAIR_SALA ${roomName}`);
  }

  sendMessage(message) {
    this.client.write(`${message}\n`);
  }

  close() {
    this.client.end();
  }
}

class CommandHandler {
  constructor(socket) {
    this.socket = socket;
  }

  REGISTRO_OK(params) {
    this.socket.emit('connected', `Bem vindo ${this.socket.username}\n`);
  }
}