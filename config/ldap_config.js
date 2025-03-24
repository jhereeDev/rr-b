// Import the createClient function from the ldapjs module
const { createClient } = require('ldapjs');

// Function to create a new LDAP connection
const LDAP_Connection = (username, password) => {
  return new Promise((resolve, reject) => {
    const client = createClient({
      url: 'ldap://ldap.uk.logica.com:389',
      timeout: 5000,
      connectTimeout: 10000,
      idleTimeout: 15000,
      // Add size and time limits to prevent overwhelming the client
      sizeLimit: 1000,
      timeLimit: 60,
    });

    client.bind(username, password, function (err) {
      if (err) {
        resolve(false);
      } else {
        resolve(client);
      }
    });
  });
};

// Function to search for a single object in the LDAP directory
const searchObject = (
  client,
  opts,
  dn = 'OU=Users,OU=PH,OU=Landlord MY,OU=Corporate,DC=groupinfra,DC=com'
) => {
  return new Promise((resolve, reject) => {
    // Perform the search
    client.search(dn, opts, function (err, res) {
      if (err) {
        reject(err);
      } else {
        let result = {};
        let hasRecord = false;
        res.on('searchEntry', async function (entry) {
          hasRecord = true;
          result = entry.object;
        });
        res.on('page', () => {});
        res.on('searchReference', () => {});
        res.on('error', function (err) {
          reject(err);
        });
        res.on('end', function () {
          if (!hasRecord) {
            console.log('No Record Found');
            resolve('No Record Found');
          } else {
            resolve(result);
          }
        });
      }
    });
  });
};

// Function to search for multiple objects in the LDAP directory
const searchArray = (
  client,
  opts,
  dn = 'OU=Users,OU=PH,OU=Landlord MY,OU=Corporate,DC=groupinfra,DC=com'
) => {
  return new Promise((resolve, reject) => {
    const results = []; // Array to hold search results

    // Perform the search
    client.search(dn, opts, function (err, res) {
      if (err) {
        reject(err);
      } else {
        res.on('searchEntry', function (entry) {
          results.push(entry.object); // Push each search result to the array
        });

        res.on('page', (result) => {});

        res.on('searchReference', function (referral) {});

        res.on('error', function (err) {
          reject(err);
        });

        res.on('end', function (res) {
          if (results.length === 0) {
            reject('No Record');
          } else {
            resolve(results); // Resolve with the array of search results
          }
        });
      }
    });
  });
};

// Export the functions
module.exports = { LDAP_Connection, searchArray, searchObject };
