import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "../(auth)/auth-form";
import { unsubscribe } from "./actions";
import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata: Metadata = { title: "Unsubscribe · Revlog" };

// Linked from reminder emails. It asks for a click rather than unsubscribing
// on load, so link scanners in mail apps can't unsubscribe people.
export default function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  return (
    <AuthShell>
      <h1 className="text-lg font-semibold">Reminder emails</h1>
      <Suspense fallback={null}>
        <FormWithToken searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function FormWithToken({ searchParams }: Pick<PageProps<"/unsubscribe">, "searchParams">) {
  const { t } = await searchParams;
  return <UnsubscribeForm action={unsubscribe.bind(null, typeof t === "string" ? t : "")} />;
}
