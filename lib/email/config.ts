export function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const secure = (process.env.SMTP_SECURE ?? "true").toLowerCase() !== "false";
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? user ?? "hello@actsto.org";
  const fromName = process.env.SMTP_FROM_NAME ?? "Arizona Christian Tuition";

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.");
  }

  return { host, port, user, pass, secure, fromEmail, fromName };
}

export function getImapConfig() {
  const host = process.env.IMAP_HOST;
  const port = Number(process.env.IMAP_PORT ?? "993");
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASSWORD;
  const secure = (process.env.IMAP_SECURE ?? "true").toLowerCase() !== "false";
  const mailbox = process.env.IMAP_MAILBOX ?? "INBOX";

  if (!host || !user || !pass) {
    throw new Error("IMAP is not configured. Set IMAP_HOST, IMAP_USER, and IMAP_PASSWORD.");
  }

  return { host, port, user, pass, secure, mailbox };
}
