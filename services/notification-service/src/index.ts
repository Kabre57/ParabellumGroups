import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import notificationRoutes from './routes/notification.routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3007

app.use(cors())
app.use(express.json())

app.use('/api/notifications', notificationRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' })
})

app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`)
})
