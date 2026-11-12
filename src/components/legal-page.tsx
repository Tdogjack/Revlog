import { Brand, TopBar } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { LEGAL_UPDATED } from "@/lib/site";

// Shared frame for the privacy policy and terms.
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <TopBar>
        <Brand />
      </TopBar>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-steel">Last updated {LEGAL_UPDATED}</p>
        <div className="legal mt-8 space-y-4 leading-relaxed text-chalk/90">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
