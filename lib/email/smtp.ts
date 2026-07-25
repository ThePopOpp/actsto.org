// Backward-compatible entry point. The real, provider-aware sender lives in
// `lib/email/send.ts` (Resend-first, SMTP fallback). Existing callers import
// `sendSmtpEmail` from here and now automatically use Resend when configured.
export { sendEmail, sendSmtpEmail, type SendEmailArgs, type SendResult } from "@/lib/email/send";
