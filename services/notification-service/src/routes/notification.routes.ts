import { Router } from 'express'
import {
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller'

const router = Router()

router.post('/send', sendNotification)
router.get('/user/:userId', getUserNotifications)
router.put('/:id/read', markAsRead)
router.put('/user/:userId/read-all', markAllAsRead)

export default router
