// Dépendances communes aux parcours de gestion des permissions.
const { validationResult } = require('express-validator');
const prisma = require('../../config/database');
const notification = require('../../services/notificationService');
const { getPermissionModules } = require('../../permissions');

module.exports = { validationResult, prisma, notification, getPermissionModules };
