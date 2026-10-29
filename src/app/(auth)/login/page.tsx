import type { Metadata } from "next";
import { Suspense } from "react";
import { signIn } from "../actions";
import { LoginForm } from "../auth-form";

export const metadata: Metadata = { title: "Log in · Revlog" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoginForm action={signIn} />}>
      <LoginWithParams searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginWithParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, error } = await searchParams;
  return (
    <LoginForm
      action={signIn}
      next={typeof next === "string" ? next : undefined}
      linkError={typeof error === "string" ? error : undefined}
    />
  );
}
