// Email notifications to the SolCacao team (new inquiries and quotes).
// Without SMTP settings the email is printed to the console instead, so the
// project runs on any machine without a mail server.
import nodemailer from 'nodemailer';
import { config } from '../config.js';

const { mail } = config;

const transporter = mail.host
  ? nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.secure,
    auth: mail.user ? { user: mail.user, pass: mail.password } : undefined,
  })
  : null;

// Never throws: the inquiry or quote is already saved, so a mail problem is
// logged instead of turning a successful request into an error.
export const notifyTeam = async ({ subject, text, replyTo }) => {
  if (!transporter) {
    if (config.env !== 'test') {
      console.info(`[mail] SMTP not configured. Email to ${mail.notifyTo}:\n  Subject: ${subject}\n  ${text.replace(/\n/g, '\n  ')}`);
    }
    return false;
  }

  try {
    await transporter.sendMail({ from: mail.from, to: mail.notifyTo, subject, text, replyTo });
    return true;
  } catch (error) {
    console.error(`[mail] Could not send "${subject}": ${error.message}`);
    return false;
  }
};
