const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const {
  MINIO_ENDPOINT = 'minio',
  MINIO_PORT = '9000',
  MINIO_ACCESS_KEY = 'replace-with-your-minio-access-key',
  MINIO_SECRET_KEY = 'replace-with-your-minio-secret-key',
  MINIO_USE_SSL = 'false',
  MINIO_BUCKET = 'rapport-photos',
} = process.env;

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: `${MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${MINIO_ENDPOINT}:${MINIO_PORT}`,
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

async function uploadBuffer({ key, buffer, contentType, enterpriseId }) {
  const scopedEnterpriseId = Number(enterpriseId);
  if (!Number.isInteger(scopedEnterpriseId) || scopedEnterpriseId <= 0) {
    throw new Error('An enterprise is required to store a private file');
  }
  const command = new PutObjectCommand({
    Bucket: MINIO_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: { enterpriseid: String(scopedEnterpriseId) },
  });
  await s3Client.send(command);
}

async function getObjectStream({ key }) {
  return s3Client.send(new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
}

async function deleteObject({ key }) {
  const command = new DeleteObjectCommand({
    Bucket: MINIO_BUCKET,
    Key: key,
  });
  await s3Client.send(command);
}

module.exports = {
  s3Client,
  uploadBuffer,
  deleteObject,
  getObjectStream,
  MINIO_BUCKET,
};
