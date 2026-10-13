module.exports = {
  ...require('./auth/register.controller'),
  ...require('./auth/login.controller'),
  ...require('./auth/refreshToken.controller'),
  ...require('./auth/logout.controller'),
  ...require('./auth/forgotPassword.controller'),
  ...require('./auth/profile.controller'),
  ...require('./auth/revokeAllTokens.controller'),
};
