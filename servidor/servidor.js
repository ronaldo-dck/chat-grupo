const net = require('net');
const crypto = require('crypto');

const clients = {};
const rooms = {};

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024,
    publicKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
    }
});




class CommandHandler {
    constructor(socket) {
        this.socket = socket;
        this.username = null;
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

    AUTENTICACAO(params) {



        this.socket.write(`CHAVE_PUBLICA ${''}`)
    }

    CRIAR_SALA(params) {
        const [roomType, roomName, roomPassword] = params;
        if (rooms[roomName]) {
            this.socket.write('ERRO Sala_ja_existe\n');
        } else {
            rooms[roomName] = {
                admin: this.username,
                clients: [this.username],
                banidos: ['teste'],
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
                if (room.banidos.includes(this.username)) {
                    this.socket.write('ERRO Usuario_banido\n');
                    return;
                }
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
                    clients[clientName].write(`MENSAGEM ${this.username} ${fullMessage}\n`);
                }
            });
        } else {
            this.socket.write('ERRO Sala nao existe\n');
        }
    }

    BANIR_USUARIO(params) {
        const [targetRoom, targetUser] = params;
        if (rooms[targetRoom] && rooms[targetRoom].clients.includes(targetUser)) {
            clients[targetUser].write(`BANIDO_DA_SALA ${targetRoom}\n`);
            rooms[targetRoom].clients = rooms[targetRoom].clients.filter(clientName => clientName !== targetUser);
            rooms[targetRoom].banidos.push(targetUser);
            rooms[targetRoom].clients.forEach(clientName => {
                clients[clientName].write(`SAIU ${targetRoom} ${targetUser}\n`);
            });
            setTimeout(() => {
                this.socket.write(`BANIR_USUARIO_OK\n`);
            }, 500);
        } else {
            this.socket.write('ERRO Sala ou usuario nao existe\n');
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

    FECHAR_SALA(params) {
        const roomToClose = params[0];
        if (rooms[roomToClose]) {
            rooms[roomToClose].clients = rooms[roomToClose].clients.filter(clientName => clientName !== this.username);
            rooms[roomToClose].clients.forEach(clientName => {
                clients[clientName].write(`SALA_FECHADA ${roomToClose}\n`);
            });
            delete rooms[roomToClose];
            this.socket.write('FECHAR_SALA_OK\n');
        } else {
            this.socket.write('ERRO Sala nao existe\n');
        }
    }
}

const server = net.createServer((socket) => {
    const commandHandler = new CommandHandler(socket);

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
        console.warn(`Erro:`, commandHandler.username, err.code);

        if (err.code === 'ECONNRESET') {
            socket.end()
        }
    })

    socket.on('end', () => {
        if (commandHandler.username) {
            delete clients[commandHandler.username];
            for (const roomName in rooms) {
                const room = rooms[roomName];
                if (room.clients.includes(commandHandler.username)) {
                    if (room.admin === commandHandler.username) {
                        commandHandler.FECHAR_SALA([roomName]);
                    }
                    room.clients = room.clients.filter(clientName => clientName !== commandHandler.username);
                    room.clients.forEach(clientName => {
                        clients[clientName].write(`SAIU ${roomName} ${commandHandler.username}\n`);
                    });
                }
            }
        }
    });
});

server.listen(9999, () => {
    console.log('Servidor iniciado na porta 9999');
});
