export function CommunicationDocumentBody() {
  return (
    <>
      <p className="-mt-4 text-base font-medium text-primary">ARIZONA CHRISTIAN TUITION</p>
      <p className="text-lg font-semibold text-foreground">Communication Policy</p>
      <p className="text-muted-foreground">
        Governing SMS, voice, email, and in-app notifications across all ACT platforms
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Effective Date:</strong> April 1, 2026
      </p>
      <p className="mt-2 text-muted-foreground">
        <strong className="text-foreground">Arizona Christian Tuition</strong> — 501(c)(3) Nonprofit&nbsp;&nbsp;|&nbsp;&nbsp;EIN:
        39-3034324
        <br />
        (602) 421-8301&nbsp;&nbsp;|&nbsp;&nbsp;
        <a href="mailto:hello@actsto.org" className="text-primary underline-offset-4 hover:underline">
          hello@actsto.org
        </a>
        <br />
        Domains: actsto.org&nbsp;&nbsp;|&nbsp;&nbsp;arizonachristiantuition.com&nbsp;&nbsp;|&nbsp;&nbsp;my.actsto.org
      </p>

      <section>
        <h2>1. Overview</h2>
        <p className="mt-3 text-muted-foreground">
          This Communication Policy governs all electronic communications sent by Arizona Christian Tuition (&quot;ACT&quot;)
          to users of our platforms including actsto.org, arizonachristiantuition.com, and my.actsto.org. It applies to all user
          types: Parents, Students, Individual Donors, and Business/Corporate Donors. ACT uses Twilio, Inc. as its SMS and
          voice provider. All messaging is registered under the CTIA A2P 10DLC framework and complies with the Telephone
          Consumer Protection Act (TCPA), 47 U.S.C. § 227, and FCC regulations.
        </p>
      </section>

      <section>
        <h2>2. SMS / Text Message Communications</h2>
        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">2.1 A2P 10DLC Registration</h3>
        <p className="mt-3 text-muted-foreground">
          All SMS messages from ACT are sent through Twilio&apos;s registered A2P 10DLC program via The Campaign Registry
          (TCR). ACT operates the following message programs:
        </p>
        <ul className="text-muted-foreground">
          <li>
            <strong className="text-foreground">Transactional:</strong> donation receipts, scholarship award notices, OTP
            verification codes, account alerts.
          </li>
          <li>
            <strong className="text-foreground">Operational:</strong> campaign deadline reminders, application status updates,
            funding milestone alerts.
          </li>
          <li>
            <strong className="text-foreground">Marketing:</strong> annual giving reminders and campaign spotlights — sent
            only to opted-in subscribers.
          </li>
        </ul>

        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">2.2 Opt-In Consent</h3>
        <p className="mt-3 text-muted-foreground">
          ACT collects explicit written consent before sending any SMS. The following disclosure appears on all forms where a
          mobile number is collected:
        </p>
        <blockquote className="mt-3 border-l-4 border-primary/40 bg-muted/40 py-3 pl-4 pr-3 text-sm text-muted-foreground">
          &quot;By providing your mobile phone number and checking the opt-in box, you consent to receive recurring automated
          text messages from Arizona Christian Tuition (ACT) at the number provided, including donation receipts, campaign
          updates, and account alerts. Consent is not required to donate or use our services. Message and data rates may
          apply. Message frequency varies. Reply STOP to opt out. Reply HELP for assistance. Privacy Policy:{" "}
          <a
            href="https://arizonachristiantuition.com/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            arizonachristiantuition.com/privacy-policy
          </a>
          .&quot;
        </blockquote>
        <p className="mt-3 text-muted-foreground">
          ACT retains records of all opt-in consents including timestamp, IP address, and disclosure version.
        </p>

        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">2.3 Opt-Out</h3>
        <ul className="text-muted-foreground">
          <li>
            Reply STOP to any ACT text message. ACT will confirm: &quot;You have been unsubscribed from ACT messages.
            Contact (602) 421-8301 or hello@actsto.org for support.&quot;
          </li>
          <li>Update preferences at my.actsto.org under Communication Settings.</li>
          <li>
            Email{" "}
            <a href="mailto:hello@actsto.org" className="text-primary underline-offset-4 hover:underline">
              hello@actsto.org
            </a>{" "}
            with subject &quot;SMS OPT-OUT&quot; and your mobile number.
          </li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          Opt-out requests are processed within 24 hours. Transactional messages (e.g., donation receipts, OTP codes) may
          still be sent as required to complete a transaction.
        </p>

        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">2.4 HELP Response</h3>
        <p className="mt-3 text-muted-foreground">
          &quot;ACT Help: Arizona Christian Tuition SMS Program. Support: (602) 421-8301 or hello@actsto.org. Reply STOP to
          cancel. Msg &amp; Data rates may apply.&quot;
        </p>

        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">2.5 Message Frequency</h3>
        <ul className="text-muted-foreground">
          <li>
            <strong className="text-foreground">Transactional messages:</strong> sent as triggered by account events.
          </li>
          <li>
            <strong className="text-foreground">Operational messages:</strong> up to 4 per month during active campaign
            periods.
          </li>
          <li>
            <strong className="text-foreground">Marketing messages:</strong> up to 2 per month for opted-in subscribers.
          </li>
        </ul>

        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">2.6 Quiet Hours</h3>
        <p className="mt-3 text-muted-foreground">
          ACT will not send promotional SMS or initiate outbound calls before 8:00 AM or after 9:00 PM in the
          recipient&apos;s local time zone, or before 9:00 AM on weekends and federal holidays.
        </p>

        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">2.7 Prohibited SMS Content</h3>
        <p className="mt-3 text-muted-foreground">
          ACT will never send SMS containing financial advice, sexually explicit content, deceptive tax credit claims,
          harassment, or any content violating CTIA guidelines or Twilio&apos;s Acceptable Use Policy.
        </p>
      </section>

      <section>
        <h2>3. Voice Communications</h2>
        <ul className="mt-3 text-muted-foreground">
          <li>
            ACT may initiate outbound voice calls for donation confirmations, scholarship award notifications, support
            callbacks, and appointment reminders.
          </li>
          <li>
            ACT does not use autodialers or pre-recorded messages for marketing without prior express written consent.
          </li>
          <li>
            Calls to (602) 421-8301 may be recorded for quality assurance. Callers are notified at the start of the call.
            Recordings are retained for 24 months.
          </li>
          <li>
            To opt out of voice contact, email{" "}
            <a href="mailto:hello@actsto.org" className="text-primary underline-offset-4 hover:underline">
              hello@actsto.org
            </a>{" "}
            or update preferences at my.actsto.org.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Email Communications</h2>
        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">4.1 Email Categories</h3>
        <ul className="text-muted-foreground">
          <li>
            <strong className="text-foreground">Transactional:</strong> donation receipts, tax credit letters, scholarship
            awards, OTP, password resets.
          </li>
          <li>
            <strong className="text-foreground">Operational:</strong> campaign deadline reminders, application status updates,
            required compliance notices.
          </li>
          <li>
            <strong className="text-foreground">Marketing/Newsletters:</strong> mission updates, campaign spotlights, donor
            impact reports — opt-in only.
          </li>
          <li>
            <strong className="text-foreground">Administrative:</strong> Policy updates and mandatory regulatory
            notifications.
          </li>
        </ul>
        <h3 className="mt-4 font-heading text-base font-semibold text-foreground">4.2 CAN-SPAM Compliance</h3>
        <p className="mt-3 text-muted-foreground">
          All marketing emails include ACT&apos;s legal name and address, a functional unsubscribe link, accurate sender
          information, and an honest subject line. Unsubscribe requests are honored within 10 business days. Transactional and
          administrative emails cannot be suppressed as they are required by law or contract.
        </p>
      </section>

      <section>
        <h2>5. In-App Notifications</h2>
        <p className="mt-3 text-muted-foreground">
          Users of my.actsto.org may receive in-app and push notifications for campaign funding milestones, new donor
          contributions, scholarship status changes, and system announcements. Manage notification preferences at
          my.actsto.org/settings/notifications.
        </p>
      </section>

      <section>
        <h2>6. Donor Tax Credit Communications</h2>
        <p className="mt-3 text-muted-foreground">
          As a certified Arizona STO, ACT is required by law to provide the following communications regardless of opt-out
          status:
        </p>
        <ul className="text-muted-foreground">
          <li>Immediate donation receipts upon payment, including amount, date, campaign, and ACT&apos;s EIN.</li>
          <li>Annual tax acknowledgment letters issued prior to April 15 for the preceding calendar year.</li>
          <li>Notifications of any donation corrections, refunds, or adjustments affecting tax credit claims.</li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          <strong className="text-foreground">Arizona Tax Credit Notice:</strong> Donations to ACT may qualify for a
          dollar-for-dollar Arizona state income tax credit under A.R.S. § 43-1089 (individuals) and A.R.S. § 43-1183
          (corporations). Consult a qualified tax professional regarding your specific situation. ACT is not a tax advisor.
        </p>
      </section>

      <section>
        <h2>7. User Roles and Communication</h2>
        <ul className="mt-3 text-muted-foreground">
          <li>
            <strong className="text-foreground">Parents:</strong> campaign updates, award notices, deadline reminders, tax
            credit letters.
          </li>
          <li>
            <strong className="text-foreground">Students (16+):</strong> account and scholarship status notifications with
            verifiable consent.
          </li>
          <li>
            <strong className="text-foreground">Individual Donors:</strong> donation receipts, tax credit reminders,
            opted-in campaign updates.
          </li>
          <li>
            <strong className="text-foreground">Business Donors:</strong> organizational contact communications, tax credit
            documentation.
          </li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          ACT does not send SMS, voice, or direct marketing to individuals under age 18. All communications for minor
          students are directed to the parent or legal guardian account holder.
        </p>
      </section>

      <section>
        <h2>8. Data Retention — Communication Records</h2>
        <ul className="mt-3 text-muted-foreground">
          <li>SMS message logs: 24 months.</li>
          <li>Voice call logs: 24 months.</li>
          <li>Email send logs: 36 months.</li>
          <li>Opt-in/opt-out records: 48 months or as required by law.</li>
        </ul>
      </section>

      <section>
        <h2>9. Violations and Complaints</h2>
        <p className="mt-3 text-muted-foreground">
          Users who believe they have received communications that violate this Policy should email{" "}
          <a href="mailto:hello@actsto.org" className="text-primary underline-offset-4 hover:underline">
            hello@actsto.org
          </a>{" "}
          with subject &quot;Communication Complaint.&quot; ACT will investigate within 10 business days.
        </p>
      </section>

      <section>
        <h2>10. Policy Updates and Contact</h2>
        <p className="mt-3 text-muted-foreground">
          ACT may update this Policy at any time. Material changes will be communicated via email at least 14 days before
          taking effect.
        </p>
        <p className="mt-4 text-muted-foreground">
          <strong className="text-foreground">Arizona Christian Tuition</strong>
          <br />
          Phone: (602) 421-8301&nbsp;&nbsp;|&nbsp;&nbsp;Email:{" "}
          <a href="mailto:hello@actsto.org" className="text-primary underline-offset-4 hover:underline">
            hello@actsto.org
          </a>
          <br />
          Web:{" "}
          <a
            href="https://www.actsto.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            https://www.actsto.org
          </a>
          &nbsp;&nbsp;|&nbsp;&nbsp;App:{" "}
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
          This Communication Policy is effective as of April 1, 2026. © 2026 Arizona Christian Tuition. All rights reserved.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Related:{" "}
          <a href="/legal/privacy" className="text-primary underline-offset-4 hover:underline">
            Privacy Policy
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
