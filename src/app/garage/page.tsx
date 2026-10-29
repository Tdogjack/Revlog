import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Car, Gauge } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

export const metadata: Metadata = { title: "Your garage · Revlog" };

export default function GaragePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-graphite">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/garage" className="flex items-center gap-2 text-lg font-semibold">
            <Gauge className="h-5 w-5 text-redline" aria-hidden />
            <span>
              Rev<span className="text-redline">log</span>
            </span>
          </Link>
          <Suspense fallback={null}>
            <AccountMenu />
          </Suspense>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold">Your garage</h1>
        <div className="mt-8 rounded-xl border border-dashed border-graphite p-10 text-center">
          <Car className="mx-auto h-8 w-8 text-steel" aria-hidden />
          <h2 className="mt-4 font-medium">Add your first car</h2>
          <p className="mt-1 text-sm text-steel">
            Start a timeline of every service and mod for it.
          </p>
          <button
            type="button"
            className="mt-5 rounded-md bg-redline px-4 py-2 text-sm font-medium text-white hover:bg-redline-hover"
          >
            Add a car
          </button>
        </div>
      </main>
    </div>
  );
}

async function AccountMenu() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="hidden text-steel sm:inline">{user.email}</span>
      <form action={signOut}>
        <button type="submit" className="text-steel hover:text-chalk">
          Log out
        </button>
      </form>
    </div>
  );
}
