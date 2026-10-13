// Dépendances communes aux parcours de gestion des utilisateurs.
const { validationResult } = require('express-validator');
const prisma = require('../../config/database');
const { hashPassword } = require('../../utils/password');

module.exports = { validationResult, prisma, hashPassword };
