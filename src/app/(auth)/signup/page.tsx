import type { Metadata } from "next";
import { signUp } from "../actions";
import { SignupForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign up · Revlog" };

export default function SignupPage() {
  return <SignupForm action={signUp} />;
}
