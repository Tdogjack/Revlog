import "server-only";
import type { CarDetail, CarPart, GarageCar, ServiceType } from "@/lib/api-types";
import { carTimeline } from "@/lib/car-timeline";
import { getBuildPostId } from "@/lib/community";
import { listCostItems, summarizeCosts, type CostSummary } from "@/lib/costs";
import { getEmailSettings } from "@/lib/email-settings";
import { isEmailVerified } from "@/lib/email-verification";
import { listPhotosForVehicle, PHOTO_LIMITS } from "@/lib/gallery";
import { modCategoryLabel } from "@/lib/mod-categories";
import { listMods } from "@/lib/mods";
import { listPartsForVehicle, type PartWithHistory } from "@/lib/parts";
import { signedPhotoUrls } from "@/lib/photos";
import { listAllReminders, listReminders } from "@/lib/reminder-store";
import { carUrgency, describeDue, rankReminders } from "@/lib/reminders";
import { categoryLabel, SERVICE_CATEGORIES } from "@/lib/service-categories";
import { listServiceDates, listServiceRecords } from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, listMileageReadings, listVehicles, vehicleName } from "@/lib/vehicles";

const partView = (p: PartWithHistory): CarPart => ({
  id: p.id,
  name: p.name,
  url: p.url,
  quantity: p.quantity,
  price: p.price,
  trackPrice: p.trackPrice,
  lowestPrice: p.lowestPrice,
  priceError: p.lastCheckError,
});

export async function garageView(userId: string): Promise<GarageCar[]> {
  const cars = await listVehicles(userId);
  const [photos, reminders, services, settings] = await Promise.all([
    signedPhotoUrls(cars.map((c) => c.photoPath)),
    listAllReminders(userId),
    listServiceDates(userId),
    getEmailSettings(userId),
  ]);
  return cars.map((car) => ({
    id: car.id,
    name: vehicleName(car),
    nickname: car.nickname,
    currentMileage: car.currentMileage,
    favorite: car.favorite,
    photoUrl: (car.photoPath && photos.get(car.photoPath)) || null,
    urgency: carUrgency(
      rankReminders(
        reminders.filter((r) => r.vehicleId === car.id),
        car,
        services,
        { dueSoonPercent: settings.reminderPercent },
      ),
    ),
  }));
}

export async function costsView(userId: string): Promise<CostSummary> {
  const [items, cars, customTypes] = await Promise.all([
    listCostItems(userId),
    listVehicles(userId),
    listServiceTypes(userId),
  ]);
  return summarizeCosts(
    items,
    cars.map((car) => ({ id: car.id, name: car.nickname ?? vehicleName(car) })),
    customTypes,
    new Date(),
  );
}

export async function carView(userId: string, vehicleId: string): Promise<CarDetail | null> {
  const car = await getVehicle(userId, vehicleId);
  if (!car) return null;

  const [
    records,
    mods,
    buildPostId,
    readings,
    reminders,
    types,
    parts,
    gallery,
    settings,
    canUpload,
  ] = await Promise.all([
    listServiceRecords(userId, car.id),
    listMods(userId, car.id),
    getBuildPostId(userId, car.id),
    listMileageReadings(userId, car.id),
    listReminders(userId, car.id),
    listServiceTypes(userId),
    listPartsForVehicle(userId, car.id),
    listPhotosForVehicle(userId, car.id),
    getEmailSettings(userId),
    isEmailVerified(userId),
  ]);
  const urls = await signedPhotoUrls([car.photoPath, ...gallery.map((p) => p.storagePath)]);
  const ranked = rankReminders(reminders, car, records, {
    dueSoonPercent: settings.reminderPercent,
  });

  return {
    id: car.id,
    name: vehicleName(car),
    year: car.year,
    make: car.make,
    model: car.model,
    trim: car.trim,
    nickname: car.nickname,
    vin: car.vin,
    builtOn: car.builtOn,
    currentMileage: car.currentMileage,
    favorite: car.favorite,
    photoUrl: (car.photoPath && urls.get(car.photoPath)) || null,
    reminders: ranked.map(({ reminder, result }) => ({
      id: reminder.id,
      task: reminder.task,
      serviceCategory: reminder.serviceCategory,
      intervalMiles: reminder.intervalMiles,
      intervalMonths: reminder.intervalMonths,
      status: result.status,
      due: describeDue(result),
    })),
    records: records.map((r) => ({
      id: r.id,
      category: r.category,
      categoryLabel: categoryLabel(r.category, types),
      title: r.title,
      servicedOn: r.servicedOn,
      mileage: r.mileage,
      cost: r.cost,
      shop: r.shop,
      notes: r.notes,
      partCount: parts.filter((p) => p.serviceRecordId === r.id).length,
      parts: parts.filter((p) => p.serviceRecordId === r.id).map(partView),
    })),
    mods: mods.map((m) => ({
      id: m.id,
      part: m.part,
      brand: m.brand,
      category: m.category,
      categoryLabel: modCategoryLabel(m.category),
      status: m.status,
      cost: m.cost,
      installedOn: m.installedOn,
      installedMileage: m.installedMileage,
      notes: m.notes,
      parts: parts.filter((p) => p.modId === m.id).map(partView),
    })),
    buildPostId,
    timeline: carTimeline({
      currentMileage: car.currentMileage,
      readings,
      records,
      mods,
      reminders: ranked.map(({ reminder }) => reminder),
      href: (kind, itemId) =>
        `/car/${car.id}/${{ service: "service", mod: "mods", reminder: "reminders" }[kind]}/${itemId}`,
    }),
    photos: gallery.flatMap((p) => {
      const url = urls.get(p.storagePath);
      return url ? [{ id: p.id, url, recordId: p.serviceRecordId, modId: p.modId }] : [];
    }),
    photoLimit: PHOTO_LIMITS.build,
    canUpload,
  };
}

export async function serviceTypesView(userId: string): Promise<ServiceType[]> {
  const custom = await listServiceTypes(userId);
  return [
    ...SERVICE_CATEGORIES.map(({ value, label }) => ({ value, label })),
    ...custom.map((t) => ({ value: t.id, label: t.name })),
  ];
}
