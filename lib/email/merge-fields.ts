// Dynamic merge fields available in email templates + compose. Client-safe.
export const EMAIL_MERGE_FIELDS: { token: string; label: string }[] = [
  { token: "{{first_name}}", label: "First name" },
  { token: "{{last_name}}", label: "Last name" },
  { token: "{{full_name}}", label: "Full name" },
  { token: "{{email}}", label: "Email" },
  { token: "{{phone}}", label: "Phone" },
  { token: "{{role}}", label: "Account type" },
  { token: "{{campaign_title}}", label: "Campaign title" },
  { token: "{{campaign_url}}", label: "Campaign URL" },
  { token: "{{donation_amount}}", label: "Donation amount" },
  { token: "{{receipt_number}}", label: "Receipt #" },
  { token: "{{tax_year}}", label: "Tax year" },
  { token: "{{preferences_url}}", label: "Preferences URL" },
  { token: "{{unsubscribe_url}}", label: "Unsubscribe URL" },
  { token: "{{site_url}}", label: "Site URL" },
];
