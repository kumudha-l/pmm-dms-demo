const nodemailer = require("nodemailer");

function envFlag(name, defaultValue = false) {
  const value = process.env[name];
  if (value == null || value === "") {
    return defaultValue;
  }
  return String(value).toLowerCase() === "true";
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function unauthorized(res) {
  return res.status(401).json({ ok: false, error: "Unauthorized" });
}

function serverError(res, message) {
  return res.status(500).json({ ok: false, error: message });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const expectedSecret = (process.env.MAIL_SERVICE_SECRET || "").trim();
  const incomingSecret = (req.headers["x-mail-service-secret"] || "").trim();
  if (!expectedSecret || incomingSecret !== expectedSecret) {
    console.warn("Mail request rejected due to missing or invalid shared secret.");
    return unauthorized(res);
  }

  try {
    const payload = await readJsonBody(req);
    const recipient = (payload.recipient || "").trim();
    const subject = (payload.subject || "").trim();
    const text = String(payload.text || "").trim();
    const attachment = payload.attachment || null;

    if (!recipient || !subject || !text) {
      return res.status(400).json({ ok: false, error: "recipient, subject, and text are required" });
    }

    const host = (process.env.MAIL_PROVIDER_HOST || "").trim();
    const port = Number(process.env.MAIL_PROVIDER_PORT || 587);
    const secure = envFlag("MAIL_PROVIDER_SECURE", false);
    const user = (process.env.MAIL_PROVIDER_USER || "").trim();
    const pass = (process.env.MAIL_PROVIDER_PASS || "").trim();
    const from = (process.env.MAIL_FROM || user).trim();
    const replyTo = (process.env.MAIL_REPLY_TO || "").trim();

    if (!host || !from) {
      console.error("Mail provider configuration missing. Host or from address not configured.");
      return serverError(res, "Mail provider configuration missing");
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });

    const attachments = [];
    if (attachment && attachment.filename && attachment.dataBase64) {
      attachments.push({
        filename: attachment.filename,
        contentType: attachment.contentType || "application/octet-stream",
        content: Buffer.from(String(attachment.dataBase64), "base64"),
      });
    }

    console.info(
      "Mail send started for %s. Attachment included: %s.",
      recipient,
      attachments.length > 0
    );

    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject,
      text,
      replyTo: replyTo || undefined,
      attachments,
    });

    console.info("Mail send completed for %s with messageId %s.", recipient, info.messageId);
    return res.status(200).json({ ok: true, messageId: info.messageId });
  } catch (error) {
    console.error("Mail send failed.", error);
    return res.status(500).json({ ok: false, error: error.message || "Mail send failed" });
  }
};
