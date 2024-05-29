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
        this.symetricKey = null;
        this.iv = crypto.randomBytes(16);
    }

    REGISTRO(params) {
        const username = params[0];
        if (clients[username]) {
            this.handshakeMessage('ERRO Usuario_ja_existe\n');
        } else {
            this.username = username;
            clients[username] = this;
            this.handshakeMessage('REGISTRO_OK\n');
        }
    }

    AUTENTICACAO() {
        this.handshakeMessage(`CHAVE_PUBLICA ${publicKey}\n`)
    }

    CHAVE_SIMETRICA(params) {
        const data = Buffer.from(params[0], "base64");
        this.symetricKey = crypto.privateDecrypt(privateKey, data);
    }

    CRIAR_SALA(params) {
        const [roomType, roomName, roomPassword] = params;
        if (rooms[roomName]) {
            this.sendMessage('ERRO Sala_ja_existe\n');
        } else {
            rooms[roomName] = {
                admin: this.username,
                clients: [this.username],
                banidos: ['teste'],
                nome_da_sala: roomName,
                tipo_de_sala: roomType,
                senha: roomType === 'PRIVADA' ? crypto.createHash('sha256').update(roomPassword).digest('hex') : null
            };
            this.sendMessage('CRIAR_SALA_OK\n');
        }
    }

    LISTAR_SALAS() {
        let roomList = []
        Object.keys(rooms).forEach(roomName => {
            roomList.push(rooms[roomName]);
        });
        this.sendMessage(`SALAS ${JSON.stringify(roomList)}\n`);
    }

    ENTRAR_SALA(params) {
        const [roomToJoin, roomPasswordToJoin] = params;
        const room = rooms[roomToJoin];
        if (room) {
            if (room.senha && room.senha !== crypto.createHash('sha256').update(roomPasswordToJoin).digest('hex')) {
                this.sendMessage('ERRO Senha incorreta\n');
            } else {
                if (room.banidos.includes(this.username)) {
                    this.sendMessage('ERRO Usuario_banido\n');
                    return;
                }
                room.clients.push(this.username);
                this.sendMessage(`ENTRAR_SALA_OK ${room.clients.join(' ')}\n`);
                room.clients.forEach(clientName => {
                    if (clientName !== this.username) {
                        this.sendMessage(`ENTROU ${roomToJoin} ${this.username}\n`, clients[clientName]);
                    }
                });
            }
        } else {
            this.sendMessage('ERRO Sala nao existe\n');
        }
    }

    ENVIAR_MENSAGEM(params) {
        const [targetRoom, ...messageParts] = params;
        const fullMessage = messageParts.join(' ');
        if (rooms[targetRoom]) {
            rooms[targetRoom].clients.forEach(clientName => {
                if (clientName !== this.username) {
                    this.sendMessage(`MENSAGEM ${this.username} ${fullMessage}\n`, clients[clientName]);
                }
            });
        } else {
            this.sendMessage('ERRO Sala nao existe\n');
        }
    }

    BANIR_USUARIO(params) {
        const [targetRoom, targetUser] = params;
        if (rooms[targetRoom] && rooms[targetRoom].clients.includes(targetUser)) {
            this.sendMessage(`BANIDO_DA_SALA ${targetRoom}\n`, clients[targetUser]);
            rooms[targetRoom].clients = rooms[targetRoom].clients.filter(clientName => clientName !== targetUser);
            rooms[targetRoom].banidos.push(targetUser);
            rooms[targetRoom].clients.forEach(clientName => {
                this.sendMessage(`SAIU ${targetRoom} ${targetUser}\n`, clients[clientName]);
            });
            setTimeout(() => {
                this.sendMessage(`BANIR_USUARIO_OK\n`);
            }, 500);
        } else {
            this.sendMessage('ERRO Sala ou usuario nao existe\n');
        }
    }

    SAIR_SALA(params) {
        const roomToLeave = params[0];
        if (rooms[roomToLeave]) {
            rooms[roomToLeave].clients = rooms[roomToLeave].clients.filter(clientName => clientName !== this.username);
            this.sendMessage('SAIR_SALA_OK\n');
            rooms[roomToLeave].clients.forEach(clientName => {
                this.sendMessage(`SAIU ${roomToLeave} ${this.username}\n`, clients[clientName]);
            });
        } else {
            this.sendMessage('ERRO Sala nao existe\n');
        }
    }

    FECHAR_SALA(params) {
        const roomToClose = params[0];
        if (rooms[roomToClose]) {
            rooms[roomToClose].clients = rooms[roomToClose].clients.filter(clientName => clientName !== this.username);
            rooms[roomToClose].clients.forEach(clientName => {
                this.sendMessage(`SALA_FECHADA ${roomToClose}\n`, clients[clientName]);
            });
            delete rooms[roomToClose];
            this.sendMessage('FECHAR_SALA_OK\n');
        } else {
            this.sendMessage('ERRO Sala nao existe\n');
        }
    }

    handshakeMessage(message) {
        const base64EncodedMessage = Buffer.from(message, 'utf-8').toString('base64');
        this.socket.write(base64EncodedMessage);
    }

    sendMessage(message, target = this) {
        const encryptedMessage = target.encryptAES(message);
        const base64EncodedMessage = Buffer.from(encryptedMessage, 'utf-8').toString('base64');
        target.socket.write(base64EncodedMessage);
    }



    encryptAES(message) {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.symetricKey, this.iv);
        let encrypted = cipher.update(message, 'utf-8', 'hex');
        encrypted += cipher.final('hex');
        // Concatenar IV com a mensagem criptografada para usá-lo na descriptografia
        return this.iv.toString('hex') + ':' + encrypted;
    }

    decryptAES(encryptedMessage) {
        const parts = encryptedMessage.split(':');
        const iv = Buffer.from(parts.shift(), 'hex')
        const encryptedText = parts.join(':');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.symetricKey, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
        decrypted += decipher.final('utf-8');
        return decrypted;
    }
}

const server = net.createServer((socket) => {
    const commandHandler = new CommandHandler(socket);

    socket.on('data', (data) => {
        const tmp = Buffer.from(data, 'base64').toString('utf-8');
        try {
            const decryptedMessage = Buffer.from(tmp, 'base64').toString('utf-8');
            const message = decryptedMessage.toString().trim();
            const [command, ...params] = message.split(' ');
            
            commandHandler[command](params);
            console.log('comando', command)
        } catch (err) { 
            const decryptedHex = Buffer.from(tmp, 'base64').toString('utf-8')
            console.log(decryptedHex)
            const message = commandHandler.decryptAES(decryptedHex);
            const [command, ...params] = message.toString().trim().split(' ');
    
            console.log('comandoAES', command)
            commandHandler[command](params);
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
                    commandHandler.SAIR_SALA([roomName]);
                }
            }
        }
    });
});

server.listen(9999, () => {
    console.log('Servidor iniciado na porta 9999');
});
