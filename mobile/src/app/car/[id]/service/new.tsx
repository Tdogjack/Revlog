import type { CarDetail } from "@revlog/api";
import { useLocalSearchParams } from "expo-router";
import { blankPart, toPartValues } from "@/components/parts-editor";
import { blankService, ServiceForm } from "@/components/service-form";
import { LoadFailed, Loading } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { useApi } from "@/lib/use-api";

export default function NewService() {
  const { id, reminderId, category, title, copyId } = useLocalSearchParams<{
    id: string;
    reminderId?: string;
    category?: string;
    title?: string;
    copyId?: string;
  }>();
  const car = useApi<CarDetail>(`/vehicles/${id}`);
  if (!car.data) {
    return car.error ? <LoadFailed message={car.error} onRetry={car.reload} /> : <Loading />;
  }

  // "Log again" starts from an existing record: everything carries over except
  // the date and mileage, which are what usually change.
  const source = copyId ? car.data.records.find((r) => r.id === copyId) : undefined;
  const reminder = reminderId ? car.data.reminders.find((r) => r.id === reminderId) : undefined;
  const note = source
    ? `Copied from ${source.title} on ${formatDate(source.servicedOn)}. Check the date and mileage, then save.`
    : reminder
      ? `Marking ${reminder.task} done. Check the date and mileage, then save.`
      : undefined;

  return (
    <ServiceForm
      carId={id}
      reminderId={reminderId}
      canUpload={car.data.canUpload}
      currentMileage={car.data.currentMileage}
      note={note}
      // Copied parts are saved as new ones, so they lose their ids.
      initialParts={source?.parts.map((p) => ({
        ...toPartValues(p),
        id: undefined,
        key: blankPart().key,
      }))}
      initial={{
        ...blankService(),
        category: source?.category ?? category ?? "",
        title: source?.title ?? title ?? "",
        // With parts, cost stays blank so it totals again at today's prices.
        cost: source && source.parts.length === 0 ? (source.cost ?? "") : "",
        shop: source?.shop ?? "",
        notes: source?.notes ?? "",
        // Most services get logged the day they happen, at today's mileage.
        mileage: String(car.data.currentMileage),
      }}
    />
  );
}
