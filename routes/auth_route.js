const express = require('express');
const {
  authenticate,
  logout,
  getUser,
  testLogin,
} = require('../controllers/auth_controller');
const { alreadyLogin, authenticated } = require('../middlewares/auth');

const router = express.Router();

// Route to authenticate a user. If the user is already logged in, they will not be able to authenticate again.
router.post('/', alreadyLogin, authenticate);

// Route for test login or bypass login
// Show this route is only if NODE_ENV is development
// if (process.env.NODE_ENV === 'development') {
router.post('/id/:id', testLogin);
//}

// Route to log out a user. The user must be authenticated to log out.
router.delete('/', authenticated, logout);

// Router to get the user details. The user must be authenticated to get the user details.
router.get('/user', authenticated, getUser);

module.exports = router;
