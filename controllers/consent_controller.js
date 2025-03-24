const ConsentService = require('../classes/Consent');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/error_response');

const logConsent = asyncHandler(async (req, res) => {
  try {
    const { member_employee_id } = req.userData;
    const consentData = {
      internal_publication_consent: req.body.internal_publication_consent,
      personal_data_consent: req.body.personal_data_consent,
      rewards_management_consent: req.body.rewards_management_consent,
    };

    await ConsentService.logConsent(member_employee_id, consentData);

    res.status(200).json({
      success: true,
      message: 'Consent logged successfully',
    });
  } catch (error) {
    console.error('Error in ConsentController.logConsent:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging consent',
      error: error.message,
    });
  }
});
const getConsentStatus = asyncHandler(async (req, res, next) => {
  try {
    const { member_employee_id } = req.userData;
    const consentStatus = await ConsentService.getConsentStatus(
      member_employee_id
    );

    if (!consentStatus) {
      return next(new ErrorResponse('Error logging consent', 400));
    }

    res.status(200).json({
      success: true,
      data: consentStatus,
    });
  } catch (error) {
    console.error('Error in ConsentController.getConsentStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching consent status',
      error: error.message,
    });
  }
});

const getAllConsent = asyncHandler(async (req, res) => {
  const consents = await ConsentService.getAllConsent();

  res.status(200).json({
    success: true,
    data: consents,
  });
});

module.exports = {
  logConsent,
  getConsentStatus,
  getAllConsent,
};
