const socket = io()

function conectar() {
    const nome = document.getElementById('nomeUser').value;
    socket.emit('conectar', nome)
}