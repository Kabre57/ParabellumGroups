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

async function uploadToS3(buffer, mimetype, prefix = 'quotes') {
  if (!isS3Configured()) return null;

  const ext = mimetype.split('/')[1] || 'bin';
  const key = `${prefix}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const s3 = getS3Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  const PUBLIC_ENDPOINT = process.env.S3_PUBLIC_ENDPOINT || ENDPOINT;

  let publicUrl = '';
  if (PUBLIC_ENDPOINT && !PUBLIC_ENDPOINT.includes('.amazonaws.com')) {
    const base = PUBLIC_ENDPOINT.endsWith('/') ? PUBLIC_ENDPOINT.slice(0, -1) : PUBLIC_ENDPOINT;
    publicUrl = `${base}/${BUCKET}/${key}`;
  } else {
    publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  }
  
  // Hack to ensure internal network URL doesn't leak to clients on production
  if (publicUrl.includes('minio:9000')) {
    publicUrl = publicUrl.replace('http://minio:9000', 'https://parabellum-erp.online/storage');
  }

  return publicUrl;
}

async function deleteFromS3(url) {
  if (!isS3Configured() || !url) return false;

  try {
    let key;
    if (url.includes(`/${BUCKET}/`)) {
      key = url.split(`/${BUCKET}/`)[1];
    } else if (url.includes('.amazonaws.com/')) {
      key = url.split('.amazonaws.com/')[1];
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
