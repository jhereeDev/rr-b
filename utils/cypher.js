// Import required modules
const crypto = require('crypto');
const jwt = require('./jwt');
const algorithm = 'aes-256-cbc'; // Encryption algorithm
const secretKey = process.env.CYPHER_SECRET_KEY; // Secret key for encryption
const bcrypt = require('bcryptjs'); // Module for hashing passwords
const saltRounds = 10; // Number of rounds for bcrypt hashing
const loginIV = process.env.CYPHER_LOGIN_IV; // Initialization vector for login

// Function to generate a random hexadecimal value
const randomValueHex = (len) => {
  return crypto
    .randomBytes(Math.ceil(len / 2)) // Generate random bytes
    .toString('hex') // Convert to hexadecimal format
    .slice(0, len) // Return required number of characters
    .toUpperCase(); // Convert to uppercase
};

// Function to encrypt text
const encrypt = (text, iv = undefined) => {
  return new Promise((resolve, reject) => {
    jwt.getPrivKey().then((privkey) => {
      crypto.scrypt(privkey.toString('hex'), 'salt', 24, (err, key) => {
        if (err) throw err;
        // Generate a random initialization vector if not provided
        if (typeof iv == 'undefined')
          crypto.randomFill(new Uint8Array(16), (err, iv) => {
            const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
            const encrypted = Buffer.concat([
              cipher.update(text),
              cipher.final(),
            ]);
            resolve({
              iv: iv.toString('hex'),
              content: encrypted.toString('hex'),
            });
          });
        else {
          iv = new Uint8Array(iv.split(','));
          const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
          const encrypted = Buffer.concat([
            cipher.update(text),
            cipher.final(),
          ]);
          resolve({
            iv: iv.toString('hex'),
            content: encrypted.toString('hex'),
          });
        }
      });
    });
  });
};

// Function to decrypt a hash
const decrypt = (hash) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    secretKey,
    new Uint8Array(hash.iv.split(','))
  );
  const decrpyted = Buffer.concat([
    decipher.update(Buffer.from(hash.content, 'hex')),
    decipher.final(),
  ]);
  return decrpyted.toString();
};

// Function to hash a plaintext password
const hashPlainPass = (password) => {
  var salt = bcrypt.genSaltSync(saltRounds);
  return bcrypt.hashSync(password, salt);
};

// Function to compare a plaintext password with a hash
const compareHash = async (myPlaintextPassword, hash) => {
  return await bcrypt.compare(myPlaintextPassword, hash);
};

// Export the functions
module.exports = {
  hashPlainPass,
  compareHash,
  encrypt,
  decrypt,
  randomValueHex,
  loginIV,
};
