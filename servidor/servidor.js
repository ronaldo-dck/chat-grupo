const net = require('net');
const crypto = require('crypto');

const clients = {};
const rooms = {};

class CommandHandler {
    constructor(socket, username) {
        this.socket = socket;
        this.username = username;
    }

    REGISTRO(params) {
        const username = params[0];
        if (clients[username]) {
            this.socket.write('ERRO Usuario_ja_existe\n');
        } else {
            this.username = username;
            clients[username] = this.socket;
            this.socket.write('REGISTRO_OK\n');
        }
    }

    CRIAR_SALA(params) {
        const [roomType, roomName, roomPassword] = params;
        if (rooms[roomName]) {
            this.socket.write('ERRO Sala_ja_existe\n');
        } else {
            rooms[roomName] = {
                admin: this.username,
                clients: [this.username],
                nome_da_sala: roomName,
                tipo_de_sala: roomType,
                senha: roomType === 'PRIVADA' ? crypto.createHash('sha256').update(roomPassword).digest('hex') : null
            };
            this.socket.write('CRIAR_SALA_OK\n');
        }
    }

    LISTAR_SALAS() {
        let roomList = []
        Object.keys(rooms).forEach(roomName => {
            roomList.push(rooms[roomName]);
        });
        this.socket.write(`SALAS ${JSON.stringify(roomList)}\n`);
    }

    ENTRAR_SALA(params) {
        const [roomToJoin, roomPasswordToJoin] = params;
        const room = rooms[roomToJoin];
        if (room) {
            if (room.senha && room.senha !== crypto.createHash('sha256').update(roomPasswordToJoin).digest('hex')) {
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

const server = net.createServer((socket) => {
    let username = null;
    const commandHandler = new CommandHandler(socket, username);

    socket.on('data', (data) => {
        const message = data.toString().trim();
        const [command, ...params] = message.split(' ');

        if (commandHandler[command]) {
            console.log('comando', command)
            commandHandler[command](params);
        } else {
            socket.write(`ERRO Comando desconhecido D: : ${command}\n`);
        }
    });

    socket.on('error', (err) => {
        console.warn(`Erro:`, err);
    })

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
});

server.listen(9999, () => {
    console.log('Servidor iniciado na porta 9999');
});
