import nodemailer from 'nodemailer';

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: {
          user,
          pass,
        },
      });

      const senderEmail = process.env.SENDER_EMAIL || 'noreply@vit-sidequest.ac.in';
      await transporter.sendMail({
        from: `"SideQuest" <${senderEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('SMTP Email sending error:', error);
    }
  }

  // Fallback logging in console
  console.log('\n==================================================');
  console.log(`📩  EMAIL SENT (DEVELOPMENT LOG)`);
  console.log(`TO:      ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`TEXT:    ${text}`);
  console.log('==================================================\n');
  return false;
}
export default sendEmail;
