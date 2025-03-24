// Import the knex module
const { knex } = require('knex');

// Get the database configuration from environment variables
const port = process.env.DB_PORT_DEV;
const user = process.env.DB_USER_DEV;
const password = process.env.DB_PASS_DEV;

// Create a knex instance for the database
const database = knex({
  client: 'mysql2', // Use the mysql2 client
  connection: {
    host: process.env.DB_HOST_DEV, // Database host
    user: user, // Database user
    port: port, // Database port
    password: password, // Database password
    database: process.env.DB_NAME_DEV, // Database name
    dateStrings: true, // Use date strings
  },
  pool: {
    min: 1, // Minimum number of connections in the pool
    max: 60, // Maximum number of connections in the pool
  },
});

// Export the database instance
module.exports = { database };
