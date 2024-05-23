const ChatClient = require('./cliente');
const prompt = require('prompt-sync')();
const readline = require('readline');
const cmd = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let username = prompt('Insira seu nome de usuário: ')
const client = new ChatClient(username);
client.connect();

function menu() {
    console.log('0 - Fechar')
    console.log('1 - Criar uma sala')
    console.log('2 - Listar as salas')
    console.log('3 - Entrar numa sala')
    return prompt('>> ')
}

while (true) {
    switch (menu()) {
        case '0':
            client.close()
            process.exit()
        case '1':
            let nome = prompt('Insira o nome da sala')
            let privado = prompt('Privado? (s/n)') === 's' ? true : false
            let senha = privado ? prompt('Insira a senha') : ''

            client.createRoom(nome, privado, senha)
            break
        case '2':
            client.listRooms()
            break
        case '3':
            client.joinRoom()
            break
        default:
            console.log('Opcão inválida')
    }
}


// setTimeout(() => client1.createRoom('sala1', true, '12345'), 1000);
// setTimeout(() => client1.listRooms(), 2000);
// setTimeout(() => client1.joinRoom('sala1', '12345'), 3000);
// setTimeout(() => client1.sendMessageToRoom('sala1', 'Olá, pessoal! Eu sou o usuário 1.'), 4000);

// // Cliente 2
// const client2 = new ChatClient('usuario2');
// client2.connect();

// setTimeout(() => client2.listRooms(), 2000);
// setTimeout(() => client2.joinRoom('sala1', '12345'), 5000);
// setTimeout(() => client2.sendMessageToRoom('sala1', 'Olá, pessoal! Eu sou o usuário 2.'), 6000);

// // Saída e encerramento
// setTimeout(() => client1.leaveRoom('sala1'), 7000);
// setTimeout(() => client2.leaveRoom('sala1'), 8000);
// setTimeout(() => {
//     client1.close();
//     client2.close();
// }, 9000);
