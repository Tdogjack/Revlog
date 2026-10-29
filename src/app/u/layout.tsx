import { AppShell } from "@/components/app-shell";

export default function ProfileLayout({ children }: LayoutProps<"/u">) {
  return <AppShell>{children}</AppShell>;
}
