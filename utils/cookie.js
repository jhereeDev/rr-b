const { encrypt } = require('./jwt');
const { encrypt: cEncrypt, loginIV, decrypt: cDecrypt } = require('./cypher');
const domain = '';

// Function to get a cookie by name from the cookies string
const getCookie = (cname, cookies) => {
  // Code to parse the cookies string and find the cookie with the given name
  var name = cname + '=';
  var decodedCookie = cookies;
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
};

// Function to check if a token is defined
const getToken = (token) => {
  // Code to check if the token is defined and return an appropriate response
  try {
    if (typeof token !== 'undefined') {
      return {
        err: false,
        msg: token,
      };
    } else {
      return {
        err: true,
        msg: 'No Token',
      };
    }
  } catch (error) {
    return {
      err: true,
      msg: error,
    };
  }
};

// Function to generate and encrypt a token for a user
const generateAndEncryptToken = async (user) => {
  // Code to generate a JWT token for the user, encrypt it, and return the encrypted token
  const token = await encrypt(user, '9h');
  return await cEncrypt(token, loginIV);
};

// Function to set cookies in the response
const setCookies = (res, tokenContent) => {
  // Code to set the '_wfr' and '_wfr_id' cookies in the response
  res.cookie('_wfr', tokenContent, {
    domain: domain,
    path: '/',
    expires: new Date(Date.now() + 1000 * 60 * 60 * 9),
    httpOnly: true,
    secure: true,
  });
};

module.exports = { getToken, getCookie, generateAndEncryptToken, setCookies };
