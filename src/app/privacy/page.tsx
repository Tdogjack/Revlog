import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy · Revlog" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        Revlog helps you track maintenance and modifications for your cars. This policy explains
        what information Revlog keeps, why, and what you can do about it. The short version: Revlog
        only keeps what it needs to run your garage, never sells your data, and doesn&apos;t use ads
        or tracking.
      </p>

      <h2>What Revlog collects</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your username, email address, and password. Passwords
          are stored as a secure hash by our sign-in provider; nobody at Revlog can see them.
        </li>
        <li>
          <strong>What you add:</strong> your cars (year, make, model, trim, nickname, VIN if you
          enter one, mileage, and photos), service records and receipt photos, mods and their
          photos, reminders, custom service types, and parts with their links and prices.
        </li>
        <li>
          <strong>Community posts:</strong> the title, text, and photos you choose to share.
        </li>
        <li>
          <strong>Price history:</strong> for parts with price tracking on, the prices Revlog reads
          from the links you added.
        </li>
        <li>
          <strong>Basic technical logs:</strong> our hosting provider keeps short-lived server logs
          (such as IP addresses and request times) to keep the site running and secure.
        </li>
      </ul>

      <h2>How it&apos;s used</h2>
      <ul>
        <li>To show you your garage and calculate when service is due.</li>
        <li>
          To send account emails (confirming your address, resetting your password) and, if you
          leave them on, reminder emails when a service is coming up.
        </li>
        <li>
          To check part prices. Revlog&apos;s servers visit the part links you add, so stores see a
          request from Revlog, not from you.
        </li>
        <li>
          To look up a VIN when you ask. The VIN is sent to the U.S. National Highway Traffic Safety
          Administration&apos;s free decoding service.
        </li>
      </ul>
      <p>Revlog doesn&apos;t sell or rent your information, and doesn&apos;t show ads.</p>

      <h2>What&apos;s public</h2>
      <p>
        Your garage is private. Only what you post to the community is public: your username, the
        post&apos;s title and text, the photos you pick for it, the car&apos;s year, make, model,
        trim, and nickname, and (for build posts) its list of installed mods, plus their parts,
        links, and prices if you choose to include them. Shared photos are copied to a public
        folder; the originals and your receipts stay private. Deleting a post removes it and its
        shared photos.
      </p>

      <h2>Who else handles it</h2>
      <p>Revlog uses a few service providers that process data on its behalf:</p>
      <ul>
        <li>
          <strong>Supabase</strong> for the database, sign-in, and photo storage.
        </li>
        <li>
          <strong>Vercel</strong> for hosting the website.
        </li>
        <li>
          <strong>Resend</strong> for sending email.
        </li>
      </ul>
      <p>
        Revlog may also share information if the law requires it, or to protect the safety of users
        or the service.
      </p>

      <h2>Cookies</h2>
      <p>
        Revlog only uses cookies needed to keep you signed in, plus a short-lived one while you
        reset your password. There are no analytics, advertising, or tracking cookies.
      </p>

      <h2>Keeping and deleting your data</h2>
      <p>
        Your data stays until you delete it. You can edit or delete any car, record, mod, reminder,
        or part at any time. To delete everything, go to Settings and choose Delete account; your
        account, cars, photos, and history are removed right away. Copies may remain in our
        providers&apos; backups for a short time before they expire.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Turn reminder emails off in Settings, or with the unsubscribe link in any reminder.</li>
        <li>Delete your account in Settings.</li>
        <li>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to ask for a copy of your
          data or with any other privacy request.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, car photos are private to your account, and the database only
        lets each account reach its own rows. No system is perfectly secure, so use a password you
        don&apos;t use anywhere else.
      </p>

      <h2>Children</h2>
      <p>
        Revlog isn&apos;t meant for children under 13, and doesn&apos;t knowingly collect their
        data.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the new version will be posted here with a new date. Significant
        changes will be announced by email.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
