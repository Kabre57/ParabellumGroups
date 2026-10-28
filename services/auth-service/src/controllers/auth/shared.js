// Dépendances communes aux gestionnaires des parcours d’authentification.
const { validationResult } = require('express-validator');
const prisma = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/password');
const { generateAccessToken, generateRefreshToken, getRefreshTokenExpiresAt, verifyRefreshToken } = require('../../utils/jwt');
const { setStorageAccessCookie, clearStorageAccessCookie } = require('../../utils/storageAccessCookie');
const { getUserPermissionNames } = require('../../utils/permissions');

module.exports = {
  validationResult,
  prisma,
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiresAt,
  verifyRefreshToken,
  setStorageAccessCookie,
  clearStorageAccessCookie,
  getUserPermissionNames,
};
