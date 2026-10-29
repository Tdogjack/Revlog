import Link from "next/link";
import { Gauge } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { LEGAL_UPDATED } from "@/lib/site";

// Shared frame for the privacy policy and terms.
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-graphite">
        <nav className="mx-auto flex max-w-3xl items-center px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Gauge className="h-5 w-5 text-redline" aria-hidden />
            <span>
              Rev<span className="text-redline">log</span>
            </span>
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-steel">Last updated {LEGAL_UPDATED}</p>
        <div className="legal mt-8 space-y-4 leading-relaxed text-chalk/90">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
