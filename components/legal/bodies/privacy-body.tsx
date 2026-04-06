import { LegalContactBlock } from "@/components/legal/bodies/contact-block";

/** Default privacy policy markup (also rendered to HTML for the admin editor baseline). */
export function PrivacyDocumentBody() {
  return (
    <>
      <p className="-mt-4 text-base font-medium text-primary">ARIZONA CHRISTIAN TUITION</p>
      <p className="text-muted-foreground">
        How Arizona Christian Tuition collects, uses, and protects your personal information
      </p>
      <LegalContactBlock />

      <section>
        <h2>1. Introduction</h2>
        <p className="mt-3 text-muted-foreground">
          Arizona Christian Tuition (&quot;ACT,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a 501(c)(3)
          nonprofit School Tuition Organization (STO) certified under Arizona law. This Privacy Policy explains how we
          collect, use, store, and protect personal information when you use our websites (actsto.org,
          arizonachristiantuition.com) and web application (my.actsto.org) (collectively, the &quot;Platform&quot;). This
          Policy applies to all users including Parents, Students, Individual Donors, and Business/Corporate Donors.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">2.1 Information you provide</h3>
        <ul className="text-muted-foreground">
          <li>
            <strong className="text-foreground">Account registration:</strong> name, email address, phone number, mailing
            address, and password.
          </li>
          <li>
            <strong className="text-foreground">Parent accounts:</strong> student name, grade level, school name, and
            enrollment status.
          </li>
          <li>
            <strong className="text-foreground">Business donor accounts:</strong> organization name, EIN/Tax ID, and
            authorized representative contact details.
          </li>
          <li>
            <strong className="text-foreground">Donation information:</strong> donation amount, campaign designation, and
            billing address.
          </li>
          <li>
            <strong className="text-foreground">Scholarship applications:</strong> student demographic information and
            enrollment documentation.
          </li>
          <li>
            <strong className="text-foreground">Campaign content:</strong> narrative text, images, videos, and funding goal.
          </li>
          <li>
            <strong className="text-foreground">Communications:</strong> support inquiries and correspondence sent to ACT.
          </li>
        </ul>
        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">2.2 Information collected automatically</h3>
        <ul className="text-muted-foreground">
          <li>
            <strong className="text-foreground">Device and browser data:</strong> IP address, browser type, operating
            system, and device type.
          </li>
          <li>
            <strong className="text-foreground">Usage data:</strong> pages visited, time on page, links clicked, and
            referring URL.
          </li>
          <li>
            <strong className="text-foreground">Cookie data:</strong> session identifiers and analytics identifiers (see
            Section 6).
          </li>
        </ul>
        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">2.3 Information from third parties</h3>
        <ul className="text-muted-foreground">
          <li>
            <strong className="text-foreground">PayPal:</strong> transaction confirmation, donation amount, donor identity,
            and transaction ID.
          </li>
          <li>
            <strong className="text-foreground">Twilio:</strong> SMS/voice message delivery status and opt-out records.
          </li>
          <li>
            <strong className="text-foreground">Analytics providers:</strong> aggregated website traffic and engagement
            data.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use your information</h2>
        <ul className="mt-3 text-muted-foreground">
          <li>Process donations and issue tax credit acknowledgment letters as required by Arizona law.</li>
          <li>Create, manage, and display scholarship funding campaigns.</li>
          <li>Evaluate scholarship applications and award scholarship funds.</li>
          <li>
            Send transactional communications: donation receipts, campaign updates, OTP codes, and account alerts.
          </li>
          <li>Send marketing communications to users who have opted in.</li>
          <li>Comply with Arizona STO certification requirements under A.R.S. § 43-1089 et seq.</li>
          <li>Detect and prevent fraud, unauthorized access, and Policy violations.</li>
          <li>Improve Platform functionality through aggregated analytics.</li>
        </ul>
      </section>

      <section>
        <h2>4. How we share your information</h2>
        <p className="mt-3 text-muted-foreground">
          ACT does not sell, rent, or trade your personal information to third parties for their own marketing purposes.
        </p>
        <ul className="text-muted-foreground">
          <li>
            <strong className="text-foreground">Service providers:</strong> PayPal (payment processing), Twilio (SMS/voice),
            email delivery providers, and cloud hosting — all bound by data processing agreements.
          </li>
          <li>
            <strong className="text-foreground">Partner schools:</strong> student first name, grade, and enrollment status for
            scholarship verification only.
          </li>
          <li>
            <strong className="text-foreground">Arizona Department of Revenue:</strong> donor records as required by Arizona
            STO statute.
          </li>
          <li>
            <strong className="text-foreground">Legal process:</strong> court orders, subpoenas, or lawful government
            requests.
          </li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          Donors may request anonymous donation status by contacting us prior to donating. Campaign pages are publicly
          visible by default. Parents should not include sensitive personal data such as full home addresses or government
          ID numbers in campaign content.
        </p>
      </section>

      <section>
        <h2>5. Children&apos;s privacy (COPPA)</h2>
        <p className="mt-3 text-muted-foreground">
          ACT does not knowingly collect personal information directly from children under age 13. Campaign and scholarship
          information for minor students is submitted by a parent or legal guardian. If you believe we have inadvertently
          collected information from a child under 13, contact us immediately at{" "}
          <a href="mailto:hello@arizonachristiantuition.com" className="text-primary underline-offset-4 hover:underline">
            hello@arizonachristiantuition.com
          </a>{" "}
          and we will delete it promptly.
        </p>
      </section>

      <section>
        <h2>6. Cookies and tracking</h2>
        <ul className="mt-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Essential cookies:</strong> required for login and core Platform function.
            Cannot be disabled.
          </li>
          <li>
            <strong className="text-foreground">Analytics cookies:</strong> used to understand Platform usage (e.g., Google
            Analytics). You may opt out at{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              tools.google.com/dlpage/gaoptout
            </a>
            .
          </li>
          <li>
            <strong className="text-foreground">Functional cookies:</strong> remember user preferences such as notification
            settings.
          </li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          You may manage most cookies through your browser settings. Disabling essential cookies will impair Platform
          functionality.
        </p>
      </section>

      <section>
        <h2>7. Payment information</h2>
        <p className="mt-3 text-muted-foreground">
          All donations are processed by PayPal, Inc. ACT does not receive, store, or process your full credit card or bank
          account number. PayPal handles payment data under PCI DSS Level 1 standards. ACT receives only transaction
          confirmation, donation amount, and transaction ID. See PayPal&apos;s Privacy Policy at{" "}
          <a
            href="https://www.paypal.com/us/legalhub/privacy-full"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            paypal.com/us/legalhub/privacy-full
          </a>
          .
        </p>
      </section>

      <section>
        <h2>8. SMS and voice data</h2>
        <p className="mt-3 text-muted-foreground">
          ACT uses Twilio, Inc. to deliver SMS and voice communications. Twilio processes mobile phone numbers, message
          content, delivery status, and opt-out records on ACT&apos;s behalf under a Data Processing Addendum. SMS message
          logs are retained for 24 months. ACT&apos;s SMS program is registered under Twilio&apos;s A2P 10DLC framework. See
          Twilio&apos;s Privacy Policy at{" "}
          <a
            href="https://www.twilio.com/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            twilio.com/legal/privacy
          </a>
          .
        </p>
      </section>

      <section>
        <h2>9. Data retention</h2>
        <ul className="mt-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Donor and financial records:</strong> 7 years minimum (IRS/nonprofit
            compliance).
          </li>
          <li>
            <strong className="text-foreground">Account information:</strong> duration of account plus 3 years after
            closure.
          </li>
          <li>
            <strong className="text-foreground">Scholarship application records:</strong> 7 years (Arizona STO compliance).
          </li>
          <li>
            <strong className="text-foreground">SMS message logs and opt-in records:</strong> 24–48 months (TCPA/CTIA
            compliance).
          </li>
          <li>
            <strong className="text-foreground">Email communication logs:</strong> 36 months.
          </li>
          <li>
            <strong className="text-foreground">Campaign content:</strong> duration of campaign plus 3 years.
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Data security</h2>
        <ul className="mt-3 text-muted-foreground">
          <li>All Platform communications are encrypted via TLS 1.2 or higher (HTTPS).</li>
          <li>Passwords are stored using industry-standard one-way hashing (bcrypt). ACT never stores plaintext passwords.</li>
          <li>Access to personal information is restricted to ACT staff with a legitimate need.</li>
          <li>Payment card data is handled exclusively by PayPal under PCI DSS standards.</li>
          <li>
            In the event of a data breach, ACT will notify affected users as required by Arizona data breach notification law,
            A.R.S. § 18-551 et seq.
          </li>
        </ul>
      </section>

      <section>
        <h2>11. Your privacy rights</h2>
        <ul className="mt-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Right to access:</strong> request a copy of personal information ACT holds
            about you.
          </li>
          <li>
            <strong className="text-foreground">Right to correction:</strong> request correction of inaccurate or incomplete
            information.
          </li>
          <li>
            <strong className="text-foreground">Right to deletion:</strong> request deletion of your personal information,
            subject to legal retention requirements.
          </li>
          <li>
            <strong className="text-foreground">Right to opt out:</strong> opt out of marketing communications at any time.
          </li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          To exercise these rights, email{" "}
          <a href="mailto:hello@arizonachristiantuition.com" className="text-primary underline-offset-4 hover:underline">
            hello@arizonachristiantuition.com
          </a>{" "}
          with subject line &quot;Privacy Rights Request.&quot; ACT will respond within 30 days. California residents may
          submit CCPA requests using subject line &quot;CCPA Request.&quot; ACT does not sell personal information.
        </p>
      </section>

      <section>
        <h2>12. Changes to this policy</h2>
        <p className="mt-3 text-muted-foreground">
          ACT may update this Privacy Policy at any time. Material changes will be communicated via email at least 14 days
          before taking effect. Continued use of the Platform after the effective date constitutes acceptance of the revised
          Policy.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p className="mt-3 text-muted-foreground">
          <strong className="text-foreground">Arizona Christian Tuition — Privacy Team</strong>
          <br />
          Phone: (602) 421-8301
          <br />
          Email:{" "}
          <a href="mailto:hello@arizonachristiantuition.com" className="text-primary underline-offset-4 hover:underline">
            hello@arizonachristiantuition.com
          </a>
          <br />
          Web:{" "}
          <a
            href="https://www.arizonachristiantuition.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            https://www.arizonachristiantuition.com
          </a>{" "}
          · App:{" "}
          <a
            href="https://my.actsto.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            https://my.actsto.org
          </a>
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          This Privacy Policy is effective as of April 1, 2026. © 2026 Arizona Christian Tuition. All rights reserved.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Related:{" "}
          <a href="/legal/communication-policy" className="text-primary underline-offset-4 hover:underline">
            Communication Policy
          </a>
          {" · "}
          <a href="/legal/terms" className="text-primary underline-offset-4 hover:underline">
            Terms of Service
          </a>
        </p>
      </section>
    </>
  );
}
