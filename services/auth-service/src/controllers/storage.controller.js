const { extractObjectKeyFromUrl, getObjectStreamFromS3, isS3Configured } = require('../utils/s3');

const normalizeRequestedKey = (rawPath) => {
  const normalizedPath = String(rawPath || '').replace(/^\/+/, '');
  if (!normalizedPath) return null;

  const configuredBucket = process.env.S3_BUCKET_NAME || 'parabellum-groups';
  if (normalizedPath.startsWith(`${configuredBucket}/`)) {
    return normalizedPath.slice(configuredBucket.length + 1);
  }

  return extractObjectKeyFromUrl(normalizedPath) || normalizedPath;
};

const serveStorageObject = async (req, res) => {
  if (!isS3Configured()) {
    return res.status(503).json({
      success: false,
      message: 'Storage service is not configured',
    });
  }

  try {
    const objectPath = req.params[0];
    const objectKey = normalizeRequestedKey(objectPath);

    if (!objectKey) {
      return res.status(400).json({
        success: false,
        message: 'Storage object key is required',
      });
    }

    const object = await getObjectStreamFromS3(objectKey);

    if (!object?.Body) {
      return res.status(404).json({
        success: false,
        message: 'Storage object not found',
      });
    }

    if (object.ContentType) {
      res.setHeader('Content-Type', object.ContentType);
    }

    if (object.ContentLength !== undefined) {
      res.setHeader('Content-Length', object.ContentLength.toString());
    }

    if (object.ETag) {
      res.setHeader('ETag', object.ETag);
    }

    res.setHeader('Cache-Control', 'public, max-age=300');

    object.Body.on('error', (streamError) => {
      console.error('Storage stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming storage object',
        });
      } else {
        res.destroy(streamError);
      }
    });

    object.Body.pipe(res);
  } catch (error) {
    const statusCode = error?.$metadata?.httpStatusCode;
    const errorName = error?.name || error?.Code;
    const notFound = statusCode === 404 || ['NoSuchKey', 'NoSuchBucket', 'NotFound'].includes(errorName);

    console.error('Serve storage object error:', error);

    return res.status(notFound ? 404 : 500).json({
      success: false,
      message: notFound ? 'Storage object not found' : 'Error retrieving storage object',
    });
  }
};

module.exports = {
  serveStorageObject,
};
