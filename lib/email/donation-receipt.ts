import "server-only";

import { applyMergeFields } from "@/lib/automations/events";
import { sendEmail } from "@/lib/email/send";
import { renderEmailLayout } from "@/lib/email/templates/layout";
import { prisma } from "@/lib/prisma";

function siteBase() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://actsto.org").replace(/\/$/, "");
}

function usd(value: unknown) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Email the ACTSTO receipt for a paid donation.
 *
 * PayPal sends the payer its own transaction notice and that cannot be turned
 * off — it is PayPal's record of the payment. It is not a receipt from the
 * school tuition organisation, which is what an Arizona tax-credit donor files
 * with. This sends ours.
 *
 * Called straight from the payment finalizer rather than through an automation.
 * Receipts are required mail, not a campaign, so they must not depend on a
 * Super Admin having wired up an automation first — none existed, which is why
 * donors were only getting PayPal's notice.
 *
 * Uses the `donation_receipt` template when one is installed so Super Admins
 * can edit the wording, and falls back to the branded layout when it is not.
 * Never throws: a receipt that fails to send must not fail the payment.
 */
export async function sendDonationReceiptEmail(donationId: string): Promise<boolean> {
  try {
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        donationDetail: true,
        campaign: { select: { title: true, slug: true } },
        taxReceipts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!donation) return false;

    const receipt = donation.taxReceipts[0] ?? null;
    const to =
      receipt?.issuedToEmail ??
      donation.donationDetail?.donorEmail ??
      (donation.userId
        ? (await prisma.profile.findUnique({ where: { id: donation.userId }, select: { email: true } }))?.email
        : null);
    if (!to) return false;

    // Sending twice for one donation would look like a second gift.
    if (receipt?.emailedAt) return false;

    const site = siteBase();
    const fullName =
      receipt?.issuedToName ??
      [donation.donationDetail?.donorFirstName, donation.donationDetail?.donorLastName]
        .filter(Boolean)
        .join(" ")
        .trim();
    const amount = usd(donation.totalAmount ?? donation.amount);
    const taxYear = String(receipt?.taxYear ?? donation.taxYear ?? donation.createdAt.getFullYear());
    const campaignTitle = donation.campaign?.title ?? "the ACT general fund";

    const fields = {
      site_url: site,
      first_name: donation.donationDetail?.donorFirstName ?? fullName.split(" ")[0] ?? "Friend",
      full_name: fullName || to,
      email: to,
      donation_amount: amount,
      donation_date: donation.createdAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      receipt_number: receipt?.receiptNumber ?? "—",
      tax_year: taxYear,
      campaign_title: campaignTitle,
      campaign_url: donation.campaign?.slug ? `${site}/campaigns/${donation.campaign.slug}` : site,
    };

    const template = await prisma.emailTemplate
      .findUnique({ where: { catalogKey: "donation_receipt" } })
      .catch(() => null);

    const subject = applyMergeFields(
      template?.subject || `Your ACTSTO donation receipt — ${fields.receipt_number}`,
      fields,
    );

    const html = template?.content
      ? applyMergeFields(template.content, fields)
      : renderEmailLayout({
          preheader: `Receipt ${fields.receipt_number} · ${amount}`,
          eyebrow: "Donation receipt",
          title: "Thank you for your gift",
          subtitle: `${amount} toward ${campaignTitle}`,
          featuredImageUrl: null,
          firstName: fields.first_name,
          bodyHtml: `
            <p>Thank you for supporting Arizona students through ACTSTO.</p>
            <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:6px 0;color:#64748b">Receipt number</td><td style="padding:6px 0;text-align:right"><strong>${fields.receipt_number}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Amount</td><td style="padding:6px 0;text-align:right"><strong>${amount}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;text-align:right">${fields.donation_date}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Tax year</td><td style="padding:6px 0;text-align:right">${taxYear}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Designated to</td><td style="padding:6px 0;text-align:right">${campaignTitle}</td></tr>
            </table>
            <p>Keep this receipt for your records. Arizona Christian Tuition Organization is a certified
            School Tuition Organization; consult your tax advisor about claiming this on your return.</p>
          `,
          // A receipt is required mail, so it carries no unsubscribe link.
          showUnsubscribe: false,
        });

    await sendEmail({
      to,
      subject,
      html,
      text: htmlToText(html),
      templateKey: "donation_receipt",
    });

    if (receipt) {
      await prisma.taxReceipt
        .update({ where: { id: receipt.id }, data: { emailedAt: new Date(), status: "emailed" } })
        .catch(() => null);
    }
    return true;
  } catch {
    // A receipt that cannot be emailed is recoverable — the row still exists
    // and is resendable from the admin receipts screen.
    return false;
  }
}
