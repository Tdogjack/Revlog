import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of service · Revlog" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <p>
        These terms cover your use of Revlog, on the website and in its mobile apps. By creating an
        account or using Revlog, you agree to them. If you don&apos;t agree, please don&apos;t use
        Revlog.
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
        permission to store, process, and show it to you so the service can work. When you post,
        comment, or like in the community, you also give Revlog a free, worldwide permission to show
        that content to other people on Revlog until you delete it or it&apos;s removed. Revlog
        doesn&apos;t use your content for anything else. Only add photos and content you have the
        right to use. See the <Link href="/privacy">privacy policy</Link> for how your data is
        handled.
      </p>

      <h2 id="community">Community rules</h2>
      <p>
        Revlog has zero tolerance for objectionable content and abusive users. In the community,
        including usernames, posts, comments, and photos, don&apos;t share:
      </p>
      <ul>
        <li>harassment, threats, bullying, or hate aimed at any person or group;</li>
        <li>sexual or pornographic content, or anything that sexualizes a minor;</li>
        <li>graphic violence, or encouragement of violence or self-harm;</li>
        <li>content promoting illegal activity, such as street racing or stolen parts;</li>
        <li>spam, scams, or misleading links;</li>
        <li>someone else&apos;s private information, or content you don&apos;t have the right to share.</li>
      </ul>
      <p>
        Use the menu on any post, comment, or profile to report it, or to block the person behind
        it. Blocking hides their posts and comments from you and stops them liking or commenting on
        your posts. Moderators are told about reports and blocks.
      </p>
      <p>
        Revlog filters community text automatically and reviews reports within 24 hours. Revlog may
        remove content and suspend or close the accounts responsible, with or without notice.
        Content reported by several people may be hidden until it&apos;s reviewed. To appeal or to
        report a copyright problem, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
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

      <h2>AI scanning</h2>
      <p>
        Scanning is optional, and Revlog asks your permission first. Files you scan are sent to
        Anthropic&apos;s AI service to be read, as the{" "}
        <Link href="/privacy#ai-scanning">privacy policy</Link> explains. AI can misread things, so
        check every value before saving it. Only scan files you have the right to share.
      </p>

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
        maintenance, inaccurate reminders, prices, or scans, content posted by other users, or lost
        data. Some places don&apos;t allow
        these limits, so they may not all apply to you.
      </p>

      <h2>Mobile apps</h2>
      <p>
        You may install and use Revlog&apos;s mobile apps for your own personal use on devices you
        own or control, as the rules of the store you got them from allow. For an app from
        Apple&apos;s App Store:
      </p>
      <ul>
        <li>
          These terms are between you and Revlog&apos;s operator, not Apple. Revlog&apos;s operator,
          not Apple, is responsible for the app, its content, its maintenance, and its support.
        </li>
        <li>
          If the app doesn&apos;t meet a warranty that applies by law, you can tell Apple, and Apple
          will refund any price you paid for it. Apple has no other warranty duty for the app.
        </li>
        <li>
          Revlog&apos;s operator, not Apple, handles any claims about the app, including product
          liability, legal or regulatory compliance, consumer protection, privacy, and claims that
          the app infringes someone&apos;s intellectual property.
        </li>
        <li>
          You confirm you aren&apos;t in a country under a U.S. government embargo or listed as a
          terrorist-supporting country, and aren&apos;t on any U.S. government list of prohibited
          or restricted parties.
        </li>
        <li>
          You must follow any third-party terms that apply when you use the app, such as those of
          your wireless carrier.
        </li>
        <li>
          Apple and its subsidiaries are third-party beneficiaries of these terms and can enforce
          them against you once you accept them.
        </li>
      </ul>
      <p>Google Play&apos;s terms also apply to apps you get from Google Play.</p>

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
