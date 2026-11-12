import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Goes up one level, named for where it leads, in the accent like a native
// back button. It dims under the finger the moment it's pressed.
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="back-link">
      <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="truncate">{children}</span>
    </Link>
  );
}
