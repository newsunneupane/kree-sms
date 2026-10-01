import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: parseInt(process.env.SMTP_PORT || "587", 10) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendOtpEmail(to, name, otp) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email Mock] OTP for ${name} (${to}): ${otp}`);
    return true;
  }
  await t.sendMail({
    from: process.env.EMAIL_FROM || "no-reply@kreesms.com",
    to,
    subject: "KreeSMS Verification Code",
    text: `Hello ${name},\n\nYour account verification code is: ${otp}\n\nEnter this code to verify your email and complete registration.`,
  });
  return true;
}
