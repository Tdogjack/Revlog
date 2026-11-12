import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { DemoBanner, DemoHeader, DemoTabBar } from "./demo-chrome";
import { DemoProvider } from "./demo-store";

export const metadata: Metadata = {
  title: "Demo garage · Revlog",
  description: "Try Revlog with three sample cars, no account needed.",
};

export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return (
    <DemoProvider>
      <div className="flex flex-1 flex-col">
        <DemoHeader />
        <DemoBanner />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 md:py-10">{children}</main>
        <SiteFooter />
        <DemoTabBar />
      </div>
    </DemoProvider>
  );
}
