const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const auth = require('../middleware/auth');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, callback) => {
    const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    callback(allowed.has(file.mimetype) ? null : new Error('Type de fichier non autorisé'), allowed.has(file.mimetype));
  },
});
const receiveAttachments = (req, res, next) => upload.array('files', 5)(req, res, (error) => {
  if (!error) return next();
  const status = error instanceof multer.MulterError ? 413 : 400;
  return res.status(status).json({ error: error.message || 'Fichier joint invalide' });
});

const requirePermission = (required) => (req, res, next) => {
  const user = req.user || {};
  const role = String(user.role || user.roleCode || '').toLowerCase();
  if (['admin', 'administrator', 'administrateur'].includes(role)) return next();
  const permissions = new Set((Array.isArray(user.permissions) ? user.permissions : []).map((value) => String(value).toLowerCase()));
  if (permissions.has(required) || (required === 'messages.read' && permissions.has('messages.view'))) return next();
  return res.status(403).json({ error: 'Permission insuffisante', requiredPermission: required });
};

// Les chemins fixes doivent précéder les routes paramétrées par :id.
router.get('/stream', auth, requirePermission('messages.read'), messageController.stream);
router.get('/:id/attachments/download', auth, requirePermission('messages.read'), messageController.downloadAttachment);
router.post('/:id/attachments', auth, requirePermission('messages.send'), receiveAttachments, messageController.uploadAttachments);
router.post('/', auth, requirePermission('messages.send'), messageController.create);
router.get('/', auth, requirePermission('messages.read'), messageController.getAll);
router.get('/:id', auth, requirePermission('messages.read'), messageController.getById);
router.put('/:id', auth, requirePermission('messages.send'), messageController.update);
router.delete('/:id', auth, requirePermission('messages.delete'), messageController.delete);
router.post('/:id/send', auth, requirePermission('messages.send'), messageController.send);
router.put('/:id/read', auth, requirePermission('messages.read'), messageController.markAsRead);
router.put('/:id/archive', auth, requirePermission('messages.read'), messageController.archive);

module.exports = router;
