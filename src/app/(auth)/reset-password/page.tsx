import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getUser } from "@/lib/auth";
import { updatePassword } from "../actions";
import { AuthShell, ResetPasswordForm } from "../auth-form";

export const metadata: Metadata = { title: "Set a new password · Revlog" };

// Reached from a reset email (the callback signs the user in first) or by a
// signed-in user changing their password.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell>{null}</AuthShell>}>
      <ResetForSignedInUser />
    </Suspense>
  );
}

async function ResetForSignedInUser() {
  const user = await getUser();
  if (!user) {
    return (
      <AuthShell>
        <h1 className="text-lg font-semibold">Link expired</h1>
        <p className="mt-3 text-sm text-steel">
          This page needs a fresh reset link.{" "}
          <Link href="/forgot-password" className="text-chalk hover:text-redline">
            Request a new one
          </Link>
          .
        </p>
      </AuthShell>
    );
  }
  return <ResetPasswordForm action={updatePassword} email={user.email ?? "your account"} />;
}
