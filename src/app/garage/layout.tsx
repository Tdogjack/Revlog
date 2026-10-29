import Link from "next/link";
import { Suspense } from "react";
import { Gauge } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

export default function GarageLayout({ children }: LayoutProps<"/garage">) {
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}

async function AccountMenu() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="hidden text-steel sm:inline">{user.email}</span>
      <Link href="/reset-password" className="text-steel hover:text-chalk">
        Change password
      </Link>
      <form action={signOut}>
        <button type="submit" className="text-steel hover:text-chalk">
          Log out
        </button>
      </form>
    </div>
  );
}
