const express = require('express');
const router = express.Router();
const { authenticated, checkRole } = require('../middlewares/auth');
const {
  getConsentStatus,
  logConsent,
  getAllConsent,
} = require('../controllers/consent_controller');

// Log user consent
router.post('/log', authenticated, logConsent);

// Get user consent status
router.get('/status', authenticated, getConsentStatus);

// Get all consents
router.get('/all', authenticated, getAllConsent);

module.exports = router;
