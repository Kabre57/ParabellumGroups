const { getObjectStreamFromS3, isS3Configured } = require('../utils/s3');
const prisma = require('../config/database');

const getStorageTarget = (rawPath) => {
  const normalizedPath = String(rawPath || '').replace(/^\/+/, '');
  const separator = normalizedPath.indexOf('/');
  if (separator < 1 || separator === normalizedPath.length - 1) return null;

  const bucket = normalizedPath.slice(0, separator);
  const key = normalizedPath.slice(separator + 1);
  const configuredBucket = process.env.S3_BUCKET_NAME || 'parabellum-groups';
  const allowedBuckets = new Set([
    configuredBucket,
    ...(process.env.STORAGE_ALLOWED_BUCKETS || 'rapport-photos')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ]);

  return allowedBuckets.has(bucket) ? { bucket, key } : null;
};

const parsePositiveId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const isGlobalAdmin = (user) => {
  const role = typeof user?.role === 'string' ? user.role : user?.role?.code || user?.role?.name;
  if (
    new Set(['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPER_ADMIN', 'SUPERADMIN']).has(
      String(role || '').trim().toUpperCase()
    )
  ) {
    return true;
  }
  const permissions = Array.isArray(user?.permissions)
    ? user.permissions
    : Array.isArray(user?.permissionsList)
      ? user.permissionsList
      : [];
  return permissions.some((p) => {
    const normalized = String(p || '').trim().toLowerCase();
    return normalized === '*' || normalized === 'enterprises.read_all' || normalized === 'enterprises.read';
  });
};

const isEnterpriseInUserScope = async (enterpriseId, userEnterpriseId) => {
  if (!enterpriseId || !userEnterpriseId) return false;
  const visited = new Set();
  let currentId = enterpriseId;

  while (currentId && !visited.has(currentId)) {
    if (currentId === userEnterpriseId) return true;
    visited.add(currentId);
    const current = await prisma.enterprise.findUnique({
      where: { id: currentId },
      select: { parentEnterpriseId: true },
    });
    currentId = current?.parentEnterpriseId || null;
  }

  return false;
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
    const target = getStorageTarget(objectPath);

    if (!target) {
      return res.status(400).json({
        success: false,
        message: 'Storage bucket or object key is invalid',
      });
    }

    const object = await getObjectStreamFromS3(target.key, target.bucket);

    if (!object?.Body) {
      return res.status(404).json({
        success: false,
        message: 'Storage object not found',
      });
    }

    const metadataEnterpriseId = parsePositiveId(object.Metadata?.enterpriseid);
    const requestedEnterpriseId = parsePositiveId(req.query?.enterpriseId);
    const isAdmin = isGlobalAdmin(req.user);
    const isEnterpriseAsset = target.key.startsWith('enterprises/');

    let inferredEnterpriseId = metadataEnterpriseId || requestedEnterpriseId;
    if (!inferredEnterpriseId && isEnterpriseAsset) {
      const matchedEnterprise = await prisma.enterprise.findFirst({
        where: { logoUrl: { contains: target.key } },
        select: { id: true },
      });
      inferredEnterpriseId = parsePositiveId(matchedEnterprise?.id);
    }

    const ownerEnterpriseId = metadataEnterpriseId || (isAdmin || isEnterpriseAsset ? inferredEnterpriseId : null);
    const requestedOwnerMatches =
      !requestedEnterpriseId || !metadataEnterpriseId || requestedEnterpriseId === metadataEnterpriseId;
    const effectiveEnterpriseId = metadataEnterpriseId || inferredEnterpriseId;
    const authorized = isAdmin
      ? requestedOwnerMatches
      : Boolean(
          effectiveEnterpriseId &&
            requestedOwnerMatches &&
            (isEnterpriseAsset || requestedEnterpriseId === effectiveEnterpriseId) &&
            (await isEnterpriseInUserScope(effectiveEnterpriseId, parsePositiveId(req.user?.enterpriseId)))
        );

    if (!authorized || (ownerEnterpriseId && !(await prisma.enterprise.findUnique({
      where: { id: ownerEnterpriseId },
      select: { id: true },
    })))) {
      object.Body.destroy?.();
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

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');

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
