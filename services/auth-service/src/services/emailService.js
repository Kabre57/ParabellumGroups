/**
 * Email Service - Send notifications for permission changes
 * Uses Nodemailer for SMTP integration
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Initialize transporter based on environment
    this.transporter = this.initializeTransporter();
    this.sender = process.env.EMAIL_FROM || 'noreply@parabellum.local';
  }

  initializeTransporter() {
    // Support multiple SMTP providers
    if (process.env.EMAIL_PROVIDER === 'sendgrid') {
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    }

    if (process.env.EMAIL_PROVIDER === 'gmail') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD,
        },
      });
    }

    // Default: Local SMTP server (e.g., Mailhog, Mailtrap, or custom SMTP)
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 1025,
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      } : undefined,
      // Skip TLS in development
      tls: { rejectUnauthorized: false },
    });
  }

  /**
   * Send role change request notification to user
   */
  async notifyRoleChangeRequest(user, roleTemplate, reason) {
    try {
      const subject = `🔐 Nouvelle demande de modification de rôle - ${roleTemplate}`;
      const html = this.generateRequestNotificationHTML({
        userName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur',
        roleTemplate,
        reason,
      });

      await this.transporter.sendMail({
        from: this.sender,
        to: user.email,
        subject,
        html,
      });

      console.log(`Email sent to ${user.email} for role change request`);
    } catch (error) {
      console.error(`Failed to send email to ${user.email}:`, error);
      // Don't throw error - notifications should not block workflow
    }
  }

  /**
   * Send permission change approval notification
   */
  async notifyPermissionApproved(user, permissionDetails, approvedBy) {
    try {
      const subject = `✅ Votre demande de permissions a été approuvée`;
      const html = this.generateApprovalNotificationHTML({
        userName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur',
        permissions: permissionDetails,
        approvedBy,
        approvedAt: new Date().toLocaleString('fr-FR'),
      });

      await this.transporter.sendMail({
        from: this.sender,
        to: user.email,
        subject,
        html,
      });

      console.log(`Approval notification sent to ${user.email}`);
    } catch (error) {
      console.error(`Failed to send approval notification to ${user.email}:`, error);
    }
  }

  /**
   * Send permission change rejection notification
   */
  async notifyPermissionRejected(user, reason, rejectedBy) {
    try {
      const subject = `❌ Votre demande de permissions a été rejetée`;
      const html = this.generateRejectionNotificationHTML({
        userName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur',
        reason,
        rejectedBy,
        rejectedAt: new Date().toLocaleString('fr-FR'),
      });

      await this.transporter.sendMail({
        from: this.sender,
        to: user.email,
        subject,
        html,
      });

      console.log(`Rejection notification sent to ${user.email}`);
    } catch (error) {
      console.error(`Failed to send rejection notification to ${user.email}:`, error);
    }
  }

  /**
   * Send admin notification about pending approvals
   */
  async notifyAdminsPendingApproval(adminEmails, requestDetails) {
    try {
      const subject = `[ADMIN] 📋 Nouvelle demande d'approbation en attente`;
      const html = this.generateAdminNotificationHTML({
        requestDetails,
      });

      await this.transporter.sendMail({
        from: this.sender,
        to: adminEmails.join(','),
        subject,
        html,
      });

      console.log(`Admin notification sent to ${adminEmails.length} admins`);
    } catch (error) {
      console.error('Failed to send admin notification:', error);
    }
  }

  /**
   * Generate HTML template for request creation
   */
  generateRequestNotificationHTML({ userName, roleTemplate, reason }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h1 style="color: #2d3748; margin-top: 0;">Notification de Demande de Changement</h1>
          
          <p>Bonjour <strong>${userName}</strong>,</p>
          
          <p>Votre demande de modification de rôle a été créée avec succès.</p>
          
          <div style="background-color: #e6f3ff; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
            <p><strong>Détails de la demande:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Type de rôle:</strong> ${roleTemplate}</li>
              <li><strong>Raison:</strong> ${reason || 'Non spécifiée'}</li>
              <li><strong>Statut:</strong> En attente d'approbation</li>
            </ul>
          </div>
          
          <p style="color: #666;">Un administrateur examinera votre demande dans les 24-48 heures.</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Generate HTML template for approval
   */
  generateApprovalNotificationHTML({ userName, permissions, approvedBy, approvedAt }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h1 style="color: #22863a; margin-top: 0;">✅ Demande Approuvée</h1>
          
          <p>Bonjour <strong>${userName}</strong>,</p>
          
          <p>Votre demande de modification de permissions a été <strong style="color: #22863a;">approuvée</strong>.</p>
          
          <div style="background-color: #f0f8f1; padding: 15px; border-left: 4px solid #22863a; margin: 20px 0;">
            <p><strong>Permissions accordées:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${Object.entries(permissions || {})
                .map(([key, value]) => `<li>${key}: ${value ? '✅' : '❌'}</li>`)
                .join('')}
            </ul>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Approuvé par:</strong> ${approvedBy}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${approvedAt}</p>
          </div>
          
          <p style="color: #666;">Vous devrez vous reconnecter pour que les modifications prennent effet.</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Generate HTML template for rejection
   */
  generateRejectionNotificationHTML({ userName, reason, rejectedBy, rejectedAt }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h1 style="color: #cb2431; margin-top: 0;">❌ Demande Rejetée</h1>
          
          <p>Bonjour <strong>${userName}</strong>,</p>
          
          <p>Votre demande de modification de permissions a été <strong style="color: #cb2431;">rejetée</strong>.</p>
          
          <div style="background-color: #fde3e3; padding: 15px; border-left: 4px solid #cb2431; margin: 20px 0;">
            <p><strong>Raison:</strong></p>
            <p style="margin: 10px 0;">${reason || 'Aucune raison spécifiée'}</p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Rejeté par:</strong> ${rejectedBy}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${rejectedAt}</p>
          </div>
          
          <p style="color: #666;">Si vous avez des questions, veuillez contacter votre administrateur.</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Generate HTML template for admin notifications
   */
  generateAdminNotificationHTML({ requestDetails }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h1 style="color: #d73a49; margin-top: 0;">📋 Demande d'Approbation en Attente</h1>
          
          <p><strong>Une nouvelle demande nécessite votre approbation.</strong></p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p><strong>Détails de la demande:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Demandeur:</strong> ${requestDetails.requesterName || 'N/A'}</li>
              <li><strong>Rôle demandé:</strong> ${requestDetails.roleName || 'N/A'}</li>
              <li><strong>Raison:</strong> ${requestDetails.reason || 'Non spécifiée'}</li>
              <li><strong>Date de demande:</strong> ${new Date(requestDetails.createdAt).toLocaleString('fr-FR')}</li>
            </ul>
          </div>
          
          <div style="margin: 20px 0;">
            <a href="${process.env.ADMIN_DASHBOARD_URL || 'http://localhost:8080'}/dashboard/admin/permissions" 
               style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Examiner la demande
            </a>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Send a generic email
   */
  async sendEmail(to, subject, message) {
    try {
      await this.transporter.sendMail({
        from: this.sender,
        to,
        subject,
        html: message,
      });

      console.log(`Email sent to ${to} with subject: ${subject}`);
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Test email connection
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connected successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
