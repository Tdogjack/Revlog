import Link from "next/link";

// Stands in for photo and scan controls until the account's email is confirmed.
export function ConfirmEmailNote({ action = "add photos" }: { action?: string }) {
  return (
    <p className="text-sm text-steel">
      Confirm your email to {action}.{" "}
      <Link href="/garage/settings" className="text-chalk underline underline-offset-2 hover:text-redline">
        Resend the link
      </Link>
    </p>
  );
}
