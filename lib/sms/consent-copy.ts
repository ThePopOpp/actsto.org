export const SMS_CONSENT_DISCLOSURE_VERSION = "ACTSTO_SMS_DISCLOSURE_V1_2026_05";

export const SMS_CONSENT_LINK_TEXT =
  "View our Privacy Policy, Terms of Service, and Communication Policy.";

export const SMS_CONSENT_COPY = {
  universal:
    "I agree to receive text messages from Arizona Christian Tuition (ACTSTO) related to my account, donations, scholarship campaigns, campaign updates, event reminders, support responses, and program notifications. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to donate, register, create a campaign, or use ACTSTO services.",
  contact:
    "I agree to receive text messages from Arizona Christian Tuition (ACTSTO) regarding my inquiry, appointment reminders, account support, donation questions, scholarship campaign updates, and program notifications. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to submit this form.",
  donorIndividual:
    "I agree to receive text messages from Arizona Christian Tuition (ACTSTO) regarding donor account alerts, donation confirmations, tax credit reminders, campaign updates, event reminders, and program notifications. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to create a donor account or make a donation.",
  donorBusiness:
    "I agree to receive text messages from Arizona Christian Tuition (ACTSTO) regarding business donor account alerts, corporate donation status, tax credit documentation, campaign updates, event reminders, and program notifications. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to create a business donor account or make a donation.",
  parent:
    "I agree to receive text messages from Arizona Christian Tuition (ACTSTO) regarding my parent account, student scholarship campaign updates, donation activity, campaign deadline reminders, application updates, event reminders, and program notifications. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to create a parent account or use ACTSTO services.",
  optInPage:
    "By providing your phone number and checking this box, you agree to receive SMS messages from ACTSTO.ORG regarding campaign reminders, donor messages, service notifications, account updates, appointment reminders, and event reminders. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for assistance. Consent is not a condition of any purchase, donation, service, or participation.",
} as const;

export type SmsConsentCopyKey = keyof typeof SMS_CONSENT_COPY;

export function smsConsentDisclosureText(copyKey: SmsConsentCopyKey) {
  return `${SMS_CONSENT_COPY[copyKey]} ${SMS_CONSENT_LINK_TEXT}`;
}
