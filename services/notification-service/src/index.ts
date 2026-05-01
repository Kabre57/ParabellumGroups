import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import notificationRoutes from './routes/notification.routes'

dotenv.config()

const recoverableNetworkCodes = new Set(['ENETUNREACH', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'ECONNREFUSED']);

const isRecoverableNetworkError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return Boolean(code && recoverableNetworkCodes.has(code));
};

process.on('uncaughtException', (error) => {
  if (isRecoverableNetworkError(error)) {
    console.error('Recoverable network error in notification-service:', error.message);
    return;
  }

  console.error('Uncaught exception in notification-service:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  if (isRecoverableNetworkError(reason)) {
    console.error('Recoverable async network error in notification-service:', reason);
    return;
  }

  console.error('Unhandled rejection in notification-service:', reason);
});

const app = express()
const PORT = process.env.PORT || 4012

app.use(cors())
app.use(express.json())

app.use('/api/notifications', notificationRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' })
})

app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`)
})
