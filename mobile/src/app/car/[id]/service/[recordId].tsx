import type { CarDetail } from "@revlog/api";
import { router, useLocalSearchParams } from "expo-router";
import { toPartValues } from "@/components/parts-editor";
import { PhotoStrip } from "@/components/photo-strip";
import { ServiceForm } from "@/components/service-form";
import { Button, Heading, LoadFailed, Loading } from "@/components/ui";
import { useApi } from "@/lib/use-api";

const RECEIPT_PHOTO_LIMIT = 5;

export default function EditService() {
  const { id, recordId } = useLocalSearchParams<{ id: string; recordId: string }>();
  const { data: car, error, reload } = useApi<CarDetail>(`/vehicles/${id}`);

  if (!car) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;
  const record = car.records.find((r) => r.id === recordId);
  if (!record) return <LoadFailed message="That record wasn't found." onRetry={reload} />;

  return (
    <ServiceForm
      carId={id}
      recordId={recordId}
      currentMileage={car.currentMileage}
      initialParts={record.parts.map(toPartValues)}
      initial={{
        category: record.category,
        title: record.title,
        servicedOn: record.servicedOn,
        mileage: record.mileage?.toString() ?? "",
        cost: record.cost ?? "",
        shop: record.shop ?? "",
        notes: record.notes ?? "",
      }}
    >
      <Heading>Receipts and photos</Heading>
      <PhotoStrip
        carId={id}
        targetId={recordId}
        photos={car.photos.filter((p) => p.recordId === recordId)}
        limit={RECEIPT_PHOTO_LIMIT}
        canUpload={car.canUpload}
        onChange={reload}
      />
      <Button
        label="Log this service again"
        kind="secondary"
        onPress={() =>
          router.replace({
            pathname: "/car/[id]/service/new",
            params: { id, copyId: recordId },
          })
        }
      />
    </ServiceForm>
  );
}
