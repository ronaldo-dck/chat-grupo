const ChatClient = require('./cliente');

// Cliente 1
const client1 = new ChatClient('usuario1');
client1.connect();

setTimeout(() => client1.createRoom('sala1', true, '12345'), 1000);
setTimeout(() => client1.listRooms(), 2000);
setTimeout(() => client1.joinRoom('sala1', '12345'), 3000);
setTimeout(() => client1.sendMessageToRoom('sala1', 'Olá, pessoal! Eu sou o usuário 1.'), 4000);

// Cliente 2
const client2 = new ChatClient('usuario2');
client2.connect();

setTimeout(() => client2.listRooms(), 2000);
setTimeout(() => client2.joinRoom('sala1', '12345'), 5000);
setTimeout(() => client2.sendMessageToRoom('sala1', 'Olá, pessoal! Eu sou o usuário 2.'), 6000);

// Saída e encerramento
setTimeout(() => client1.leaveRoom('sala1'), 7000);
setTimeout(() => client2.leaveRoom('sala1'), 8000);
setTimeout(() => {
    client1.close();
    client2.close();
}, 9000);
