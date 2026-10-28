const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} = require('@aws-sdk/client-s3');
const crypto = require('crypto');

const BUCKET = process.env.S3_BUCKET_NAME;
const REGION = process.env.S3_REGION || 'us-east-1';
const ENDPOINT = process.env.S3_ENDPOINT;
const FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE !== 'false';

let client = null;
let bucketReadyPromise = null;

function getS3Client() {
  if (!client) {
    const config = {
      region: REGION,
      credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
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

async function ensureBucketExists() {
  if (!isS3Configured()) return false;

  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const s3 = getS3Client();

      try {
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
        return true;
      } catch (err) {
        const statusCode = err?.$metadata?.httpStatusCode;
        const errorName = err?.name || err?.Code;
        const bucketMissing = statusCode === 404 || ['NoSuchBucket', 'NotFound', 'NotFoundException'].includes(errorName);

        if (!bucketMissing) {
          throw err;
        }

        const createParams = { Bucket: BUCKET };
        if (!ENDPOINT && REGION !== 'us-east-1') {
          createParams.CreateBucketConfiguration = { LocationConstraint: REGION };
        }

        try {
          await s3.send(new CreateBucketCommand(createParams));
          return true;
        } catch (createErr) {
          const createErrorName = createErr?.name || createErr?.Code;
          if (['BucketAlreadyExists', 'BucketAlreadyOwnedByYou'].includes(createErrorName)) {
            return true;
          }
          throw createErr;
        }
      }
    })().catch((err) => {
      bucketReadyPromise = null;
      throw err;
    });
  }

  return bucketReadyPromise;
}

/**
 * Upload file buffer to S3
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @param {string} prefix - e.g. 'services'
 * @returns {Promise<string|null>} - Public URL or null if not configured
 */
async function uploadToS3(buffer, mimetype, prefix = 'services', enterpriseId) {
  if (!isS3Configured()) return null;
  const scopedEnterpriseId = Number(enterpriseId);
  if (!Number.isInteger(scopedEnterpriseId) || scopedEnterpriseId <= 0) {
    throw new Error('An enterprise is required to store a private file');
  }

  const ext = mimetype.split('/')[1] || 'jpg';
  const key = `${prefix}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const s3 = getS3Client();

  await ensureBucketExists();

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

/**
 * Delete file from S3 by URL
 * @param {string} url - Full S3 URL
 * @returns {Promise<boolean>}
 */
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

function extractObjectKeyFromUrl(url) {
  if (!url) return null;

  if (url.includes(`/${BUCKET}/`)) {
    return url.split(`/${BUCKET}/`)[1]?.split(/[?#]/)[0] || null;
  }

  if (url.includes('.amazonaws.com/')) {
    return url.split('.amazonaws.com/')[1]?.split(/[?#]/)[0] || null;
  }

  return null;
}

async function getObjectStreamFromS3(key, bucket = BUCKET) {
  if (!isS3Configured() || !key) return null;

  const s3 = getS3Client();
  return s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

module.exports = {
  uploadToS3,
  deleteFromS3,
  extractObjectKeyFromUrl,
  getObjectStreamFromS3,
  isS3Configured,
  ensureBucketExists,
};
