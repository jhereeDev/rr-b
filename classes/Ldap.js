const { Options } = require('./Options');
const { searchObject, searchArray } = require('../config/ldap_config');
const { setRole } = require('../utils/roles');
const Member = require('./Members');

// @desc Ldap class
// @access public
class Ldap extends Member {
  // Define the attributes to be searched in LDAP
  static get searchAttributes() {
    return [
      'cn',
      'sn',
      'givenName',
      'title',
      'department',
      'manager',
      'extensionAttribute2',
      'userPrincipalName',
      'memberOf',
      'extensionAttribute14',
    ];
  }

  // Function to search LDAP by username
  static async searchByUsername(client, username) {
    const login_options = new Options(
      `(&(cn=${username})(memberOf=CN=mdl.hr.sbu-asia.bu-assea.${process.env.SUB_BU_CODE}.member,OU=HR Lists,OU=Managed Lists,OU=Groupinfra Servers,DC=groupinfra,DC=com))`,
      'sub',
      this.searchAttributes,
      true,
      50
    );

    return searchObject(client, login_options);
  }

  // Function to search LDAP by username
  static async searchByUsernameBypass(client, username) {
    const login_options = new Options(
      `(&(cn=${username})(memberOf=CN=mdl.hr.sbu-asia.bu-assea.${process.env.SUB_BU_CODE_DEV}.member,OU=HR Lists,OU=Managed Lists,OU=Groupinfra Servers,DC=groupinfra,DC=com))`,
      'sub',
      this.searchAttributes,
      true,
      50
    );

    return searchObject(client, login_options);
  }

  static async searchByEmail(client, email) {
    const BU_CODE = process.env.TEST_EMAILS.split(',').includes(email)
      ? process.env.SUB_BU_CODE_DEV
      : process.env.SUB_BU_CODE;

    const login_options = new Options(
      `(&(userPrincipalName=${email})(memberOf=CN=mdl.hr.sbu-asia.bu-assea.${BU_CODE}.member,OU=HR Lists,OU=Managed Lists,OU=Groupinfra Servers,DC=groupinfra,DC=com))`,
      'sub',
      this.searchAttributes,
      true,
      50
    );

    return searchObject(client, login_options);
  }

  static async searchByEmailBypass(client, email) {
    const BU_CODE = process.env.TEST_EMAILS.split(',').includes(email)
      ? process.env.SUB_BU_CODE_DEV
      : process.env.SUB_BU_CODE;

    const login_options = new Options(
      `(&(userPrincipalName=${email})(memberOf=CN=mdl.hr.sbu-asia.bu-assea.${BU_CODE}.member,OU=HR Lists,OU=Managed Lists,OU=Groupinfra Servers,DC=groupinfra,DC=com))`,
      'sub',
      this.searchAttributes,
      true,
      50
    );

    return searchObject(client, login_options);
  }

  // Function to map LDAP members by position
  static async mapMembersByPosition(client, position) {
    // Construct the search filter with memberOf
    const filter = `(&(title=*${position}*)(objectClass=person)(memberOf=CN=mdl.hr.sbu-asia.bu-assea.${process.env.SUB_BU_CODE}.member,OU=HR Lists,OU=Managed Lists,OU=Groupinfra Servers,DC=groupinfra,DC=com))`;

    const login_options = new Options(
      filter,
      'sub',
      this.searchAttributes,
      true,
      50
    );

    return searchArray(client, login_options);
  }

  // Function to get member info from LDAP
  static async getMemberInfo(client, username) {
    const login_options = new Options(
      `cn=${username}`,
      'sub',
      this.searchAttributes,
      true,
      50
    );

    const result = await searchObject(client, login_options);

    // Code to get the member's manager and director info from LDAP
    const managerCN =
      result.manager?.split(',')[0].toLowerCase().replace('cn=', '') || '';

    const manager_options = new Options(
      `cn=${managerCN}`,
      'sub',
      this.searchAttributes,
      true,
      50
    );
    // Split the string by commas and then filter out the part containing "CN="
    const dnManager = result.manager
      .split(',')
      .filter((part) => part.toLowerCase().includes('cn=') === false);

    // Join the remaining parts back together with commas
    const dnManagerOptions = dnManager.join(',');
    const manager = await searchObject(
      client,
      manager_options,
      dnManagerOptions
    );

    const directorCN =
      manager.manager?.split(',')[0].toLowerCase().replace('cn=', '') || '';
    const director_options = new Options(
      `cn=${directorCN}`,
      'sub',
      this.searchAttributes,
      true,
      50
    );
    // Split the string by commas and then filter out the part containing "CN="
    const dnDirector = manager.manager
      .split(',')
      .filter((part) => part.toLowerCase().includes('cn=') === false);

    // Join the remaining parts back together with commas
    const dnDirectorOptions = dnDirector.join(',');

    const director = await searchObject(
      client,
      director_options,
      dnDirectorOptions
    );
    const manager_id = manager.extensionAttribute2;
    const director_id = director.extensionAttribute2;

    // Create the director and manager user in database if not existed
    const managerCN1 =
      director.manager?.split(',')[0].toLowerCase().replace('cn=', '') || '';

    const manager_options1 = new Options(
      `cn=${managerCN1}`,
      'sub',
      this.searchAttributes,
      true,
      50
    );
    // Split the string by commas and then filter out the part containing "CN="
    const dnManager1 = director.manager
      .split(',')
      .filter((part) => part.toLowerCase().includes('cn=') === false);

    // Join the remaining parts back together with commas
    const dnManagerOptions1 = dnManager1.join(',');
    const manager1 = await searchObject(
      client,
      manager_options1,
      dnManagerOptions1
    );

    const directorCN1 =
      manager1.manager?.split(',')[0].toLowerCase().replace('cn=', '') || '';
    const director_options1 = new Options(
      `cn=${directorCN1}`,
      'sub',
      this.searchAttributes,
      true,
      50
    );
    // Split the string by commas and then filter out the part containing "CN="
    const dnDirector1 = manager1.manager
      .split(',')
      .filter((part) => part.toLowerCase().includes('cn=') === false);

    // Join the remaining parts back together with commas
    const dnDirectorOptions1 = dnDirector1.join(',');

    const director1 = await searchObject(
      client,
      director_options1,
      dnDirectorOptions1
    );

    const managerMember = {
      member_employee_id: manager.extensionAttribute2,
      member_username: manager.cn,
      member_firstname: manager.givenName,
      member_lastname: manager.sn,
      member_email: manager.userPrincipalName,
      member_title: manager.title,
      role_id: setRole(manager.title),
      member_status: manager ? 'ACTIVE' : '',
      member_manager_id: director.extensionAttribute2,
      member_director_id: manager1 ? manager1.extensionAttribute2 : '',
    };

    const directorMember = {
      member_employee_id: director.extensionAttribute2,
      member_username: director.cn,
      member_firstname: director.givenName,
      member_lastname: director.sn,
      member_email: director.userPrincipalName,
      member_title: director.title,
      role_id: setRole(director.title),
      member_status: director ? 'ACTIVE' : '',
      member_manager_id: manager1.extensionAttribute2,
      member_director_id: director1 ? director1.extensionAttribute2 : '',
    };

    const member = {
      member_employee_id: result.extensionAttribute2,
      member_username: result.cn,
      member_firstname: result.givenName,
      member_lastname: result.sn,
      member_email: result.userPrincipalName,
      member_title: result.title,
      member_manager_id: manager_id,
      member_director_id: director_id,
      role_id: setRole(result.title),
      member_status: result ? 'ACTIVE' : '',
    };

    // Return the member info
    return {
      member,
      manager: managerMember,
      director: directorMember,
    };
  }
}

module.exports = { Ldap };
