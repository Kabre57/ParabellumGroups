const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');

const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  credentials:
    process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
      : undefined,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    done(
      allowed.has(file.mimetype) ? null : new Error('Formats autorisés : PDF, JPG et PNG.'),
      allowed.has(file.mimetype)
    );
  },
});

const hasExpectedFileSignature = (file) => {
  if (file.mimetype === 'application/pdf') return file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (file.mimetype === 'image/png') return file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/jpeg') return file.buffer.length >= 3 && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  return false;
};

module.exports = {
  s3,
  upload,
  hasExpectedFileSignature,
  PutObjectCommand,
};
