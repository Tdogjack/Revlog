import type { Metadata } from "next";
import { Suspense } from "react";
import { signIn } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Log in · Revlog" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<AuthForm mode="login" action={signIn} />}>
      <LoginForm searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginForm({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  return <AuthForm mode="login" action={signIn} next={typeof next === "string" ? next : undefined} />;
}
