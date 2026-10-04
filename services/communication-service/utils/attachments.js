const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const bucket = process.env.S3_BUCKET_NAME || 'communication-attachments';
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE || 'true') === 'true',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
});

const safeFilename = (value) => String(value || 'piece-jointe').replace(/[\\/\r\n\0]/g, '_').slice(0, 180);
const upload = async (messageId, file) => {
  const key = `messages/${messageId}/${randomUUID()}`;
  await client.send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype || 'application/octet-stream',
    Metadata: { filename: Buffer.from(safeFilename(file.originalname), 'utf8').toString('base64url') },
  }));
  return key;
};
const download = (key) => client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
const remove = (key) => client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

module.exports = { upload, download, remove, safeFilename };
