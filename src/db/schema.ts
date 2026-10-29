import { sql } from "drizzle-orm";
import {
  date,
  integer,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

// Every table carries user_id so row-level security can lock rows to their owner.
// Server code connects as the database owner (bypassing RLS), so it must still
// filter by user; RLS protects any direct access through the Supabase client.
const ownerColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .default(sql`auth.uid()`)
    .references(() => authUsers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

const ownerPolicy = (table: string) =>
  pgPolicy(`${table}_owner_all`, {
    for: "all",
    to: authenticatedRole,
    using: sql`${authUid} = user_id`,
    withCheck: sql`${authUid} = user_id`,
  });

export const vehicles = pgTable(
  "vehicles",
  {
    ...ownerColumns,
    year: integer("year").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    trim: text("trim"),
    nickname: text("nickname"),
    vin: text("vin"),
    currentMileage: integer("current_mileage").notNull().default(0),
    photoPath: text("photo_path"),
  },
  () => [ownerPolicy("vehicles")],
).enableRLS();

export const serviceRecords = pgTable(
  "service_records",
  {
    ...ownerColumns,
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    category: text("category").notNull(), // oil, brakes, tires, ...
    title: text("title").notNull(),
    servicedOn: date("serviced_on").notNull(),
    mileage: integer("mileage"),
    cost: numeric("cost", { precision: 10, scale: 2 }),
    shop: text("shop"),
    notes: text("notes"),
  },
  () => [ownerPolicy("service_records")],
).enableRLS();

// User-created service types, like "Transmission fluid". Service records and
// reminders refer to a type by key: a built-in slug ("oil") or one of these ids.
export const serviceTypes = pgTable(
  "service_types",
  {
    ...ownerColumns,
    name: text("name").notNull(),
  },
  (t) => [
    uniqueIndex("service_types_user_name_idx").on(t.userId, sql`lower(${t.name})`),
    ownerPolicy("service_types"),
  ],
).enableRLS();

export const modStatus = pgEnum("mod_status", ["planned", "installed", "removed"]);

export const mods = pgTable(
  "mods",
  {
    ...ownerColumns,
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    part: text("part").notNull(),
    brand: text("brand"),
    category: text("category"), // intake, suspension, wheels, ...
    status: modStatus("status").notNull().default("planned"),
    cost: numeric("cost", { precision: 10, scale: 2 }),
    installedOn: date("installed_on"),
    installedMileage: integer("installed_mileage"),
    notes: text("notes"),
  },
  () => [ownerPolicy("mods")],
).enableRLS();

export const reminders = pgTable(
  "reminders",
  {
    ...ownerColumns,
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    task: text("task").notNull(),
    // When set, logging a service record of this category resets the reminder.
    serviceCategory: text("service_category"),
    intervalMiles: integer("interval_miles"),
    intervalMonths: integer("interval_months"),
    lastDoneOn: date("last_done_on"),
    lastDoneMileage: integer("last_done_mileage"),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
  },
  () => [ownerPolicy("reminders")],
).enableRLS();

// Receipts and photos live in Supabase Storage; this table points at them.
export const attachments = pgTable(
  "attachments",
  {
    ...ownerColumns,
    serviceRecordId: uuid("service_record_id").references(() => serviceRecords.id, {
      onDelete: "cascade",
    }),
    modId: uuid("mod_id").references(() => mods.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type"),
  },
  () => [ownerPolicy("attachments")],
).enableRLS();

export type Vehicle = typeof vehicles.$inferSelect;
export type ServiceRecord = typeof serviceRecords.$inferSelect;
export type Mod = typeof mods.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type ServiceType = typeof serviceTypes.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
