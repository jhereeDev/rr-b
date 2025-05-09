const Member = require('../classes/Members');
const { LDAP_Connection } = require('../config/ldap_config');
const { Ldap } = require('../classes/Ldap');
const asyncHandler = require('../middlewares/async');
const log4js = require('../config/log4js_config');
const ErrorResponse = require('../utils/error_response');
const { capitalizeEachWord } = require('../utils/helpers');
const logger = log4js.getLogger('userController');
const LDAP_USERNAME = process.env.LDAP_USER;
const LDAP_PASSWORD = process.env.LDAP_PASSWORD;

// @desc      Add a member
// @route     POST /api/users
const add_member = asyncHandler(async (req, res, next) => {
  try {
    // Extract username from the request body
    const { username } = req.body;

    // Establish a connection to the LDAP server
    const client = await LDAP_Connection(LDAP_USERNAME, LDAP_PASSWORD);

    // Get the member information from the LDAP server
    const result = await Ldap.getMemberInfo(client, username);

    // Create a new member object with the retrieved information
    const newMember = new Member(result.member);

    try {
      // Attempt to create the new member in the database
      await newMember.create();
      // If successful, return the new member object with a 201 status code
      res.status(201).json({ newMember });
    } catch (error) {
      // If there's an error, log it and return a 500 status code
      logger.error(`User error: ${error}`);
      return next(new ErrorResponse(error, 500));
    }
    // Unbind the client from the LDAP server
    client.unbind();
  } catch (error) {
    // If there's an error in the outer try block, log it and return a 403 status code
    logger.error(`User error: ${error}`);
    return next(new ErrorResponse(error, 403));
  }
});

// @desc      Search a member
// @route     POST /api/users/search
const search_member = asyncHandler(async (req, res, next) => {
  // Extract username from the request body
  const { username } = req.body;

  try {
    // Establish a connection to the LDAP server
    const client = await LDAP_Connection(LDAP_USERNAME, LDAP_PASSWORD);

    // Search for the member on the LDAP server using the provided username
    const result = await Ldap.searchByUsername(client, username);

    // If the result is empty (i.e., no user was found), return a 400 status code with an error message
    if (Object.keys(result).length === 0) {
      logger.error(`No Record Found with the username of ${username}`);
      return next(new ErrorResponse('No Record Found', 400));
    } else {
      // If a user was found, return the user's information with a 200 status code
      res.status(200).json({ result });
    }

    // Unbind the client from the LDAP server
    client.unbind();
  } catch (error) {
    // If there's an error, log it and return a 403 status code
    logger.error(`User error with the username of ${username}`);
    return next(new ErrorResponse(error, 403));
  }
});

// @desc      Map all members
// @route     POST /api/users/map
const map_members = asyncHandler(async (req, res, next) => {
  const { placeholder } = req.body;
  const batchSize = 5; // Process members in small batches
  const batchDelay = 2000; // 2 seconds delay between batches
  
  try {
    // Create a single LDAP client connection for the entire operation
    const client = await LDAP_Connection(LDAP_USERNAME, LDAP_PASSWORD);
    if (!client) {
      logger.error('Failed to connect to LDAP server');
      return next(new ErrorResponse('Failed to connect to LDAP server', 500));
    }
    
    // Search for members matching the placeholder (DIRECTOR, MANAGER, CONSULTANT)
    let results = await Ldap.mapMembersByPosition(client, placeholder);
    
    logger.info(`Found ${results.length} members matching placeholder: ${placeholder}`);
    
    // Prepare tracking arrays
    const responseData = {
      success: true,
      message: `Processing ${results.length} members in batches of ${batchSize}`,
      totalMembers: results.length,
      batchSize: batchSize,
      batchDelay: `${batchDelay}ms`,
      created: [],
      updated: [],
      skipped: [],
      failed: []
    };

    // Process members in batches with delays
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      logger.info(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(results.length/batchSize)}`);
      
      // Process each member in the current batch
      await Promise.all(
        batch.map(async (result) => {
          try {
            // Get full member info including manager and director hierarchy
            const mapMember = await Ldap.getMemberInfo(client, result.cn);
            
            // Format the title properly for all entries
            if (mapMember.member && mapMember.member.member_title) {
              mapMember.member.member_title = capitalizeEachWord(mapMember.member.member_title);
            }
            if (mapMember.manager && mapMember.manager.member_title) {
              mapMember.manager.member_title = capitalizeEachWord(mapMember.manager.member_title);
            }
            if (mapMember.director && mapMember.director.member_title) {
              mapMember.director.member_title = capitalizeEachWord(mapMember.director.member_title);
            }

            // Create Member objects
            const newMember = new Member(mapMember.member);
            const newManager = new Member(mapMember.manager);
            const newDirector = new Member(mapMember.director);

            // Process member
            const memberStatus = await processMember(newMember, responseData);
            
            // Only process manager if different from member
            if (
              mapMember.manager.member_employee_id !== 
              mapMember.member.member_employee_id
            ) {
              await processMember(newManager, responseData);
            }

            // Only process director if different from member and manager
            if (
              mapMember.director.member_employee_id !== mapMember.member.member_employee_id &&
              mapMember.director.member_employee_id !== mapMember.manager.member_employee_id
            ) {
              await processMember(newDirector, responseData);
            }

          } catch (error) {
            logger.error(`Error processing member ${result.cn}: ${error.message}`);
            responseData.failed.push({
              cn: result.cn,
              error: error.message
            });
          }
        })
      );

      // Add delay between batches (but not after the last batch)
      if (i + batchSize < results.length) {
        logger.info(`Batch complete. Waiting ${batchDelay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    // Complete the operation
    logger.info('Member mapping completed successfully');
    client.unbind();
    
    res.status(200).json({
      message: 'Member mapping completed successfully',
      stats: {
        total: results.length,
        created: responseData.created.length,
        updated: responseData.updated.length,
        skipped: responseData.skipped.length,
        failed: responseData.failed.length
      },
      details: responseData
    });
  } catch (error) {
    logger.error(`Error in member mapping: ${error.message}`);
    return next(new ErrorResponse(error.message, 400));
  }
});

/**
 * Helper function to process a single member
 * Checks if member exists, compares data, and creates/updates as needed
 */
async function processMember(memberObj, responseData) {
  try {
    // Check if member already exists in database
    const existingMember = await Member.findByMemberId(
      memberObj.member_employee_id
    );

    if (!existingMember) {
      // Create new member
      await memberObj.create();
      responseData.created.push({
        id: memberObj.member_employee_id,
        name: `${memberObj.member_firstname} ${memberObj.member_lastname}`
      });
      return 'created';
    } else {
      // Check if data needs updating by comparing key fields
      const needsUpdate = 
        existingMember.member_firstname !== memberObj.member_firstname ||
        existingMember.member_lastname !== memberObj.member_lastname ||
        existingMember.member_title !== memberObj.member_title ||
        existingMember.member_email !== memberObj.member_email ||
        existingMember.member_manager_id !== memberObj.member_manager_id ||
        existingMember.member_director_id !== memberObj.member_director_id;
      
      if (needsUpdate) {
        // Update existing member with new data
        await memberObj.update();
        responseData.updated.push({
          id: memberObj.member_employee_id,
          name: `${memberObj.member_firstname} ${memberObj.member_lastname}`
        });
        return 'updated';
      } else {
        // Skip if no changes needed
        responseData.skipped.push({
          id: memberObj.member_employee_id,
          name: `${memberObj.member_firstname} ${memberObj.member_lastname}`
        });
        return 'skipped';
      }
    }
  } catch (error) {
    throw error;
  }
}

// @desc      Get all members
// @route     GET /api/users
const get_members = asyncHandler(async (req, res, next) => {
  const results = await Member.findAll();

  // If the result is empty (i.e., no user was found), return a 400 status code with an error message
  if (Object.keys(results).length === 0) {
    logger.error(`No Record Found`);
    return next(new ErrorResponse('No Record Found', 400));
  } else {
    // If a user was found, return the user's information with a 200 status code
    res.status(200).json({ success: true, count: results.length, results });
  }
});

// @desc      Get all members by role id
// @route     GET /api/users/role/:role_id
const get_members_by_role = asyncHandler(async (req, res, next) => {
  try {
    // Extract role id from the request body
    const { role_id } = req.params;

    const results = await Member.findByRoleId(role_id);

    // If the result is empty (i.e., no user was found), return a 400 status code with an error message
    if (Object.keys(results).length === 0) {
      logger.error(`No Record Found`);
      return next(new ErrorResponse('No Record Found', 400));
    } else {
      // If a user was found, return the user's information with a 200 status code
      res.status(200).json({ success: true, count: results.length, results });
    }
  } catch (error) {
    // If there's an error, log it and return a 403 status code
    res.status(403).json(error);
  }
});

// @desc     Get all members by manager id logged in
// @route    GET /api/users/manager
const get_members_by_manager = asyncHandler(async (req, res, next) => {
  // Extract manager id from the request body
  const { employee_id } = req.userData;

  const results = await Member.findByManagerId(employee_id);

  // If the result is empty (i.e., no user was found), return a 400 status code with an error message
  if (!results) {
    logger.error(`No Record Found`);
    return next(new ErrorResponse('No Record Found', 400));
  } else {
    // If a user was found, return the user's information with a 200 status code
    res.status(200).json({ success: true, count: results.length, results });
  }
});

// @desc      Get all members by director id logged in
// @route     GET /api/users/director
const get_members_by_director = asyncHandler(async (req, res, next) => {
  // Extract director id from the request body
  const { member_employee_id } = req.userData;

  const results = await Member.findByDirectorId(member_employee_id);

  // If the result.managers and results.members are empty (i.e., no user was found), return a 400 status code with an error message
  if (
    Object.keys(results.members).length === 0 &&
    Object.keys(results.managers).length === 0
  ) {
    logger.error(`No Record Found`);
    return next(new ErrorResponse('No Record Found', 400));
  } else {
    // If a user was found, return the user's information with a 200 status code

    // Length of members and managers
    const membersLength = results.members.length + results.managers.length;

    res.status(200).json({ success: true, count: membersLength, results });
  }
});

// @desc      Hide popup for user
// @route     POST /api/users/hide_popup
// @access    Private (Only logged in users)
const hidePopup = asyncHandler(async (req, res, next) => {
  // Extract member id from the request body
  const { member_employee_id } = req.userData;

  try {
    // Attempt to hide the popup for the user
    await Member.hidePopup(member_employee_id);

    // If successful, return a 200 status code with a success message
    res.status(200).json({ success: true, message: 'Popup hidden' });
  } catch (error) {
    // If there's an error, log it and return a 500 status code
    logger.error(`User error: ${error}`);
    return next(new ErrorResponse(error, 500));
  }
});

module.exports = {
  search_member,
  map_members,
  add_member,
  get_members,
  get_members_by_role,
  get_members_by_manager,
  get_members_by_director,
  hidePopup,
};
