import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Gauge } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { SiteFooter } from "@/components/site-footer";
import { getUser } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";

const NAV = [
  { href: "/garage", label: "Garage" },
  { href: "/community", label: "Community" },
  { href: "/garage/costs", label: "Costs" },
];

// Header and footer for signed-in areas (garage) and the public community.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-graphite">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
              <Gauge className="h-5 w-5 text-redline" aria-hidden />
              <span>
                Rev<span className="text-redline">log</span>
              </span>
            </Link>
            <div className="flex items-center gap-x-4 text-sm">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="inline-flex min-h-9 items-center text-steel hover:text-chalk">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <Suspense fallback={null}>
            <AccountMenu />
          </Suspense>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}

async function AccountMenu() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="flex items-center gap-x-4 text-sm">
        <Link href="/login" className="inline-flex min-h-9 items-center text-steel hover:text-chalk">
          Log in
        </Link>
        <Link
          href="/signup"
          className="btn btn-primary"
        >
          Sign up
        </Link>
      </div>
    );
  }

  // Accounts from before usernames existed pick one before going further.
  const profile = await getProfile(user.id);
  if (!profile) redirect("/username");

  return (
    <div className="flex items-center gap-x-4 text-sm">
      <Link href={`/u/${profile.username}`} className="inline-flex min-h-9 items-center text-steel hover:text-chalk">
        @{profile.username}
      </Link>
      <Link href="/garage/settings" className="inline-flex min-h-9 items-center text-steel hover:text-chalk">
        Settings
      </Link>
      <form action={signOut}>
        <button type="submit" className="inline-flex min-h-9 items-center text-steel hover:text-chalk">
          Log out
        </button>
      </form>
    </div>
  );
}
