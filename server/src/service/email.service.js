const { env } = require('../config/env');

/**
 * Email service stub.
 *
 * In production, replace this with nodemailer or a transactional email provider.
 * Logs all outgoing emails to the console for development.
 */

async function sendMail({ to, subject, html }) {
  const message = {
    to,
    subject,
    html,
    timestamp: new Date().toISOString(),
  };

  console.log('[EMAIL SERVICE]', JSON.stringify(message, null, 2));

  return message;
}

async function sendStaffInvitation({ email, fullName, invitationToken }) {
  const invitationLink = `${env.CORS_ORIGIN}/accept-invitation?token=${invitationToken}`;

  return sendMail({
    to: email,
    subject: 'Welcome to BabyStore — Set Your Password',
    html: `
      <h2>Welcome to BabyStore, ${fullName}!</h2>
      <p>Your staff account has been created.</p>
      <p>Please click the link below to set your password and activate your account:</p>
      <p><a href="${invitationLink}">${invitationLink}</a></p>
      <p>This link will expire in 48 hours.</p>
      <p>If you did not expect this invitation, please ignore this email.</p>
    `,
  });
}

module.exports = {
  sendMail,
  sendStaffInvitation,
};