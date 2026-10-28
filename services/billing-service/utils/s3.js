const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
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

async function uploadToS3(buffer, mimetype, prefix = 'quotes', enterpriseId) {
  if (!isS3Configured()) return null;
  const scopedEnterpriseId = Number(enterpriseId);
  if (!Number.isInteger(scopedEnterpriseId) || scopedEnterpriseId <= 0) {
    throw new Error('An enterprise is required to store a private file');
  }

  const ext = mimetype.split('/')[1] || 'bin';
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

async function getPrivateObjectBuffer(url, expectedEnterpriseId) {
  if (!isS3Configured() || typeof url !== 'string') {
    throw new Error('Private storage is not configured');
  }

  const parsedUrl = new URL(url, 'http://storage.local');
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  if (pathParts.length < 4 || pathParts[0] !== 'api' || pathParts[1] !== 'storage') {
    throw new Error('Private storage URL is invalid');
  }

  const bucket = decodeURIComponent(pathParts[2]);
  const enterpriseId = Number(parsedUrl.searchParams.get('enterpriseId'));
  const expectedId = Number(expectedEnterpriseId);
  if (
    bucket !== BUCKET ||
    !Number.isInteger(enterpriseId) ||
    enterpriseId <= 0 ||
    !Number.isInteger(expectedId) ||
    expectedId !== enterpriseId
  ) {
    throw new Error('Private storage URL has an invalid scope');
  }

  const key = pathParts.slice(3).map(decodeURIComponent).join('/');
  const object = await getS3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (Number(object.Metadata?.enterpriseid) !== enterpriseId) {
    object.Body?.destroy?.();
    throw new Error('Private storage object belongs to another enterprise');
  }

  const chunks = [];
  for await (const chunk of object.Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

module.exports = {
  uploadToS3,
  deleteFromS3,
  isS3Configured,
  getPrivateObjectBuffer,
};
