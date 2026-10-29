import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of service · Revlog" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <p>
        These terms cover your use of Revlog. By creating an account or using the site, you agree to
        them. If you don&apos;t agree, please don&apos;t use Revlog.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You need to be at least 13 years old to use Revlog.</li>
        <li>Give a real email address you can receive mail at.</li>
        <li>
          Keep your password to yourself. You&apos;re responsible for what happens under your
          account.
        </li>
      </ul>

      <h2>Your content</h2>
      <p>
        What you add to Revlog (your cars, photos, records, and notes) stays yours. You give Revlog
        permission to store, process, and show it to you so the service can work, and nothing more.
        Only add photos and content you have the right to use. See the{" "}
        <Link href="/privacy">privacy policy</Link> for how your data is handled.
      </p>

      <h2>Acceptable use</h2>
      <p>Don&apos;t use Revlog to:</p>
      <ul>
        <li>break the law or infringe anyone else&apos;s rights;</li>
        <li>upload anything harmful, illegal, or that you don&apos;t have the right to share;</li>
        <li>
          add part links meant to attack, overload, or probe other websites or networks through
          Revlog&apos;s price checks;
        </li>
        <li>
          try to get into other accounts, interfere with the site, or scrape it with automated
          tools.
        </li>
      </ul>

      <h2>Reminders and prices are estimates</h2>
      <p>
        Revlog&apos;s reminders are based on the intervals, dates, and mileage you enter, so
        they&apos;re only as accurate as that information. They aren&apos;t professional advice and
        don&apos;t replace your vehicle manufacturer&apos;s maintenance schedule or a qualified
        mechanic. Emails can be delayed or missed, so don&apos;t rely on Revlog alone for
        safety-critical service. Part prices are read automatically from store pages and may be
        wrong or out of date; always check the price with the store before buying.
      </p>

      <h2>The service</h2>
      <p>
        Revlog is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any
        kind. Features may change, and the service may be interrupted or discontinued. If Revlog is
        ever shut down, users will get reasonable notice to save their information where possible.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent the law allows, Revlog and its operator aren&apos;t liable for
        indirect, incidental, or consequential damages, or for any loss arising from missed
        maintenance, inaccurate reminders or prices, or lost data. Some places don&apos;t allow
        these limits, so they may not all apply to you.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can delete your account at any time in Settings. Revlog may suspend or close accounts
        that break these terms.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated. The new version will be posted here with a new date, and
        significant changes will be announced by email. Continuing to use Revlog after a change
        means you accept the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
