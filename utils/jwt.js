// Import required modules
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const util = require('util');
const readFileSync = util.promisify(fs.readFile);

// Function to get the public key
const getPubKey = async () => {
  return new Promise((resolve, reject) => {
    // Read the public key file
    readFileSync(path.join(__dirname + '/../', '/key/jwtRS256.key.pub')).then(
      (val) => {
        // Resolve the promise with the public key
        resolve(val);
      }
    );
  }).catch((err) => {
    // Log any errors
    console.log(err);
  });
};

// Function to get the private key
const getPrivKey = async () => {
  return new Promise((resolve, reject) => {
    // Read the private key file
    fs.readFile(
      path.join(__dirname, '..', 'key', 'jwtRS256.key'),
      'utf8',
      (err, data) => {
        if (err) {
          // Reject the promise with the error
          reject(err);
        } else {
          // Resolve the promise with the private key
          resolve(data);
        }
      }
    );
  });
};

// Function to encrypt data using JWT
const encrypt = async (data, expiresIn) => {
  // Get the private key
  const privKey = await getPrivKey();
  let options = {
    algorithm: 'RS256', // Use RS256 algorithm
    expiresIn: expiresIn,
  };
  // Sign the data with the private key and options
  return jwt.sign(data, privKey, options);
};

// Function to decrypt a JWT token
const decrypt = async (token) => {
  // Get the private key
  const privKey = await getPrivKey();
  let options = {
    algorithm: 'RS256', // Use RS256 algorithm
  };
  // Verify the token with the private key and options
  return jwt.verify(token, privKey, options);
};

// Export the functions
module.exports = { encrypt, decrypt, getPubKey, getPrivKey };
