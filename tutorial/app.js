const express = require('express')
const path = require('path')
const crypto = require('crypto');

const app = express()
const PORT = process.env.PORT || 4000
const server = app.listen(PORT, () => console.log(`💬 server on port ${PORT}`))

const io = require('socket.io')(server)

app.use(express.static(path.join(__dirname, 'public')))

const clients = {};
const rooms = {};

io.on('connection', onConnected)

function onConnected(socket) {
  let username = null

  const commandHandler = new CommandHandler(socket, username)
  console.log('Socket connected', socket.id)
  socket.emit('data', 'Bem vindo\n')

  socket.on('data', (data) => {
    const message = data.toString().trim();
    const [command, ...params] = message.split(' ');

    if (commandHandler[command]) {
      commandHandler[command](params);
    } else {
      socket.write(`ERRO Comando desconhecido: ${command}\n`);
    }
  });

  socket.on('end', () => {
    if (username) {
      delete clients[username];
      for (const roomName in rooms) {
        const room = rooms[roomName];
        if (room.clients.includes(username)) {
          room.clients = room.clients.filter(clientName => clientName !== username);
          room.clients.forEach(clientName => {
            clients[clientName].write(`SAIU ${roomName} ${username}\n`);
          });
        }
      }
    }
  });
}

class CommandHandler {
  constructor(socket, username) {
    this.socket = socket;
    this.username = username;
  }

  REGISTRO(params) {
    const username = params[0];
    if (clients[username]) {
      this.socket.write('ERRO Usuario ja existe\n');
    } else {
      this.username = username;
      clients[username] = this.socket;
      this.socket.write('REGISTRO_OK\n');
    }
  }

  CRIAR_SALA(params) {
    const [roomType, roomName, roomPassword] = params;
    if (rooms[roomName]) {
      this.socket.write('ERRO Sala ja existe\n');
    } else {
      rooms[roomName] = {
        admin: this.username,
        clients: [this.username],
        password: roomType === 'PRIVADA' ? crypto.createHash('sha256').update(roomPassword).digest('hex') : null
      };
      this.socket.write('CRIAR_SALA_OK\n');
    }
  }

  LISTAR_SALAS() {
    const roomList = Object.keys(rooms).join(' ');
    this.socket.write(`SALAS ${roomList}\n`);
  }

  ENTRAR_SALA(params) {
    const [roomToJoin, roomPasswordToJoin] = params;
    const room = rooms[roomToJoin];
    if (room) {
      if (room.password && room.password !== crypto.createHash('sha256').update(roomPasswordToJoin).digest('hex')) {
        this.socket.write('ERRO Senha incorreta\n');
      } else {
        room.clients.push(this.username);
        this.socket.write(`ENTRAR_SALA_OK ${room.clients.join(' ')}\n`);
        room.clients.forEach(clientName => {
          if (clientName !== this.username) {
            clients[clientName].write(`ENTROU ${roomToJoin} ${this.username}\n`);
          }
        });
      }
    } else {
      this.socket.write('ERRO Sala nao existe\n');
    }
  }

  ENVIAR_MENSAGEM(params) {
    const [targetRoom, ...messageParts] = params;
    const fullMessage = messageParts.join(' ');
    if (rooms[targetRoom]) {
      rooms[targetRoom].clients.forEach(clientName => {
        if (clientName !== this.username) {
          clients[clientName].write(`MENSAGEM ${targetRoom} ${this.username} ${fullMessage}\n`);
        }
      });
    } else {
      this.socket.write('ERRO Sala nao existe\n');
    }
  }

  SAIR_SALA(params) {
    const roomToLeave = params[0];
    if (rooms[roomToLeave]) {
      rooms[roomToLeave].clients = rooms[roomToLeave].clients.filter(clientName => clientName !== this.username);
      this.socket.write('SAIR_SALA_OK\n');
      rooms[roomToLeave].clients.forEach(clientName => {
        clients[clientName].write(`SAIU ${roomToLeave} ${this.username}\n`);
      });
    } else {
      this.socket.write('ERRO Sala nao existe\n');
    }
  }
}
