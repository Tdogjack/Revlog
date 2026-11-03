import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
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
    // Build date from the door jamb sticker, when the owner knows it.
    builtOn: date("built_on"),
    // Favorites list first; then the user's own order (null until they reorder).
    favorite: boolean("favorite").notNull().default(false),
    position: integer("position"),
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

// Odometer readings over time, one per car per day, for the mileage graph.
// Written whenever the owner sets the car's mileage.
export const mileageReadings = pgTable(
  "mileage_readings",
  {
    ...ownerColumns,
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    readOn: date("read_on").notNull(),
    mileage: integer("mileage").notNull(),
  },
  (t) => [
    uniqueIndex("mileage_readings_vehicle_day_idx").on(t.vehicleId, t.readOn),
    ownerPolicy("mileage_readings"),
  ],
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

// Parts used for a service or wanted/used for a mod. Each part belongs to
// exactly one mod or one service record. With trackPrice on, a daily job
// reads the price from the link and records it in part_prices.
export const parts = pgTable(
  "parts",
  {
    ...ownerColumns,
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    modId: uuid("mod_id").references(() => mods.id, { onDelete: "cascade" }),
    serviceRecordId: uuid("service_record_id").references(() => serviceRecords.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    url: text("url"),
    quantity: integer("quantity").notNull().default(1),
    // The price the user entered, or the latest one found at the link.
    price: numeric("price", { precision: 10, scale: 2 }),
    currency: text("currency"),
    trackPrice: boolean("track_price").notNull().default(false),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastCheckError: text("last_check_error"),
  },
  (t) => [
    check(
      "parts_one_parent",
      sql`(${t.modId} is not null)::int + (${t.serviceRecordId} is not null)::int = 1`,
    ),
    ownerPolicy("parts"),
  ],
).enableRLS();

export const partPrices = pgTable(
  "part_prices",
  {
    ...ownerColumns,
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency"),
  },
  () => [ownerPolicy("part_prices")],
).enableRLS();

// One row per user who has changed their email preferences; no row means
// the defaults (reminder emails on).
export const emailSettings = pgTable(
  "email_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .default(sql`auth.uid()`)
      .references(() => authUsers.id, { onDelete: "cascade" }),
    reminderEmails: boolean("reminder_emails").notNull().default(true),
    // When set, a reminder counts as due soon once this share of its mileage
    // interval is used (e.g. 80 = 80%), in place of the 500-mile rule.
    reminderPercent: integer("reminder_percent"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  () => [ownerPolicy("email_settings")],
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

// One row per receipt scan, so each user gets a daily cap on AI calls.
export const receiptScans = pgTable(
  "receipt_scans",
  {
    ...ownerColumns,
  },
  (t) => [index("receipt_scans_user_created_idx").on(t.userId, t.createdAt), ownerPolicy("receipt_scans")],
).enableRLS();

// Public identity for community features. Usernames are stored lowercase.
export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .default(sql`auth.uid()`)
      .references(() => authUsers.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("profiles_username_idx").on(t.username), ownerPolicy("profiles")],
).enableRLS();

// Private photos in the vehicle-photos bucket: the build library (no mod or
// record), photos of a mod, or receipts for a service record.
export const photos = pgTable(
  "photos",
  {
    ...ownerColumns,
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    modId: uuid("mod_id").references(() => mods.id, { onDelete: "cascade" }),
    serviceRecordId: uuid("service_record_id").references(() => serviceRecords.id, {
      onDelete: "cascade",
    }),
    storagePath: text("storage_path").notNull(),
    caption: text("caption"),
  },
  (t) => [
    check("photos_one_parent", sql`num_nonnulls(${t.modId}, ${t.serviceRecordId}) <= 1`),
    ownerPolicy("photos"),
  ],
).enableRLS();

export const postKind = pgEnum("post_kind", ["build", "mod"]);

// Community posts. Anyone can read them (through the server); only the
// owner can change them.
export const posts = pgTable(
  "posts",
  {
    ...ownerColumns,
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    modId: uuid("mod_id").references(() => mods.id, { onDelete: "set null" }),
    kind: postKind("kind").notNull(),
    // What the post is about (see post-tags.ts); kind says whether it's tied to a mod.
    // A "build" tag marks the car's public build, which is kept up to date.
    tag: text("tag").notNull().default("build"),
    title: text("title").notNull(),
    body: text("body"),
    // When on, the post lists the mod's (or build's) parts with their links.
    showParts: boolean("show_parts").notNull().default(false),
  },
  (t) => [
    // One public build per car.
    uniqueIndex("posts_one_build_per_car_idx")
      .on(t.vehicleId)
      .where(sql`${t.tag} = 'build'`),
    ownerPolicy("posts"),
  ],
).enableRLS();

// Public copies of photos attached to a post, in the community-photos bucket.
export const postPhotos = pgTable(
  "post_photos",
  {
    ...ownerColumns,
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    position: integer("position").notNull().default(0),
  },
  () => [ownerPolicy("post_photos")],
).enableRLS();

// One like per person per post.
export const postLikes = pgTable(
  "post_likes",
  {
    ...ownerColumns,
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("post_likes_post_user_idx").on(t.postId, t.userId),
    ownerPolicy("post_likes"),
  ],
).enableRLS();

export const postComments = pgTable(
  "post_comments",
  {
    ...ownerColumns,
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
  },
  (t) => [index("post_comments_post_idx").on(t.postId, t.createdAt), ownerPolicy("post_comments")],
).enableRLS();

export type Vehicle = typeof vehicles.$inferSelect;
export type ServiceRecord = typeof serviceRecords.$inferSelect;
export type Mod = typeof mods.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type ServiceType = typeof serviceTypes.$inferSelect;
export type MileageReading = typeof mileageReadings.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type PartPrice = typeof partPrices.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Post = typeof posts.$inferSelect;
