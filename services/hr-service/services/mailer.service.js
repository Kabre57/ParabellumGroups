const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    // Configuration pour les tests. En production, utilisez un vrai serveur SMTP (SendGrid, Mailgun, etc.)
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'test@example.com',
        pass: process.env.SMTP_PASSWORD || 'pass123'
    }
});

exports.sendMail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: '"SIRH Logipaie" <rh@logipaie.ci>',
            to,
            subject,
            html
        });
        console.log("Email envoyé à %s: %s", to, info.messageId);
        return info;
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email: ", error);
        // On ne bloque pas le processus si l'email échoue pendant le dev
    }
};
