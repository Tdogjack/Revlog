import type { Metadata } from "next";
import { signUp } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign up · Revlog" };

export default function SignupPage() {
  return <AuthForm mode="signup" action={signUp} />;
}
