const ErrorResponse = require('../utils/error_response');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message || 'Server Error';

  // Log the error
  console.error(err);

  // Differentiate between operational and programming errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new ErrorResponse(message, 400);
  }

  // Customize error response format
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

module.exports = errorHandler;
