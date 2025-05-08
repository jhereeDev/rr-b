const { database } = require('../config/db_config');
const { hashPlainPass, compareHash } = require('../utils/cypher');

class Admin {
  constructor({
    id,
    member_employee_id,
    username,
    password,
    email,
    firstName,
    lastName,
    status = 'ACTIVE',
  }) {
    this.id = id;
    this.member_employee_id = member_employee_id;
    this.username = username;
    this.password = password;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.status = status;
  }

  static get tableName() {
    return 'admins';
  }


  // Find admin by username
  static async findByUsername(username) {
    try {
      return await database(Admin.tableName)
        .where('username', username)
        .andWhere('status', 'ACTIVE')
        .first();
    } catch (error) {
      console.error('Error finding admin by username: ', error);
      throw new Error(`Error finding admin by username: ${error.message}`);
    }
  }

  // Find admin by email
  static async findByEmail(email) {
    try {
      return await database(Admin.tableName)
        .where('email', email)
        .andWhere('status', 'ACTIVE')
        .first();
    } catch (error) {
      console.error('Error finding admin by email: ', error);
      throw new Error(`Error finding admin by email: ${error.message}`);
    }
  }

  // Validate admin password
  static async validatePassword(plainPassword, hashedPassword) {
    return await compareHash(plainPassword, hashedPassword);
  }

  // Create a new admin
  async create() {
    try {
      // Hash the password before storing
      if (this.password) {
        this.password = hashPlainPass(this.password);
      }

      const [id] = await database(Admin.tableName).insert({
        username: this.username,
        member_employee_id: this.member_employee_id,
        password: this.password,
        email: this.email,
        firstName: this.firstName,
        lastName: this.lastName,
        status: this.status,
      });

      this.id = id;
      return this;
    } catch (error) {
      console.error('Error creating admin: ', error);
      throw new Error(`Error creating admin: ${error.message}`);
    }
  }

  // Update admin's login time (for tracking purposes)
  static async updateLoginTime(username) {
    try {
      return await database(Admin.tableName)
        .where('username', username)
        .update({ last_login: database.fn.now() });
    } catch (error) {
      console.error('Error updating admin login time: ', error);
      throw new Error(`Error updating admin login time: ${error.message}`);
    }
  }

  // Find all admin users
static async findAll() {
    try {
      return await database(Admin.tableName)
        .select('*')
        .orderBy('created_at', 'desc');
    } catch (error) {
      console.error('Error finding all admins: ', error);
      throw new Error(`Error finding all admins: ${error.message}`);
    }
  }
  
  // Find admin by ID
  static async findById(id) {
    try {
      return await database(Admin.tableName)
        .where('id', id)
        .first();
    } catch (error) {
      console.error('Error finding admin by ID: ', error);
      throw new Error(`Error finding admin by ID: ${error.message}`);
    }
  }
  
  // Update admin status
  static async updateStatus(id, status) {
    try {
      return await database(Admin.tableName)
        .where('id', id)
        .update({ 
          status, 
          updated_at: database.fn.now() 
        });
    } catch (error) {
      console.error('Error updating admin status: ', error);
      throw new Error(`Error updating admin status: ${error.message}`);
    }
  }
  
  // Update admin password
  static async updatePassword(id, hashedPassword) {
    try {
      return await database(Admin.tableName)
        .where('id', id)
        .update({ 
          password: hashedPassword, 
          updated_at: database.fn.now() 
        });
    } catch (error) {
      console.error('Error updating admin password: ', error);
      throw new Error(`Error updating admin password: ${error.message}`);
    }
  }
}


module.exports = Admin;