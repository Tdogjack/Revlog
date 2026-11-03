import Link from "next/link";
import { Suspense } from "react";
import { CarSkeleton, DemoCarView } from "./car-view";

export default function DemoCarPage() {
  return (
    <>
      <Link href="/demo" className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk">
        ← Back to garage
      </Link>
      <Suspense fallback={<CarSkeleton />}>
        <DemoCarView />
      </Suspense>
    </>
  );
}
