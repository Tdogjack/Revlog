import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-graphite py-6 text-center text-xs text-steel">
      <span>© Revlog</span>
      <span className="mx-2" aria-hidden>
        ·
      </span>
      <Link href="/privacy" className="hover:text-chalk">
        Privacy
      </Link>
      <span className="mx-2" aria-hidden>
        ·
      </span>
      <Link href="/terms" className="hover:text-chalk">
        Terms
      </Link>
    </footer>
  );
}
