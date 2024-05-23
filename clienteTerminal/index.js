import { Socket } from 'net';
import { createHash } from 'crypto';
import express from 'express'

class ChatClient {
    constructor(username) {
        this.client = express();
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
            const passwordHash = createHash('sha256').update(password).digest('hex');
            this.sendMessage(`CRIAR_SALA PRIVADA ${roomName} ${passwordHash}`);
        } else {
            this.sendMessage(`CRIAR_SALA PUBLICA ${roomName}`);
        }
    }

    listRooms() {
        this.sendMessage('LISTAR_SALAS');
    }

    joinRoom(roomName, password = '') {
        const passwordHash = createHash('sha256').update(password).digest('hex');
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

let client = new ChatClient('usuario1');
client.connect()

function conectar() {
    const nome = document.getElementById('nomeUser').value;
    client = new ChatClient(nome);
    client.connect()
    // window.fetch(`http://localhost:8080/conectar?nome=${nome}`)
    //     .then(res => res.text())
    //     .then(data => console.log(data))
    //     .catch(err => console.error(err));
}

function criarSala() {
    const nome = document.getElementById('nomeSala').value;
    client.createRoom(nome)
    // window.fetch(`http://localhost:8080/criarSala?nome=${nome}`)
    //     .then(res => res.text())
    //     .then(data => console.log(data))
    //     .catch(err => console.error(err));
}
function listarSalas() {
    // window.fetch('http://localhost:8080/listarSalas')
    //     .then(res => res.json())
    //     .then(data => console.log(data))
    //     .catch(err => console.error(err));
}
function entrarSala() {
    const nome = document.getElementById('nomeSala').value;
    // window.fetch(`http://localhost:8080/entrarSala?nome=${nome}`)
    //     .then(res => res.text())
    //     .then(data => console.log(data))
    //     .catch(err => console.error(err));
}