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

/**
 * Resend send config. Returns null when RESEND_API_KEY is unset (so the sender
 * falls back to SMTP). When the key IS set, RESEND_FROM_EMAIL is required — we
 * deliberately refuse to fall back to another identity/unverified domain.
 */
export function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  const fromEmail = (process.env.RESEND_FROM_EMAIL ?? process.env.SMTP_FROM_EMAIL ?? "").trim();
  if (!fromEmail) {
    throw new Error("RESEND_API_KEY is set but RESEND_FROM_EMAIL is empty. Set a verified from-address.");
  }
  return {
    apiKey,
    fromEmail,
    fromName: (process.env.RESEND_FROM_NAME ?? process.env.SMTP_FROM_NAME ?? "Arizona Christian Tuition").trim(),
    replyTo: process.env.RESEND_REPLY_TO?.trim() || undefined,
  };
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

export type SenderIdentity = {
  name: string;
  email: string;
  replyTo: string | null;
  provider: "resend" | "smtp" | "unconfigured";
};

/**
 * Who the app actually sends as, right now.
 *
 * Resolved from the same config the sender uses, so nothing has to guess. It's
 * env-driven rather than editable in the dashboard on purpose: the from-address
 * has to be on a domain verified with the provider, and a typo in a settings
 * field would fail every send with a provider error nobody would connect back
 * to the change.
 */
export function getSenderIdentity(): SenderIdentity {
  try {
    const resend = getResendConfig();
    if (resend) {
      return {
        name: resend.fromName,
        email: resend.fromEmail,
        replyTo: resend.replyTo ?? null,
        provider: "resend",
      };
    }
  } catch {
    // RESEND_API_KEY set with no from-address. Fall through to SMTP rather than
    // taking the settings page down over it.
  }
  try {
    const smtp = getSmtpConfig();
    return { name: smtp.fromName, email: smtp.fromEmail, replyTo: null, provider: "smtp" };
  } catch {
    return { name: "", email: "", replyTo: null, provider: "unconfigured" };
  }
}
