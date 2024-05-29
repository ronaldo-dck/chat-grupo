const crypto = require('crypto');

class EncryptionHandler {
    constructor(symetricKey) {
        this.symetricKey = symetricKey;
        this.iv = crypto.randomBytes(16); // IV (Initialization Vector) aleatório
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

// Exemplo de uso
const symetricKey = crypto.randomBytes(32); // Chave simétrica (32 bytes para AES-256)
const message = "REGISTRO asdkj";

const handler = new EncryptionHandler(symetricKey);

const encryptedMessage = handler.encryptAES(message);
console.log("Mensagem criptografada:",  encryptedMessage);

const decryptedMessage = handler.decryptAES(encryptedMessage);
console.log("Mensagem descriptografada:", decryptedMessage);
