const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');
const { fail } = require('./utils/helpers');
const { resolveActiveEnterprise } = require('./middleware/auth');
const { dispatchOutbox } = require('./utils/outbox');
const { createOperationalRequestRouter } = require('./routes/operationalRequest.routes');

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 4013);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ success: true, service: 'operational-request-service' }));
app.use('/api/operational-requests', createOperationalRequestRouter(prisma));

// #25 — Handler d'erreur Express typé.
// Multer LIMIT_FILE_SIZE → 413 (payload too large).
// Autres MulterError (ex. champ inattendu) → 400 avec message Multer.
// Erreurs de validation applicatives (statusCode fourni) → 400 avec leur message.
// Tout le reste → 500 générique, sans exposer error.message brut (CDC §13 : ne pas
// exposer les erreurs SQL ou les secrets).
app.use((error, _req, res, _next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return fail(res, 413, 'Le fichier dépasse la taille maximale autorisée (8 Mo).');
  }
  if (error?.name === 'MulterError') {
    return fail(res, 400, error.message || 'Erreur lors du traitement du fichier.');
  }
  if (error?.statusCode) {
    return fail(res, error.statusCode, error.message);
  }
  if (error?.message) {
    // Erreur applicative connue (ex. validation Express JSON) — message court, pas de stack.
    return fail(res, 400, error.message);
  }
  return fail(res, 500, 'Une erreur interne est survenue.');
});

app.use((_req, res) => fail(res, 404, 'Route non trouvée.'));

let outboxTimer;
if (require.main === module) {
  // #27 — fail-fast: JWT_SECRET requis pour signer les tokens inter-services (outbox).
  // Sans ce secret, dispatchOutbox lèverait une exception à chaque tick et réessaierait
  // indéfiniment sans jamais livrer — comportement silencieusement cassé.
  if (!process.env.JWT_SECRET) {
    console.error('[FATAL] JWT_SECRET manquant — arrêt du service operational-request-service.');
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`operational-request-service listening on ${PORT}`));
  outboxTimer = setInterval(
    () => dispatchOutbox(prisma).catch((error) => console.error('Operational request outbox failed:', error.message)),
    3000
  );
  outboxTimer.unref();
}

process.on('SIGTERM', async () => {
  if (outboxTimer) clearInterval(outboxTimer);
  await prisma.$disconnect();
});

module.exports = {
  app,
  prisma,
  dispatchOutbox: () => dispatchOutbox(prisma),
  resolveActiveEnterprise,
};
