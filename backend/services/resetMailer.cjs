const nodemailer = require("nodemailer");

function createResetMailer() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const port = Number(process.env.SMTP_PORT || 587);
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Password recovery SMTP configuration is missing or invalid.");
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  return {
    async send(email, token) {
      const result = await transport.sendMail({
        from: SMTP_FROM, to: { address: email, name: "" },
        subject: "Reset your AutoNexa password",
        text: `Your AutoNexa password reset code is:\n\n${token}\n\nThis code expires in 15 minutes and can be used once. If you did not request it, ignore this email.`,
      });
      if (!result.accepted?.length) throw new Error("Reset email was not accepted.");
    },
  };
}

module.exports = { createResetMailer };
