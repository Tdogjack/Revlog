import { Suspense } from "react";
import { CarSkeleton, DemoCarView } from "./[carId]/car-view";

// Like the real garage, the demo opens straight on a car, with the others in
// the chip row above it.
export default function DemoGaragePage() {
  return (
    <Suspense fallback={<CarSkeleton />}>
      <DemoCarView />
    </Suspense>
  );
}
