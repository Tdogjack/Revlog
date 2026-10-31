import { Car } from "lucide-react";

type Props = { src?: string | null; alt: string; className?: string };

// Car photo, falling back to a car icon when there isn't one. The size and
// aspect ratio come from `className`.
export function VehiclePhoto({ src, alt, className = "h-14 w-14" }: Props) {
  if (!src) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-graphite ${className}`}
      >
        <Car className="h-1/2 w-1/2 text-steel" aria-hidden />
      </div>
    );
  }
  return (
    // Signed Supabase links expire, so they skip Next's image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`shrink-0 rounded-lg object-cover ${className}`} />
  );
}
