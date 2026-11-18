import { Suspense } from "react";
import { CarSkeleton, DemoCarView } from "./car-view";

export default function DemoCarPage() {
  return (
    <Suspense fallback={<CarSkeleton />}>
      <DemoCarView />
    </Suspense>
  );
}
