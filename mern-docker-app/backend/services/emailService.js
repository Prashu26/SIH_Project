const nodemailer = require("nodemailer");
const storageService = require("./storageService");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  logger: true,
  debug: true,
});

// Verify transporter connection at startup and log useful guidance
(async () => {
  try {
    await transporter.verify();
    console.log("Email transporter verified and ready to send messages");
  } catch (err) {
    console.error(
      "Email transporter verification failed:",
      err && err.message ? err.message : err
    );
    console.error(
      "Ensure SMTP env vars are set (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD).\nIf using Gmail, use an App Password (requires 2FA) and set SMTP_USER to your email and SMTP_PASSWORD to the app password."
    );
  }
})();

async function sendCertificateEmail({
  to,
  subject,
  text,
  html,
  pdfFileId,
  pdfFilename,
}) {
  if (!to) throw new Error("Recipient email required");

  let attachments = [];

  try {
    if (pdfFileId) {
      const fileObj = await storageService.getFileStream(pdfFileId);
      if (fileObj && fileObj.stream) {
        attachments.push({
          filename: pdfFilename || "certificate.pdf",
          content: fileObj.stream,
        });
      }
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: subject || "Your Certificate",
      text: text || "Please find your certificate attached.",
      html: html || `<p>Please find your certificate attached.</p>`,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (err) {
    // Don't crash the main flow; bubble the error to caller
    throw err;
  }
}

module.exports = {
  sendCertificateEmail,
};
