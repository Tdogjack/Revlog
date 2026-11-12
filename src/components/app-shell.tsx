import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Brand, DesktopNav, TabBar, TopBar, type NavItem } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { getUser } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { listVehicles, vehicleName } from "@/lib/vehicles";

const NAV: NavItem[] = [
  { href: "/garage", label: "Garage", icon: "garage" },
  { href: "/community", label: "Community", icon: "community" },
  { href: "/garage/costs", label: "Costs", icon: "costs" },
];
const SIGNED_IN_TABS: NavItem[] = [
  ...NAV,
  { href: "/garage/settings", label: "Settings", icon: "account" },
];

// Header, phone tab bar, and footer for signed-in areas (garage) and the
// public community.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <TopBar>
        <div className="flex min-w-0 items-center gap-x-4">
          <Brand />
          <DesktopNav items={NAV} />
          <Suspense fallback={null}>
            <CarLinks />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <AccountMenu />
        </Suspense>
      </TopBar>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 md:py-10">{children}</main>
      <SiteFooter />
      <Suspense fallback={null}>
        <ShellTabs />
      </Suspense>
    </div>
  );
}

async function ShellTabs() {
  const user = await getUser();
  // Signed out, the header's Log in and Sign up are the way forward.
  if (!user) return null;
  return <TabBar items={SIGNED_IN_TABS} />;
}

// Jump straight to a car without stopping at the garage. Wide screens only;
// on a phone the garage list is one tap away in the tab bar.
async function CarLinks() {
  const user = await getUser();
  if (!user) return null;
  const cars = await listVehicles(user.id);
  if (cars.length === 0) return null;

  return (
    <div className="hidden min-w-0 items-center gap-1 overflow-x-auto border-l border-graphite pl-3 lg:flex">
      {cars.map((car) => (
        <Link
          key={car.id}
          href={`/garage/${car.id}`}
          title={vehicleName(car)}
          className="nav-link max-w-44 shrink-0"
        >
          <span className="truncate">{car.nickname ?? `${car.make} ${car.model}`}</span>
        </Link>
      ))}
    </div>
  );
}

async function AccountMenu() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="flex shrink-0 items-center gap-x-1">
        <Link href="/login" className="nav-link">
          Log in
        </Link>
        <Link href="/signup" className="btn btn-primary">
          Sign up
        </Link>
      </div>
    );
  }

  // Accounts from before usernames existed pick one before going further.
  const profile = await getProfile(user.id);
  if (!profile) redirect("/username");

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-x-1">
      <Link href={`/u/${profile.username}`} className="nav-link max-w-40">
        <span className="truncate">@{profile.username}</span>
      </Link>
      <Link href="/garage/settings" className="nav-link hidden md:inline-flex">
        Settings
      </Link>
      <form action={signOut} className="hidden md:block">
        <button type="submit" className="nav-link">
          Log out
        </button>
      </form>
    </div>
  );
}
