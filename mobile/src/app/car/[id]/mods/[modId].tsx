import type { CarDetail } from "@revlog/api";
import { router, useLocalSearchParams } from "expo-router";
import { ModForm } from "@/components/mod-form";
import { toPartValues } from "@/components/parts-editor";
import { PhotoStrip } from "@/components/photo-strip";
import { Button, Heading, LoadFailed, Loading } from "@/components/ui";
import { useApi } from "@/lib/use-api";

const MOD_PHOTO_LIMIT = 10;

export default function EditMod() {
  const { id, modId } = useLocalSearchParams<{ id: string; modId: string }>();
  const { data: car, error, reload } = useApi<CarDetail>(`/vehicles/${id}`);

  if (!car) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;
  const mod = car.mods.find((m) => m.id === modId);
  if (!mod) return <LoadFailed message="That mod wasn't found." onRetry={reload} />;

  return (
    <ModForm
      carId={id}
      modId={modId}
      currentMileage={car.currentMileage}
      initialParts={mod.parts.map(toPartValues)}
      initial={{
        part: mod.part,
        brand: mod.brand ?? "",
        category: mod.category ?? "other",
        status: mod.status,
        cost: mod.cost ?? "",
        installedOn: mod.installedOn ?? "",
        installedMileage: mod.installedMileage?.toString() ?? "",
        notes: mod.notes ?? "",
      }}
    >
      <Heading>Photos</Heading>
      <PhotoStrip
        carId={id}
        kind="mod"
        targetId={modId}
        photos={car.photos.filter((p) => p.modId === modId)}
        limit={MOD_PHOTO_LIMIT}
        canUpload={car.canUpload}
        onChange={reload}
      />
      <Button
        label="Share this mod"
        kind="secondary"
        onPress={() =>
          router.push({
            pathname: "/post/new",
            params: { vehicleId: id, modId, title: mod.brand ? `${mod.brand} ${mod.part}` : mod.part },
          })
        }
      />
    </ModForm>
  );
}
