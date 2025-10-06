// ============================================
// EMAIL SERVICE
// Email notifications for verification, reset, etc.
// ============================================

const nodemailer = require('nodemailer');

class EmailService {
  /**
   * Create Email Transporter
   */
  static createTransporter() {
    if (process.env.NODE_ENV === 'production') {
      // Production SMTP
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Development - Log to console
      return {
        sendMail: async (options) => {
          console.log('📧 Email (Development Mode)');
          console.log('To:', options.to);
          console.log('Subject:', options.subject);
          console.log('Content:', options.html || options.text);
          return { messageId: 'dev-mode' };
        },
      };
    }
  }

  /**
   * Send Email
   */
  static async sendEmail({ to, subject, html, text }) {
    try {
      const transporter = this.createTransporter();

      const mailOptions = {
        from: `${process.env.APP_NAME || 'School Management'} <${process.env.EMAIL_FROM || 'noreply@school.com'}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Email send failed:', error);
      throw error;
    }
  }

  /**
   * Send Verification Email
   */
  static async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
            <center>
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'School Management System'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      html,
    });
  }

  /**
   * Send Password Reset Email
   */
  static async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <center>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <p>This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.</p>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'School Management System'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html,
    });
  }

  /**
   * Send Invitation Email
   */
  static async sendInvitationEmail(invitation, tenant) {
    const invitationUrl = `${process.env.APP_URL}/register?invitation=${invitation.token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #4facfe; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .info-box { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited!</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have been invited to join <strong>${tenant.name}</strong> as a <strong>${invitation.role}</strong>.</p>
            <div class="info-box">
              <p><strong>School:</strong> ${tenant.name}</p>
              <p><strong>Role:</strong> ${invitation.role}</p>
              <p><strong>Invited by:</strong> ${invitation.invitedBy.name}</p>
            </div>
            <p>Click the button below to accept the invitation and create your account:</p>
            <center>
              <a href="${invitationUrl}" class="button">Accept Invitation</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4facfe;">${invitationUrl}</p>
            <p>This invitation will expire in 7 days.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'School Management System'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: invitation.email,
      subject: `Invitation to join ${tenant.name}`,
      html,
    });
  }

  /**
   * Send Welcome Email
   */
  static async sendWelcomeEmail(user, tenant) {
    const loginUrl = `${process.env.APP_URL}/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #43e97b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${tenant.name}! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>Welcome aboard! Your account has been successfully created.</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <center>
              <a href="${loginUrl}" class="button">Login Now</a>
            </center>
            <p>If you have any questions, feel free to reach out to your administrator.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'School Management System'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Welcome to ${tenant.name}!`,
      html,
    });
  }
}

module.exports = EmailService;
