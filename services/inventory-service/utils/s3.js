const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const crypto = require('crypto');

const BUCKET = process.env.S3_BUCKET_NAME;
const REGION = process.env.S3_REGION || 'us-east-1';
const ENDPOINT = process.env.S3_ENDPOINT;
const FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE !== 'false';

let client = null;

function getS3Client() {
  if (!client) {
    const config = {
      region: REGION,
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    };
    if (ENDPOINT) {
      config.endpoint = ENDPOINT;
      config.forcePathStyle = FORCE_PATH_STYLE;
    }
    client = new S3Client(config);
  }
  return client;
}

function isS3Configured() {
  return !!(BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

async function uploadToS3(buffer, mimetype, prefix = 'receptions', enterpriseId) {
  if (!isS3Configured()) return null;
  const scopedEnterpriseId = Number(enterpriseId);
  if (!Number.isInteger(scopedEnterpriseId) || scopedEnterpriseId <= 0) {
    throw new Error('An enterprise is required to store a private file');
  }

  const ext = mimetype.split('/')[1] || 'pdf';
  const key = `${prefix}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const s3 = getS3Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      Metadata: { enterpriseid: String(scopedEnterpriseId) },
    })
  );

  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `/api/storage/${encodeURIComponent(BUCKET)}/${encodedKey}?enterpriseId=${scopedEnterpriseId}`;
}

async function deleteFromS3(url) {
  if (!isS3Configured() || !url) return false;

  try {
    let key;
    if (url.includes(`/${BUCKET}/`)) {
      key = url.split(`/${BUCKET}/`)[1].split(/[?#]/)[0];
    } else if (url.includes('.amazonaws.com/')) {
      key = url.split('.amazonaws.com/')[1].split(/[?#]/)[0];
    } else {
      return false;
    }

    const s3 = getS3Client();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.error('S3 delete error:', err);
    return false;
  }
}

module.exports = {
  uploadToS3,
  deleteFromS3,
  isS3Configured,
};
