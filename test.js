const net = require('net');

const clients = []; // Array to store connected clients

const server = net.createServer((socket) => {
    console.log('Client connected.');

    // Add the new client socket to the list
    clients.push(socket);
    console.log(clients.length);

    // Listen for data from the client
    socket.on('data', (data) => {
        const message = data.toString();
        console.log(`Received: ${message}`);

        // Broadcast the message to all other clients
        clients.forEach((client) => {
            if (client !== socket) {
                client.write(message);
            }
        });
    });

    // Handle client disconnection
    socket.on('end', () => {
        console.log('Client disconnected.');
        // Remove the disconnected client from the list
        clients.splice(clients.indexOf(socket), 1);
    });

    socket.on('error', (err) => {
        console.error('Error:', err.message);
    })
});

server.listen(8080, () => {
    console.log('Server listening on port 8080.');
    console.log(clients);
});
