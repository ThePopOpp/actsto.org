/**
 * Shared shell for every transactional and marketing email.
 *
 * A note on styling: ShadCN is a React component library and cannot run in an
 * inbox. Gmail, Outlook and Apple Mail strip <style> blocks, ignore CSS
 * variables, and support almost nothing modern — so these are tables with inline
 * styles. What carries across from the app is the *design language*: the navy,
 * the red accent, serif headings over sans body, generous spacing.
 *
 * Structure, in order: masthead → hero (eyebrow / title / subtitle) → featured
 * image → greeting and body → call to action → signature → footer → sub-footer.
 */

// ── Brand ────────────────────────────────────────────────────────────────────
// Hex, not oklch: email clients don't understand modern colour spaces.
export const EMAIL_BRAND = {
  navy: "#001138",
  navyElevated: "#0f234e",
  red: "#b21e2a",
  paper: "#f5f6f8",
  surface: "#ffffff",
  ink: "#131c2b",
  inkSoft: "#5b6879",
  inkFaint: "#8c98a8",
  line: "#e4e8ee",
} as const;

/**
 * Logo. Deliberately a PNG.
 *
 * `actsto-logo-light.svg` is the right asset on the web, but Gmail strips SVG
 * entirely and it renders as a broken image — so email needs a raster wordmark.
 * Until one exists, this uses the round mark that's already a PNG and sets the
 * wordmark in type beside it. Export a PNG wordmark at 2x (≈440×112) and point
 * `EMAIL_LOGO_URL` at it to swap in the real thing.
 */
const SITE_URL = (process.env.APP_URL ?? "https://actsto.org").replace(/\/$/, "");
export const EMAIL_LOGO_URL = `${SITE_URL}/act-favicon.png`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type EmailCta = { label: string; url: string };

export type EmailLayoutOptions = {
  /** Inbox preview line. Worth setting — it's the third thing people read. */
  preheader: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Absolute URL. Skipped when absent rather than leaving a gap. */
  featuredImageUrl?: string | null;
  featuredImageAlt?: string;
  /** Personal greeting. Falls back to "Hello there," when the name is unknown. */
  firstName?: string | null;
  /** Body paragraphs — plain text, escaped. Pass pre-built HTML via `bodyHtml`. */
  body?: string[];
  bodyHtml?: string;
  cta?: EmailCta;
  /** Small print under the CTA — deadlines, caveats. */
  note?: string;
  /**
   * Why this person is receiving it. Required for anything optional, so the
   * footer can say "you're getting this because…" and link to preferences.
   */
  reason?: string;
  /** Omitted for transactional mail people can't opt out of. */
  showUnsubscribe?: boolean;
};

const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_SERIF = "Georgia,'Times New Roman',serif";

function button(cta: EmailCta): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0">
    <tr>
      <td align="center" bgcolor="${EMAIL_BRAND.navy}" style="border-radius:8px">
        <a href="${escapeHtml(cta.url)}"
           style="display:inline-block;padding:13px 26px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">
          ${escapeHtml(cta.label)}
        </a>
      </td>
    </tr>
  </table>`;
}

export function renderEmailLayout(options: EmailLayoutOptions): string {
  const {
    preheader,
    eyebrow,
    title,
    subtitle,
    featuredImageUrl,
    featuredImageAlt = "",
    firstName,
    body = [],
    bodyHtml,
    cta,
    note,
    reason,
    showUnsubscribe = false,
  } = options;

  const greeting = firstName?.trim() ? `Hello ${escapeHtml(firstName.trim())},` : "Hello there,";

  const paragraphs =
    bodyHtml ??
    body
      .map(
        (p) =>
          `<p style="margin:0 0 15px;font-family:${FONT_SANS};font-size:15px;line-height:1.65;color:${EMAIL_BRAND.ink}">${escapeHtml(p)}</p>`,
      )
      .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.paper}">

<!-- Preheader: shown in the inbox list, hidden in the body. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">
  ${escapeHtml(preheader)}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_BRAND.paper}">
  <tr>
    <td align="center" style="padding:28px 12px">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:${EMAIL_BRAND.surface};border-radius:14px;overflow:hidden;border:1px solid ${EMAIL_BRAND.line}">

        <!-- Masthead -->
        <tr>
          <td align="center" style="padding:22px 24px;border-bottom:1px solid ${EMAIL_BRAND.line}">
            <a href="${SITE_URL}" style="text-decoration:none">
              <img src="${EMAIL_LOGO_URL}" width="34" height="34" alt=""
                   style="vertical-align:middle;border:0;border-radius:50%">
              <span style="display:inline-block;margin-left:9px;vertical-align:middle;font-family:${FONT_SERIF};font-size:20px;font-weight:700;color:${EMAIL_BRAND.navy};letter-spacing:-0.2px">
                actsto<span style="color:${EMAIL_BRAND.red}">.org</span>
              </span>
            </a>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding:34px 32px 26px;background:${EMAIL_BRAND.navy}">
            ${
              eyebrow
                ? `<p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#c9a227">${escapeHtml(eyebrow)}</p>`
                : ""
            }
            <h1 style="margin:0;font-family:${FONT_SERIF};font-size:29px;line-height:1.25;font-weight:700;color:#ffffff">${escapeHtml(title)}</h1>
            ${
              subtitle
                ? `<p style="margin:11px 0 0;font-family:${FONT_SANS};font-size:15px;line-height:1.6;color:rgba(255,255,255,0.75)">${escapeHtml(subtitle)}</p>`
                : ""
            }
          </td>
        </tr>

        ${
          featuredImageUrl
            ? `<tr><td style="padding:0">
                 <img src="${escapeHtml(featuredImageUrl)}" alt="${escapeHtml(featuredImageAlt)}" width="600"
                      style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>`
            : ""
        }

        <!-- Body -->
        <tr>
          <td style="padding:30px 32px 34px">
            <p style="margin:0 0 15px;font-family:${FONT_SANS};font-size:16px;font-weight:600;color:${EMAIL_BRAND.ink}">${greeting}</p>
            ${paragraphs}
            ${cta ? button(cta) : ""}
            ${
              note
                ? `<p style="margin:18px 0 0;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:${EMAIL_BRAND.inkSoft}">${escapeHtml(note)}</p>`
                : ""
            }
          </td>
        </tr>

        <!-- Signature -->
        <tr>
          <td style="padding:0 32px 32px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="border-top:1px solid ${EMAIL_BRAND.line};padding-top:20px">
                <p style="margin:0 0 3px;font-family:${FONT_SANS};font-size:14px;color:${EMAIL_BRAND.ink}">Warmly,</p>
                <p style="margin:0;font-family:${FONT_SERIF};font-size:17px;font-weight:700;color:${EMAIL_BRAND.navy}">The ACTSTO.org Team</p>
                <p style="margin:4px 0 0;font-family:${FONT_SANS};font-size:13px;color:${EMAIL_BRAND.inkSoft}">Arizona Christian Tuition</p>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;background:${EMAIL_BRAND.navyElevated}">
            <p style="margin:0 0 8px;font-family:${FONT_SANS};font-size:13px;line-height:1.6;color:rgba(255,255,255,0.85)">
              Turning Arizona tax liability into tuition scholarships.
            </p>
            <p style="margin:0;font-family:${FONT_SANS};font-size:13px">
              <a href="${SITE_URL}/campaigns" style="color:#ffffff;text-decoration:underline">Browse campaigns</a>
              <span style="color:rgba(255,255,255,0.4)"> &nbsp;·&nbsp; </span>
              <a href="${SITE_URL}/how-it-works" style="color:#ffffff;text-decoration:underline">How it works</a>
              <span style="color:rgba(255,255,255,0.4)"> &nbsp;·&nbsp; </span>
              <a href="${SITE_URL}/contact" style="color:#ffffff;text-decoration:underline">Contact us</a>
            </p>
          </td>
        </tr>

        <!-- Sub-footer -->
        <tr>
          <td style="padding:18px 32px 22px;background:${EMAIL_BRAND.navy}">
            ${
              reason
                ? `<p style="margin:0 0 7px;font-family:${FONT_SANS};font-size:11px;line-height:1.6;color:rgba(255,255,255,0.55)">${escapeHtml(reason)}</p>`
                : ""
            }
            <p style="margin:0;font-family:${FONT_SANS};font-size:11px;line-height:1.6;color:rgba(255,255,255,0.55)">
              Arizona Christian Tuition is a certified Arizona School Tuition Organization.
              Contributions may qualify for a state tax credit under A.R.S. &sect; 43-1089.
              This is not tax advice — please consult your tax professional.
            </p>
            ${
              showUnsubscribe
                ? `<p style="margin:9px 0 0;font-family:${FONT_SANS};font-size:11px;color:rgba(255,255,255,0.55)">
                     <a href="${SITE_URL}/dashboard/communication-preferences" style="color:rgba(255,255,255,0.8);text-decoration:underline">Manage email preferences</a>
                   </p>`
                : ""
            }
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Plain-text alternative. Spam filters penalise HTML-only mail. */
export function renderEmailText(options: EmailLayoutOptions): string {
  const greeting = options.firstName?.trim() ? `Hello ${options.firstName.trim()},` : "Hello there,";
  return [
    options.eyebrow ? options.eyebrow.toUpperCase() : null,
    options.title,
    options.subtitle,
    "",
    greeting,
    "",
    ...(options.body ?? []),
    options.cta ? `\n${options.cta.label}: ${options.cta.url}` : null,
    options.note,
    "",
    "Warmly,",
    "The ACTSTO.org Team — Arizona Christian Tuition",
  ]
    .filter((line): line is string => line !== null && line !== undefined)
    .join("\n");
}
