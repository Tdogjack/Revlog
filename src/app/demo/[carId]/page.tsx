import { BackLink } from "@/components/back-link";
import { Suspense } from "react";
import { CarSkeleton, DemoCarView } from "./car-view";

export default function DemoCarPage() {
  return (
    <>
      <BackLink href="/demo">Garage</BackLink>
      <Suspense fallback={<CarSkeleton />}>
        <DemoCarView />
      </Suspense>
    </>
  );
}
