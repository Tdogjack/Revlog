import { Barlow_Condensed } from "next/font/google";
import { AppShell } from "@/components/app-shell";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export default function GarageLayout({ children }: LayoutProps<"/garage">) {
  return (
    <div className={`${barlowCondensed.variable} flex flex-1 flex-col`}>
      <AppShell>{children}</AppShell>
    </div>
  );
}
