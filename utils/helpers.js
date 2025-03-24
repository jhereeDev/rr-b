const { database } = require('../config/db_config');
const slugify = require('slugify');
const moment = require('moment');

// Return yes and no as boolean
const boolean = (value) => {
  // convert value to lowercase
  value = value.toLowerCase();
  return value === 'yes' ? true : false;
};

// Return true and false as 0 and 1
const booleanToNumber = (value) => {
  // convert value to lowercase
  value = value.toLowerCase();
  return value === 'true' ? 1 : 0;
};

// Return Pending if 1 and Approved if 0
const booleanToStatus = (value) => {
  return value === 1 ? 'pending' : 'approved';
};

// Generate alias for leaderboards
const generateAlias = async () => {
  const fiscalYear = generateFY();
  const [countResult] = await database('leaderboards').count('*', {
    as: 'total',
  });

  const count = countResult.total > 0 ? countResult.total + 1 : 1; // Default to 1 if table is empty
  const aliasNumber = count.toString().padStart(4, '0');

  return fiscalYear + '-' + aliasNumber;
};

/// Generate fiscal year
const generateFY = () => {
  const today = new Date();
  const currentYear = today.getFullYear();

  // Determine the fiscal year (October 2023 - September 2024 is FY24)
  const fiscalYear =
    today >= new Date(currentYear, 9, 1) // On or after Oct 1 of current year
      ? 'FY' + (currentYear - 1999) // Add 1 to get next FY
      : 'FY' + (currentYear - 2000);

  return fiscalYear;
};

// Get the current fiscal year and quarter
const getFiscalYearAndQuarter = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Determine fiscal year (starts in October)
  const fiscalYear = currentMonth >= 9 ? currentYear + 1 : currentYear;

  // Determine fiscal quarter
  const fiscalQuarter = Math.floor(((currentMonth - 9 + 12) % 12) / 3) + 1;

  return `FY${(fiscalYear - 2000)
    .toString()
    .padStart(2, '0')} Q${fiscalQuarter}`;
};

// Generate a slug from the first 10 characters of a string
const generateSlug = (string) => {
  if (!string || typeof string !== 'string') {
    return ''; // Return an empty string or some default value
  }

  const first10Chars = string.substring(0, 10); // Get first 10 characters
  const slug = slugify(first10Chars, {
    lower: true,
    strict: true,
    trim: true,
  });

  return slug;
};

// Capitalize the first letter of a string
const capitalize = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Fix date format using moment.js
const formattedDate = (date) => {
  return moment(date, 'MM/DD/YYYY').format('YYYY-MM-DD');
};

module.exports = {
  boolean,
  booleanToNumber,
  booleanToStatus,
  generateAlias,
  generateFY,
  getFiscalYearAndQuarter,
  generateSlug,
  capitalize,
  formattedDate,
};
