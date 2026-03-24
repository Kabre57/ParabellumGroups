const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const auth = require('../middleware/auth');
const emitter = require('../emitter');

router.post('/', auth, messageController.create);
router.get('/', auth, messageController.getAll);
router.get('/:id', auth, messageController.getById);
router.put('/:id', auth, messageController.update);
router.delete('/:id', auth, messageController.delete);
router.post('/:id/send', auth, messageController.send);
router.put('/:id/read', auth, messageController.markAsRead);
router.put('/:id/archive', auth, messageController.archive);

// SSE stream for messages (per destinataireId)
router.get('/stream', auth, (req, res) => {
  const destinataireId = req.query.destinataireId || req.user?.id || req.user?.userId;
  if (!destinataireId) {
    return res.status(400).json({ error: 'destinataireId requis' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
  send({ type: 'CONNECTED' });

  const handler = ({ destinataireId: targetId, message }) => {
    if (String(targetId) === String(destinataireId)) {
      send({ type: 'MESSAGE', data: message });
    }
  };

  emitter.on('message', handler);
  const heartbeat = setInterval(() => send({ type: 'PING', ts: Date.now() }), 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    emitter.off('message', handler);
    res.end();
  });
});

module.exports = router;
