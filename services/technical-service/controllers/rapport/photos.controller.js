// Depot et suppression des photos de rapport.
const { prisma, VALID_STATUSES } = require('./shared');
const { uploadBuffer, deleteObject, MINIO_BUCKET } = require('../../utils/s3');

/**
 * Upload des photos liées à un rapport
 */
exports.uploadPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier reçu'
      });
    }

    const rapport = await prisma.rapport.findUnique({ where: { id } });
    if (!rapport) {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }

    const publicBaseUrl = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';
    const uploadedUrls = [];

    for (const file of files) {
      const safeName = (file.originalname || 'photo')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(-120);
      const key = `rapports/${id}/${Date.now()}-${safeName}`;

      await uploadBuffer({
        key,
        buffer: file.buffer,
        contentType: file.mimetype,
      });

      uploadedUrls.push(`${publicBaseUrl}/${process.env.MINIO_BUCKET || 'rapport-photos'}/${key}`);
    }

    const updated = await prisma.rapport.update({
      where: { id },
      data: {
        photos: {
          push: uploadedUrls
        }
      }
    });

    res.json({
      success: true,
      message: 'Photos uploadées avec succès',
      data: { photos: updated.photos }
    });
  } catch (error) {
    console.error('Error in uploadPhotos rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload des photos'
    });
  }
};

/**
 * Supprime une photo d'un rapport
 */
exports.deletePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body || {};

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL de la photo manquante'
      });
    }

    const rapport = await prisma.rapport.findUnique({ where: { id } });
    if (!rapport) {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }

    const bucket = process.env.MINIO_BUCKET || MINIO_BUCKET || 'rapport-photos';
    const marker = `/${bucket}/`;
    const index = url.indexOf(marker);
    const key = index >= 0 ? url.slice(index + marker.length) : null;

    if (key) {
      await deleteObject({ key });
    }

    const nextPhotos = (rapport.photos || []).filter((photoUrl) => photoUrl !== url);
    const updated = await prisma.rapport.update({
      where: { id },
      data: { photos: { set: nextPhotos } }
    });

    res.json({
      success: true,
      message: 'Photo supprimée avec succès',
      data: { photos: updated.photos }
    });
  } catch (error) {
    console.error('Error in deletePhoto rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la photo'
    });
  }
};
