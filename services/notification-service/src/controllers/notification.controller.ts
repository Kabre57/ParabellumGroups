import { Request, Response } from 'express'
import prisma from '../prisma'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { userId, type, title, message, email } = req.body

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
      },
    })

    if (email) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@delices-afro-caraibe.com',
          to: email,
          subject: title,
          html: `
            <h2>${title}</h2>
            <p>${message}</p>
          `,
        })
      } catch (emailError) {
        console.error('Email sending error:', emailError)
      }
    }

    res.status(201).json(notification)
  } catch (error) {
    console.error('Send notification error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const { isRead } = req.query

    const where: any = { userId }
    if (isRead !== undefined) {
      where.isRead = isRead === 'true'
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        sentAt: 'desc',
      },
    })

    res.json(notifications)
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

    res.json(notification)
  } catch (error) {
    console.error('Mark as read error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })

    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Mark all as read error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
