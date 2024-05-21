// Node.js TCP client example
const net = require('net');

// Connect to the server
const client = net.createConnection({ port: 8080 }, () => {
    console.log('Connected to server.');

    // Send data to the server
    client.write('Hello, server!');

    // Listen for data from the server
    client.on('data', (data) => {
        console.log(`Received from server: ${data}`);
    });

    // Handle server disconnection
    client.on('end', () => {
        console.log('Disconnected from server.');
    });
});

// Handle errors
client.on('error', (err) => {
    console.error('Error:', err.message);
});
