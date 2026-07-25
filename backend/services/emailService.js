const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  _getTransporter() {
    if (this.transporter) return this.transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: parseInt(process.env.SMTP_PORT, 10) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async sendOtpEmail(to, name, otp) {
    const transporter = this._getTransporter();
    if (!transporter) {
      console.log(`[Email Mock] OTP for ${name} (${to}): ${otp}`);
      return true;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'no-reply@kreesms.com',
      to,
      subject: 'KreeSMS Verification Code',
      text: `Hello ${name},\n\nYour account verification code is: ${otp}\n\nEnter this code to verify your email and complete registration.`,
    });
    return true;
  }
}

module.exports = new EmailService();