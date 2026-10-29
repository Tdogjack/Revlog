import { AppShell } from "@/components/app-shell";

export default function CommunityLayout({ children }: LayoutProps<"/community">) {
  return <AppShell>{children}</AppShell>;
}
