const crypto = require("crypto");

const generateAESKey = (length) => {
  return crypto.randomBytes(length);
};

// const { generateKeyPairSync, publicEncrypt, randomBytes, createCipheriv, createDecipheriv } = require('crypto');
const encryptWithRSAPublicKey = (publicKey, data) => {
  const buffer = Buffer.from(data, "utf8");
  const encrypted = crypto.publicEncrypt(publicKey, buffer);
  return encrypted.toString("base64");
};



module.exports = {generateAESKey, encryptWithRSAPublicKey}