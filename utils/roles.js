/*
  SUPER_ADMIN = 1,
  ADMIN = 2,
  VP, PRESIDENT, EVP, SVP, VPCO, SVPCO, SVPCD = 3,
  DIRECTOR = 4,
  MANAGER = 5,
  MEMBER = 6,
*/

const setRole = (title) => {
  const normalizedTitle = title.toUpperCase().trim();

  if (
    normalizedTitle.startsWith('SENIOR VP') ||
    normalizedTitle.startsWith('SVP') ||
    normalizedTitle.startsWith('VP') ||
    normalizedTitle.startsWith('SVPCD') ||
    normalizedTitle.startsWith('VPCO') ||
    normalizedTitle.startsWith('SVPCO') ||
    normalizedTitle.startsWith('EVP') ||
    normalizedTitle.startsWith('PRESIDENT')
  ) {
    return 3; // VP, SVP, SVPCD, VPCO, SVPCO
  } else if (normalizedTitle.startsWith('DIRECTOR')) {
    return 4; // DIRECTOR
  } else if (normalizedTitle.startsWith('MANAGER')) {
    return 5; // MANAGER
  } else {
    return 6; // MEMBER (default)
  }
};

module.exports = { setRole };
