const Member = require('../classes/Members');
const { LDAP_Connection } = require('../config/ldap_config');
const { Ldap } = require('../classes/Ldap');
const asyncHandler = require('../middlewares/async');
const log4js = require('../config/log4js_config');
const ErrorResponse = require('../utils/error_response');
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

  try {
    const client = await LDAP_Connection(LDAP_USERNAME, LDAP_PASSWORD);
    let results = await Ldap.mapMembersByPosition(client, placeholder);
    const responses = [];

    await Promise.all(
      results.map(async (result) => {
        const mapMember = await Ldap.getMemberInfo(client, result.cn);

        const newMember = new Member(mapMember.member);
        const newManager = new Member(mapMember.manager);
        const newDirector = new Member(mapMember.director);

        try {
          // Fixed: Check correct IDs for each member type
          const checknewMember = await Member.findByMemberId(
            mapMember.member.member_employee_id
          );
          const checknewManager = await Member.findByMemberId(
            mapMember.manager.member_employee_id
          );
          const checknewDirector = await Member.findByMemberId(
            mapMember.director.member_employee_id
          );

          // Create/update member
          if (!checknewMember) {
            await newMember.create();
          } else {
            await newMember.update();
          }

          // Only create/update manager if different from member
          if (
            mapMember.manager.member_employee_id !==
            mapMember.member.member_employee_id
          ) {
            if (!checknewManager) {
              await newManager.create();
            } else {
              await newManager.update();
            }
          }

          // Only create/update director if different from member and manager
          if (
            mapMember.director.member_employee_id !==
              mapMember.member.member_employee_id &&
            mapMember.director.member_employee_id !==
              mapMember.manager.member_employee_id
          ) {
            if (!checknewDirector) {
              await newDirector.create();
            } else {
              await newDirector.update();
            }
          }

          responses.push({
            success: true,
            member: mapMember.member.member_employee_id,
            manager: mapMember.manager.member_employee_id,
            director: mapMember.director.member_employee_id,
          });
        } catch (error) {
          logger.error(
            `Error processing member ${mapMember.member.member_employee_id}: ${error}`
          );
          responses.push({
            success: false,
            member: mapMember.member.member_employee_id,
            error: error.message,
          });
        }
      })
    );

    res.status(200).json({
      message: 'Mapping members success',
      count: responses.length,
      responses,
    });

    client.unbind();
  } catch (error) {
    logger.error(error);
    return next(new ErrorResponse(error, 400));
  }
});

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
