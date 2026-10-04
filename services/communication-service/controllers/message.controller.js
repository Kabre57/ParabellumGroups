const { PrismaClient } = require('@prisma/client');
const emailSender = require('../utils/emailSender');
const emitter = require('../emitter');
const attachments = require('../utils/attachments');
const prisma = new PrismaClient();

const MESSAGE_TYPES = new Set(['EMAIL', 'SMS', 'NOTIFICATION']);
const identity = (req) => {
  const user = req.user || {};
  return [user.userId, user.id, user.email].filter(Boolean).map((value) => String(value).trim());
};
const participantFilter = (req) => ({ OR: [
  { expediteurId: { in: identity(req) } },
  { destinataireId: { in: identity(req) } },
] });
const findOwnedMessage = (req, id) => prisma.message.findFirst({ where: { id, ...participantFilter(req) } });
const forbiddenOrMissing = (res) => res.status(404).json({ error: 'Message introuvable ou accès non autorisé' });
const emitMessageUpdate = (message) => {
  for (const destinataireId of new Set([message.expediteurId, message.destinataireId])) emitter.emit('message', { destinataireId, message });
};

const messageController = {
  async create(req, res) {
    try {
      const expediteurId = String(req.user?.userId || req.user?.id || req.user?.email || '').trim();
      const destinataireId = String(req.body?.destinataireId || '').trim();
      const sujet = String(req.body?.sujet || '').trim();
      const contenu = String(req.body?.contenu || '').trim();
      const type = String(req.body?.type || 'NOTIFICATION').toUpperCase();
      if (!expediteurId || !destinataireId || !sujet || !contenu) return res.status(400).json({ error: 'Destinataire, sujet et contenu sont requis' });
      if (!MESSAGE_TYPES.has(type)) return res.status(400).json({ error: 'Type de message invalide' });
      const message = await prisma.message.create({ data: { expediteurId, destinataireId, sujet, contenu, type } });
      emitMessageUpdate(message);
      res.status(201).json(message);
    } catch (error) { console.error('Erreur création message:', error); res.status(500).json({ error: 'Impossible de créer le message' }); }
  },

  async getAll(req, res) {
    try {
      const ids = identity(req);
      if (!ids.length) return res.status(401).json({ error: 'Utilisateur non identifié' });
      const participant = { OR: [{ expediteurId: { in: ids } }, { destinataireId: { in: ids } }] };
      const filters = [];
      if (req.query.expediteurId) filters.push({ expediteurId: String(req.query.expediteurId) });
      if (req.query.destinataireId) filters.push({ destinataireId: String(req.query.destinataireId) });
      if (req.query.type) filters.push({ type: String(req.query.type).toUpperCase() });
      if (req.query.status) filters.push({ status: String(req.query.status).toUpperCase() });
      const messages = await prisma.message.findMany({ where: { AND: [participant, ...filters] }, orderBy: { createdAt: 'desc' } });
      res.json(messages);
    } catch (error) { res.status(500).json({ error: 'Impossible de charger les messages' }); }
  },

  async getById(req, res) {
    try { const message = await findOwnedMessage(req, req.params.id); return message ? res.json(message) : forbiddenOrMissing(res); }
    catch { res.status(500).json({ error: 'Impossible de charger le message' }); }
  },

  async update(req, res) {
    try {
      const message = await findOwnedMessage(req, req.params.id);
      if (!message) return forbiddenOrMissing(res);
      if (message.expediteurId !== String(req.user?.userId || req.user?.id || req.user?.email || '') || message.status !== 'BROUILLON') return res.status(403).json({ error: 'Seul l’expéditeur peut modifier son brouillon' });
      const data = {};
      for (const field of ['sujet', 'contenu']) if (req.body[field] !== undefined) data[field] = String(req.body[field]).trim();
      const updated = await prisma.message.update({ where: { id: message.id }, data });
      res.json(updated);
    } catch { res.status(500).json({ error: 'Impossible de modifier le message' }); }
  },

  async delete(req, res) {
    try {
      const message = await findOwnedMessage(req, req.params.id);
      if (!message) return forbiddenOrMissing(res);
      if (message.expediteurId !== String(req.user?.userId || req.user?.id || req.user?.email || '') || message.status !== 'BROUILLON') return res.status(403).json({ error: 'Seul l’expéditeur peut supprimer son brouillon' });
      await prisma.message.delete({ where: { id: message.id } });
      await Promise.allSettled((message.pieceJointe || []).map((key) => attachments.remove(key)));
      res.status(204).send();
    } catch { res.status(500).json({ error: 'Impossible de supprimer le message' }); }
  },

  async uploadAttachments(req, res) {
    const uploadedKeys = [];
    try {
      const message = await findOwnedMessage(req, req.params.id);
      const actorId = String(req.user?.userId || req.user?.id || req.user?.email || '');
      if (!message) return forbiddenOrMissing(res);
      if (message.expediteurId !== actorId || message.status !== 'BROUILLON') return res.status(403).json({ error: 'Seul l’expéditeur peut joindre des fichiers à son brouillon' });
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ error: 'Sélectionnez au moins un fichier' });
      if ((message.pieceJointe || []).length + files.length > 5) return res.status(400).json({ error: 'Un message peut contenir au maximum cinq pièces jointes' });
      for (const file of files) uploadedKeys.push(await attachments.upload(message.id, file));
      const updated = await prisma.message.update({ where: { id: message.id }, data: { pieceJointe: [...(message.pieceJointe || []), ...uploadedKeys] } });
      res.status(201).json({ message: updated, attachments: uploadedKeys });
    } catch (error) {
      await Promise.allSettled(uploadedKeys.map((key) => attachments.remove(key)));
      console.error('Erreur téléversement des pièces jointes:', error);
      res.status(500).json({ error: 'Impossible de téléverser les pièces jointes' });
    }
  },

  async downloadAttachment(req, res) {
    try {
      const message = await findOwnedMessage(req, req.params.id);
      if (!message) return forbiddenOrMissing(res);
      const key = String(req.query.key || '');
      if (!key || !(message.pieceJointe || []).includes(key) || !key.startsWith(`messages/${message.id}/`)) return res.status(404).json({ error: 'Pièce jointe introuvable' });
      const object = await attachments.download(key);
      const encodedName = object.Metadata?.filename;
      let filename = 'piece-jointe';
      try { if (encodedName) filename = Buffer.from(encodedName, 'base64url').toString('utf8'); } catch { /* Nom facultatif. */ }
      res.setHeader('Content-Type', object.ContentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachments.safeFilename(filename))}`);
      if (object.ContentLength != null) res.setHeader('Content-Length', object.ContentLength);
      object.Body.pipe(res);
    } catch (error) {
      console.error('Erreur téléchargement pièce jointe:', error);
      res.status(500).json({ error: 'Impossible de télécharger la pièce jointe' });
    }
  },

  async send(req, res) {
    try {
      const message = await findOwnedMessage(req, req.params.id);
      if (!message) return forbiddenOrMissing(res);
      if (message.expediteurId !== String(req.user?.userId || req.user?.id || req.user?.email || '') || message.status !== 'BROUILLON') return res.status(403).json({ error: 'Seul l’expéditeur peut envoyer son brouillon' });
      if (message.type === 'EMAIL') {
        const emailAttachments = await Promise.all((message.pieceJointe || []).map(async (key) => {
          const file = await attachments.download(key);
          const filename = file.Metadata?.filename ? Buffer.from(file.Metadata.filename, 'base64url').toString('utf8') : 'piece-jointe';
          return { filename, content: Buffer.from(await file.Body.transformToByteArray()) };
        }));
        await emailSender.sendEmail({ to: message.destinataireId, subject: message.sujet, text: message.contenu, attachments: emailAttachments });
      }
      const updatedMessage = await prisma.message.update({ where: { id: message.id }, data: { status: 'ENVOYE', dateEnvoi: new Date() } });
      emitMessageUpdate(updatedMessage);
      res.json(updatedMessage);
    } catch (error) { console.error('Erreur envoi message:', error); res.status(500).json({ error: 'Impossible d’envoyer le message' }); }
  },

  async markAsRead(req, res) {
    try {
      const ids = identity(req);
      const message = await prisma.message.findFirst({ where: { id: req.params.id, destinataireId: { in: ids } } });
      if (!message) return forbiddenOrMissing(res);
      const updated = await prisma.message.update({ where: { id: message.id }, data: { status: 'LU', dateLu: new Date() } });
      emitMessageUpdate(updated);
      res.json(updated);
    } catch { res.status(500).json({ error: 'Impossible de marquer le message comme lu' }); }
  },

  async archive(req, res) {
    try {
      const message = await findOwnedMessage(req, req.params.id);
      if (!message) return forbiddenOrMissing(res);
      const updated = await prisma.message.update({ where: { id: message.id }, data: { status: 'ARCHIVE' } });
      emitMessageUpdate(updated);
      res.json(updated);
    } catch { res.status(500).json({ error: 'Impossible d’archiver le message' }); }
  },

  async stream(req, res) {
    const ids = identity(req);
    if (!ids.length) return res.status(401).json({ error: 'Utilisateur non identifié' });
    res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders();
    const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
    send({ type: 'CONNECTED' });
    const handler = ({ destinataireId, message }) => {
      if (ids.includes(String(destinataireId))) send({ type: 'MESSAGE', data: message });
    };
    emitter.on('message', handler);
    const heartbeat = setInterval(() => send({ type: 'PING', ts: Date.now() }), 15000);
    req.on('close', () => { clearInterval(heartbeat); emitter.off('message', handler); res.end(); });
  },
};

module.exports = messageController;
