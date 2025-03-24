const asyncHandler = require('../middlewares/async');
const { LDAP_Connection } = require('../config/ldap_config');
const { Ldap } = require('../classes/Ldap');
const Member = require('../classes/Members');
const { generateAndEncryptToken, setCookies } = require('../utils/cookie');
const { getFiscalYearAndQuarter } = require('../utils/helpers');
const ErrorResponse = require('../utils/error_response');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('authController'); // Logger for auth controller

const domain = '';

// @desc    Authenticate user
// @route   POST /api/auth
const authenticate = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return next(new ErrorResponse('Email and password are required', 400));
    }

    const existingUser = await Member.findByEmail(email);

    if (!existingUser) {
      return next(new ErrorResponse('Permission denied', 403));
    }

    logger.info(`Authentication attempt for username ${email}`);

    // Add retry logic for LDAP connection
    let retryCount = 0;
    const maxRetries = 3;
    let client;

    while (retryCount < maxRetries) {
      try {
        client = await LDAP_Connection(
          `CN=${existingUser.member_username},OU=Users,OU=PH,OU=Landlord MY,OU=Corporate,DC=groupinfra,DC=com`,
          password
        );
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw error;
        }
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    if (!client) {
      logger.warn(`Incorrect credentials for username: ${email}`);
      return next(new ErrorResponse('Incorrect Credentials', 403));
    }

    const result = await Ldap.searchByEmail(client, email);

    let member = await Member.findByMemberId(result.extensionAttribute2);

    if (!member) {
      logger.warn(`Incorrect credentials for username: ${email}`);
      return next(new ErrorResponse('Incorrect Credentials', 403));
    }

    // Update login time in database
    await Member.updateLoginTime(result.extensionAttribute2);

    // Get updated member data
    member = await Member.findByMemberId(result.extensionAttribute2);

    // Generate and encrypt token
    const token = await generateAndEncryptToken(member);

    // Set cookies in the response
    setCookies(res, token.content);

    // Send a success response
    res.json({
      success: true,
      user: member,
    });

    // Unbind the LDAP client connection
    client.unbind((err) => {
      if (err) {
        logger.error(`Authentication error for username: ${email}`, err); // Log authentication error with stack trace
        console.log(err);
      }
    });
  } catch (error) {
    logger.error(`Authentication error for username: ${email}`, error);
    return next(new ErrorResponse('Authentication failed', 500));
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = asyncHandler(async (req, res, next) => {
  // Extract the member_employee_id from the request user data
  const memberEmployeeId = req.userData.member_employee_id;

  // Log logout event
  logger.info(`Logout for member ID: ${memberEmployeeId}`);

  // update the logout time for the user
  await Member.updateLogoutTime(memberEmployeeId);

  // Clear cookies from the response
  res.clearCookie('_wfr', { domain: domain, path: '/' });

  // Send a success response
  res.json({ success: true, message: 'Logout Successful' });
});

// @desc    Get current user
// @route   GET /api/auth/user
const getUser = asyncHandler(async (req, res, next) => {
  // Extract the member_employee_id from the request user data
  const user = req.userData;

  logger.info(
    `Fetching user data for member ID: ${req.userData.member_employee_id}`
  ); // Log user fetching

  user['fiscal_quarter'] = getFiscalYearAndQuarter();
  // Send the user data in the response
  res.json({
    success: true,
    user,
  });
});

// @desc Test login
const testLogin = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  logger.info(`Test login for member ID: ${id}`); // Log test login attempt

  let member = await Member.findByMemberId(id);

  if (!member) {
    logger.warn(`Incorrect credentials for username: ${id}`);
    return next(new ErrorResponse('Incorrect Credentials', 403));
  }

  // update login time in database
  await Member.updateLoginTime(id);

  // Get updated member data
  member = await Member.findByMemberId(id);

  // Generate and encrypt token
  const token = await generateAndEncryptToken(member);

  // Set cookies in the response
  setCookies(res, token.content);

  // Send a success response
  res.json({
    success: true,
    user: member,
  });
});

module.exports = { authenticate, logout, getUser, testLogin };
