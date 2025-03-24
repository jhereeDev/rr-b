const jwt = require('../utils/jwt');
const { database } = require('../config/db_config');
const { loginIV, decrypt: cDecrypt } = require('../utils/cypher');
const Member = require('../classes/Members');

// Middleware to check if the user is already logged in
const alreadyLogin = (req, res, next) => {
  // Get the token from the cookies
  const token = req.cookies['_wfr'];

  // If there is no token, proceed to the next middleware
  if (!token) {
    return next();
  }

  try {
    // Decrypt the token
    const decryptedToken = cDecrypt({ content: token, iv: loginIV });
    // Verify the token
    jwt
      .decrypt(decryptedToken)
      .then((data) => {
        // If the token is valid, set the user data and send a response
        if (data) {
          req.userData = data;

          res.status(200).send({
            message: 'Already login',
            error: false,
          });
        } else {
          // If the token is not valid, log an error and proceed to the next middleware
          console.error('Token verification failed');
          next();
        }
      })
      .catch((e) => {
        // If there is an error in the token verification, log it and proceed to the next middleware
        console.log(e);
        next();
      });
  } catch (error) {
    // If there is an error in the token decryption, log it and proceed to the next middleware
    console.log(error);
    next();
  }
};

// Middleware to check if the user is authenticated
const authenticated = (req, res, next) => {
  try {
    // Get the token from the cookies
    const token = req.cookies['_wfr'];

    // If there is no token, throw an error
    if (!token) {
      throw new Error('Unauthorized');
    }

    // Decrypt the token
    const decryptedToken = cDecrypt({ content: token, iv: loginIV });

    // Verify the token
    jwt
      .decrypt(decryptedToken)
      .then(async (data) => {
        // If the token is valid, set the user data and proceed to the next middleware
        if (data) {
          req.userData = await Member.findByMemberId(data.member_employee_id);
          next();
        } else {
          // If the token is not valid, send an unauthorized response
          res.status(401).send({
            message: 'Unauthorized',
            error: true,
          });
        }
      })
      .catch((e) => {
        // If there is an error in the token verification, send an unauthorized response with the error
        res.status(401).send({
          message: 'Unauthorized',
          error: e,
        });
      });
  } catch (error) {
    // If there is an error in the token decryption, send an unauthorized response with the error
    res.status(401).send({
      message: 'Unauthorized',
      error: error,
    });
  }
};

// Middleware to check the user's role
const checkRole = (requiredlvl = []) => {
  return async (req, res, next) => {
    try {
      // Get the user data
      let data = req.userData;
      // Get the user ID
      let userID = data?.member_employee_id;

      // Query the database for the user
      database
        .select('*')
        .from('members')
        .where('member_employee_id', '=', userID)
        .then((result) => {
          // If the user exists and their role is in the required roles, proceed to the next middleware
          if (result.length != 0) {
            if (requiredlvl.includes(result[0].role_id)) {
              return next();
            }
            // If the user's role is not in the required roles, send an access denied response
            else
              return res
                .status(403)
                .send({ error: true, message: 'Access Denied.' });
          }
          // If the user does not exist, send an access denied response
          else
            return res
              .status(403)
              .send({ error: true, message: 'Access Denied.' });
        })
        .catch((err) => {
          // If there is an error in the database query, log it and send an access denied response
          console.log(err);
          return res
            .status(403)
            .send({ error: true, message: 'Access Denied.' });
        });
    } catch (error) {
      // If there is an error in the middleware, proceed to the next middleware with the error
      return next(error);
    }
  };
};
module.exports = { alreadyLogin, authenticated, checkRole };
