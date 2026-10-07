const express = require('express');
const multer = require('multer');
const accountController = require('../controllers/account.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const name = String(file.originalname || '').toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return callback(null, true);
    }
    return callback(new Error('Utilisez un fichier Excel .xlsx ou .xls.'));
  },
});

const receiveExcelFile = (req, res, next) => {
  excelUpload.single('file')(req, res, (error) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      success: false,
      message: error.code === 'LIMIT_FILE_SIZE'
        ? 'Le fichier Excel ne doit pas dépasser 5 Mo.'
        : error.message || 'Fichier Excel invalide.',
    });
  });
};

router.use(authenticateToken);

router.get('/template', accountController.downloadAccountingAccountImportTemplate);
router.post('/import/preview', receiveExcelFile, accountController.previewAccountingAccountImport);
router.post('/import', receiveExcelFile, accountController.importAccountingAccounts);
router.get('/', accountController.getAllAccounts);
router.post('/', accountController.createAccount);
router.patch('/:id', accountController.updateAccount);
router.delete('/:id', accountController.deleteAccount);

module.exports = router;
