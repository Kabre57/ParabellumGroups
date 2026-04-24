// simple notification helper - in real world replace with email/Slack etc.
const prisma = require('../config/database');

const logger = {
  info: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
};

let WebClient;
try {
  ({ WebClient } = require('@slack/web-api'));
} catch (_error) {
  WebClient = null;
}

// Initialize Slack client if token is available
const slackClient = process.env.SLACK_BOT_TOKEN && WebClient
  ? new WebClient(process.env.SLACK_BOT_TOKEN)
  : null;

async function notifyUser(userId, message) {
  // stub: write to console or insert into notifications table if exists
  console.log(`Notify user ${userId}: ${message}`);
}

async function notifyAdmins(message) {
  // look up all admins or a fixed list
  const admins = await prisma.user.findMany({ where: { role: { code: 'ADMIN' }, isActive: true }, select: { id: true, email: true } });
  for (const a of admins) {
    console.log(`Notify admin ${a.email}: ${message}`);
  }
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(message) {
  if (!slackClient) {
    throw new Error('Slack client not configured. Please set SLACK_BOT_TOKEN environment variable.');
  }

  try {
    const channel = process.env.SLACK_NOTIFICATION_CHANNEL || '#general';

    await slackClient.chat.postMessage({
      channel,
      text: message,
      username: 'Parabellum Groups Bot',
      icon_emoji: ':shield:',
    });

    logger.info(`Slack notification sent to ${channel}`);
  } catch (error) {
    logger.error('Failed to send Slack notification:', error);
    throw error;
  }
}

module.exports = { notifyUser, notifyAdmins, sendSlackNotification };
