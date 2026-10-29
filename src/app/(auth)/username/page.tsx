import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { chooseUsername } from "../actions";
import { AuthShell, ChooseUsernameForm } from "../auth-form";

export const metadata: Metadata = { title: "Pick a username · Revlog" };

export default function UsernamePage({ searchParams }: PageProps<"/username">) {
  return (
    <Suspense fallback={<AuthShell>{null}</AuthShell>}>
      <UsernameForUser searchParams={searchParams} />
    </Suspense>
  );
}

async function UsernameForUser({ searchParams }: Pick<PageProps<"/username">, "searchParams">) {
  const [user, { next }] = await Promise.all([requireUser(), searchParams]);
  // Only paths inside the app, never another site.
  const nextPath =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  if (await getProfile(user.id)) redirect(nextPath ?? "/garage");
  return <ChooseUsernameForm action={chooseUsername} next={nextPath} />;
}
