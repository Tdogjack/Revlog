import type { Metadata } from "next";
import { requestPasswordReset } from "../actions";
import { ForgotPasswordForm } from "../auth-form";

export const metadata: Metadata = { title: "Reset password · Revlog" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm action={requestPasswordReset} />;
}
