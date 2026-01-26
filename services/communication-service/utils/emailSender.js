const nodemailer = require('nodemailer');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const emailSender = {
  /**
   * Envoie un email
   * @param {Object} options - Options d'envoi
   * @param {string} options.to - Destinataire
   * @param {string} options.subject - Sujet
   * @param {string} options.text - Contenu texte
   * @param {string} options.html - Contenu HTML
   * @param {Array} options.attachments - Pièces jointes
   */
  async sendEmail({ to, subject, text, html, attachments = [] }) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html,
        attachments: attachments.map(file => ({
          filename: file.split('/').pop(),
          path: file
        }))
      };

      const info = await transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Erreur envoi email:', error);
      throw new Error(`Échec envoi email: ${error.message}`);
    }
  },

  /**
   * Vérifie la connexion SMTP
   */
  async verifyConnection() {
    try {
      await transporter.verify();
      console.log('Connexion SMTP établie');
      return true;
    } catch (error) {
      console.error('Erreur connexion SMTP:', error);
      return false;
    }
  }
};

module.exports = emailSender;
