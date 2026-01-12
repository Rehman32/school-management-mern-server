// ============================================
// EMAIL SERVICE - FLEXIBLE SMTP CONFIGURATION
// server/services/email.service.js
// ============================================
// Supports: Resend, Brevo, Mailgun, Gmail, or any SMTP

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@school.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'School Management System';
  }

  // Initialize transporter based on env config
  init() {
    if (this.initialized) return;

    const provider = process.env.EMAIL_PROVIDER || 'smtp';

    try {
      if (provider === 'resend') {
        // Resend (3000 emails/month free)
        this.transporter = nodemailer.createTransport({
          host: 'smtp.resend.com',
          port: 465,
          secure: true,
          auth: {
            user: 'resend',
            pass: process.env.RESEND_API_KEY
          }
        });
      } else if (provider === 'brevo' || provider === 'sendinblue') {
        // Brevo/Sendinblue (300 emails/day free)
        this.transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.BREVO_USER,
            pass: process.env.BREVO_API_KEY
          }
        });
      } else if (provider === 'mailgun') {
        // Mailgun (1000 emails free for 3 months)
        this.transporter = nodemailer.createTransport({
          host: 'smtp.mailgun.org',
          port: 587,
          secure: false,
          auth: {
            user: process.env.MAILGUN_USER,
            pass: process.env.MAILGUN_PASSWORD
          }
        });
      } else if (provider === 'gmail') {
        // Gmail (500/day with app password)
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        });
      } else {
        // Generic SMTP
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });
      }

      this.initialized = true;
      console.log(`✅ Email service initialized with provider: ${provider}`);
    } catch (err) {
      console.warn(`⚠️ Email service not configured: ${err.message}`);
      console.warn('   Emails will be logged to console instead.');
    }
  }

  // Send email (with fallback to console)
  async send({ to, subject, html, text }) {
    this.init();

    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]*>/g, '')
    };

    // If no transporter, log to console
    if (!this.transporter) {
      console.log('\n📧 ========== EMAIL (Console Mode) ==========');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${text || html}`);
      console.log('==============================================\n');
      return { success: true, mode: 'console' };
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ Email failed to ${to}:`, err.message);
      throw err;
    }
  }

  // ============================================
  // EMAIL TEMPLATES
  // ============================================

  async sendWelcomeEmail({ to, schoolName, adminName, loginUrl }) {
    const subject = `Welcome to ${schoolName} - Your School Management System`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎓 Welcome!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #333;">Hello ${adminName},</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Your School Management System for <strong>${schoolName}</strong> has been set up successfully!
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            You can now log in and start managing your school:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Login to Dashboard
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px;">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            © ${new Date().getFullYear()} School Management System
          </p>
        </div>
      </div>
    `;

    return this.send({ to, subject, html });
  }

  async sendTeacherInvitation({ to, schoolName, inviterName, inviteUrl, expiresIn }) {
    const subject = `You're invited to join ${schoolName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">👋 You're Invited!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #333;">Hello,</h2>
          
          <p style="color: #666; line-height: 1.6;">
            <strong>${inviterName}</strong> has invited you to join <strong>${schoolName}</strong> 
            as a teacher on the School Management System.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background: #11998e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px;">
            This invitation expires in ${expiresIn}. If you didn't expect this invitation, please ignore this email.
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            © ${new Date().getFullYear()} School Management System
          </p>
        </div>
      </div>
    `;

    return this.send({ to, subject, html });
  }

  async sendPasswordReset({ to, name, resetUrl }) {
    const subject = 'Reset Your Password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🔐 Password Reset</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #333;">Hello ${name || 'User'},</h2>
          
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px;">
            This link expires in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `;

    return this.send({ to, subject, html });
  }

  async sendEmailVerification({ to, name, verifyUrl }) {
    const subject = 'Verify Your Email Address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">✉️ Verify Email</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #333;">Hello ${name || 'User'},</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Please verify your email address by clicking the button below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px;">
            This link expires in 24 hours.
          </p>
        </div>
      </div>
    `;

    return this.send({ to, subject, html });
  }
}

// Export singleton instance
module.exports = new EmailService();
