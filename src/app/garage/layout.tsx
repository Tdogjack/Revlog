import { AppShell } from "@/components/app-shell";

export default function GarageLayout({ children }: LayoutProps<"/garage">) {
  return <AppShell>{children}</AppShell>;
}
