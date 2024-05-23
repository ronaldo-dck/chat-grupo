const net = require('net');
const crypto = require('crypto');

class ChatClient {
    constructor(username) {
        this.client = new net.Socket();
        this.username = username;
        this.client.on('data', (data) => {
            console.log(`Servidor [${this.username}]:`, data.toString().trim());
        });

        this.client.on('close', () => {
            console.log(`Conexão encerrada [${this.username}]`);
        });

        this.client.on('error', (err) => {
            console.error(`Erro [${this.username}]:`, err);
        });
    }

    async connect(host = '127.0.0.1', port = 9999) {
        this.client.connect(port, host, () => {
            console.log(`Conectado ao servidor [${this.username}]`);
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

module.exports = ChatClient;
