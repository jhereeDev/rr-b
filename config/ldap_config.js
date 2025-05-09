const { createClient } = require('ldapjs');
const log4js = require('./log4js_config');
const logger = log4js.getLogger('ldap'); // Logger for LDAP operations

// Function to create a new LDAP connection with improved error handling
const LDAP_Connection = (username, password) => {
  return new Promise((resolve, reject) => {
    // Create client with more robust configuration
    const client = createClient({
      url: 'ldap://ldap.uk.logica.com:389',
      timeout: 30000, // Increased timeout for operations
      connectTimeout: 15000, // Increased connect timeout
      idleTimeout: 30000, // Increased idle timeout
      reconnect: {
        initialDelay: 1000, // start reconnecting after 1 sec
        maxDelay: 10000, // max delay between reconnection attempts is 10 sec
        failAfter: 5, // fail after 5 consecutive reconnection failures
      },
      // Add size and time limits to prevent overwhelming the client
      sizeLimit: 1000,
      timeLimit: 60,
    });

    // Log connection attempt
    logger.info(`Attempting LDAP connection for: ${username}`);

    // Error handler
    client.on('error', (err) => {
      logger.error(`LDAP client error: ${err.message}`);
      // Don't reject here, just log - we'll handle this in the bind callback
    });

    // Bind to the LDAP server
    client.bind(username, password, function (err) {
      if (err) {
        logger.error(`LDAP bind error for ${username}: ${err.message}`);
        resolve(false);
      } else {
        logger.info(`LDAP connection successful for: ${username}`);
        resolve(client);
      }
    });
  });
};

// Function to search for a single object in the LDAP directory with improved error handling
const searchObject = (
  client,
  opts,
  dn = 'OU=Users,OU=PH,OU=Landlord MY,OU=Corporate,DC=groupinfra,DC=com'
) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    logger.debug(`Starting LDAP search in ${dn} with filter: ${opts.filter}`);
    
    // Perform the search
    client.search(dn, opts, function (err, res) {
      if (err) {
        logger.error(`LDAP search error: ${err.message}`);
        reject(err);
      } else {
        let result = {};
        let hasRecord = false;
        
        // Set a timeout in case the search takes too long
        const timeoutId = setTimeout(() => {
          logger.warn(`LDAP search timeout after ${opts.timeLimit || 60}s for filter: ${opts.filter}`);
          resolve('Search timeout');
        }, (opts.timeLimit || 60) * 1000);
        
        res.on('searchEntry', async function (entry) {
          hasRecord = true;
          result = entry.object;
          logger.debug(`Found entry: ${entry.object.cn}`);
        });
        
        res.on('page', () => {});
        res.on('searchReference', () => {});
        
        res.on('error', function (err) {
          clearTimeout(timeoutId);
          logger.error(`LDAP search error event: ${err.message}`);
          reject(err);
        });
        
        res.on('end', function () {
          clearTimeout(timeoutId);
          const duration = Date.now() - startTime;
          
          if (!hasRecord) {
            console.log('No Record Found');
            logger.info(`No record found for search (${duration}ms): ${opts.filter}`);
            resolve('No Record Found');
          } else {
            logger.info(`Search completed successfully in ${duration}ms`);
            resolve(result);
          }
        });
      }
    });
  });
};

// Function to search for multiple objects in the LDAP directory with improved error handling
const searchArray = (
  client,
  opts,
  dn = 'OU=Users,OU=PH,OU=Landlord MY,OU=Corporate,DC=groupinfra,DC=com'
) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const results = []; // Array to hold search results
    
    logger.debug(`Starting LDAP array search in ${dn} with filter: ${opts.filter}`);
    
    // Perform the search with timeout tracking
    client.search(dn, opts, function (err, res) {
      if (err) {
        logger.error(`LDAP search array error: ${err.message}`);
        reject(err);
      } else {
        // Set a timeout in case the search takes too long
        const timeoutId = setTimeout(() => {
          logger.warn(`LDAP search array timeout after ${opts.timeLimit || 60}s for filter: ${opts.filter}`);
          if (results.length > 0) {
            // If we already have some results, return them instead of failing
            logger.info(`Returning ${results.length} partial results due to timeout`);
            resolve(results);
          } else {
            reject(new Error('Search timeout with no results'));
          }
        }, (opts.timeLimit || 60) * 1000);
        
        res.on('searchEntry', function (entry) {
          results.push(entry.object); // Push each search result to the array
          logger.debug(`Found array entry: ${entry.object.cn} (total: ${results.length})`);
        });

        res.on('error', function (err) {
          clearTimeout(timeoutId);
          logger.error(`LDAP search array error event: ${err.message}`);
          
          if (results.length > 0) {
            // If we already have some results, return them instead of failing
            logger.info(`Returning ${results.length} partial results despite error`);
            resolve(results);
          } else {
            reject(err);
          }
        });

        res.on('end', function (result) {
          clearTimeout(timeoutId);
          const duration = Date.now() - startTime;
          
          if (results.length === 0) {
            logger.info(`No records found for array search (${duration}ms): ${opts.filter}`);
            reject('No Record');
          } else {
            logger.info(`Array search completed successfully with ${results.length} results in ${duration}ms`);
            resolve(results);
          }
        });
      }
    });
  });
};

// Export the functions with logger for better monitoring
module.exports = { LDAP_Connection, searchArray, searchObject, logger };