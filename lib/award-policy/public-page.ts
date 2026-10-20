/**
 * The public "How we award scholarships" page and the notices ADOR requires.
 * Client-safe.
 */

/** Fixed address, linked from donation materials and the ADOR filing. Never change without a redirect. */
export const AWARD_SUMMARY_PATH = "/how-we-award-scholarships";
export const AWARD_SUMMARY_SLUG = "how-we-award-scholarships";
export const AWARD_SUMMARY_TITLE = "How we award scholarships";

/**
 * The notice ADOR requires, word for word, on the home page, the scholarship
 * application and every donation page (A.R.S. § 43-1603).
 */
export const ADOR_REQUIRED_NOTICE = [
  "A school tuition organization cannot award, restrict or reserve scholarships solely on the basis of donor recommendation.",
  "A taxpayer may not claim a tax credit if the taxpayer agrees to swap donations with another taxpayer to benefit either taxpayer's own dependent.",
] as const;

/**
 * A starting point for the editor only. It is never shown publicly: the page
 * stays unpublished until a Super Admin publishes the final summary text.
 */
export const AWARD_SUMMARY_STARTER_HTML = `<h2>Our commitment</h2>
<p>[Replace with section 9 of the ACTSTO Scholarship Award Policy, the public summary.]</p>
<h2>Who may apply</h2>
<p>[Summary.]</p>
<h2>How applications are reviewed</h2>
<p>[Summary: need assessment, factors considered, the review and committee approval.]</p>
<h2>Donor recommendations</h2>
<p>A school tuition organization cannot award, restrict or reserve scholarships solely on the basis of donor recommendation.</p>
<h2>Appeals</h2>
<p>[Summary of the appeal process and the 30-day deadline.]</p>`;
