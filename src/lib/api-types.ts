// What /api/v1 sends back. The phone app imports these as types only, so
// nothing from the server ends up in its bundle.

export type ReminderStatus = "ok" | "due_soon" | "overdue" | "unknown";

export type Tokens = { accessToken: string; refreshToken: string; expiresAt: number | null };

export type Me = {
  id: string;
  email: string | null;
  username: string | null;
  emailVerified: boolean;
  aiConsent: boolean;
  moderator: boolean;
};

export type GarageCar = {
  id: string;
  name: string;
  nickname: string | null;
  currentMileage: number;
  favorite: boolean;
  photoUrl: string | null;
  urgency: { status: ReminderStatus; count: number } | null;
};

export type CarReminder = {
  id: string;
  task: string;
  serviceCategory: string | null;
  intervalMiles: number | null;
  intervalMonths: number | null;
  status: ReminderStatus;
  due: string;
  // From the latest matching service record; both null when there isn't one.
  lastDoneOn: string | null;
  lastDoneMileage: number | null;
};

export type CarRecord = {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  servicedOn: string;
  mileage: number | null;
  cost: string | null;
  shop: string | null;
  notes: string | null;
  partCount: number;
  parts: CarPart[];
};

export type CarPart = {
  id: string;
  name: string;
  url: string | null;
  quantity: number;
  price: string | null;
  trackPrice: boolean;
  // The price when the part was added, to show how it has moved since.
  firstPrice: number | null;
  lowestPrice: number | null;
  lastCheckedAt: string | null;
  priceError: string | null;
};

export type ModStatus = "planned" | "installed" | "removed";

export type CarMod = {
  id: string;
  part: string;
  brand: string | null;
  category: string | null;
  categoryLabel: string;
  status: ModStatus;
  cost: string | null;
  installedOn: string | null;
  installedMileage: number | null;
  notes: string | null;
  parts: CarPart[];
};

// What a scan reads from a photo, for the person to check before saving.
export type ScannedPart = {
  name: string;
  url: string;
  quantity: string;
  price: string;
  trackPrice: boolean;
};

export type ExtraService = { category: string; title: string; cost: string };

export type ScannedReceipt = {
  values: Record<string, string>;
  parts: ScannedPart[];
  extras: ExtraService[];
};

export type ScannedMod = { values: Record<string, string>; parts: ScannedPart[] };

export type DraftRecord = {
  category: string;
  title: string;
  servicedOn: string;
  mileage: string;
  cost: string;
  shop: string;
  notes: string;
  parts: ScannedPart[];
};

export type ScannedHistory = { entries: DraftRecord[]; unreadable: string | null };

export type SaveHistoryResult =
  | { error: string; rowKey?: number }
  | { saved: { key: number; id: string }[] };

export type ModOptions = {
  categories: { value: string; label: string }[];
  statuses: { value: ModStatus; label: string }[];
};

export type CarPhoto = {
  id: string;
  url: string;
  recordId: string | null;
  modId: string | null;
};

export type TimelineKind = "service" | "mod" | "reading" | "due";

export type TimelinePoint = { t: number; miles: number };

export type TimelineEntry = {
  key: string;
  kind: TimelineKind;
  label: string;
  t: number;
  miles: number;
  estimated: boolean;
  overdue?: boolean;
  href?: string;
};

export type CarTimeline = {
  line: TimelinePoint[];
  events: TimelineEntry[];
  start: number;
  end: number;
  projection: TimelinePoint[] | null;
};

export type CarDetail = {
  id: string;
  name: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  vin: string | null;
  builtOn: string | null;
  currentMileage: number;
  favorite: boolean;
  photoUrl: string | null;
  reminders: CarReminder[];
  records: CarRecord[];
  mods: CarMod[];
  buildPostId: string | null;
  timeline: CarTimeline | null;
  photos: CarPhoto[];
  photoLimit: number;
  canUpload: boolean;
  // Usual intervals by service type, to fill in a new reminder.
  reminderIntervals: Record<string, ReminderInterval>;
};

export type ReminderInterval = { intervalMiles: number | null; intervalMonths: number | null };

export type Choice = { value: string; label: string; hint?: string };

// What the add-car form picks from.
export type CarCatalog = {
  makes: { name: string; models: string[] }[];
  driving: Choice[];
  roads: Choice[];
  conditions: Choice[];
  caution: Choice[];
  defaults: { driving: string; roads: string; conditions: string[]; caution: string };
};

// The reminders a new car would start with.
export type PlanPreview = {
  source: "make" | "general";
  makeName: string | null;
  adjustedFor: string[];
  items: { service: string; task: string; interval: string; usual: string | null }[];
};

export type PriceCheck = { error: string | null };

export type BuildDraft = {
  post: {
    id: string;
    title: string;
    body: string | null;
    showParts: boolean;
    photos: { id: string; url: string }[];
  } | null;
  defaultTitle: string;
  partCount: number;
  maxPhotos: number;
  gallery: { id: string; url: string }[];
};

export type Costs = {
  total: number;
  lastYear: number;
  serviceTotal: number;
  modsTotal: number;
  months: { month: string; label: string; service: number; mods: number }[];
  perCar: { id: string; name: string; service: number; mods: number }[];
  topCategories: { label: string; amount: number }[];
};

export type EmailSettings = { reminderEmails: boolean; reminderPercent: number | null };

export type ServiceType = { value: string; label: string };

export type FeedPost = {
  id: string;
  userId: string;
  username: string;
  tag: string;
  tagLabel: string;
  title: string;
  body: string | null;
  createdAt: string;
  carName: string;
  modName: string | null;
  // For the owner's edit screen.
  vehicleId: string;
  modId: string | null;
  showParts: boolean;
  photos: { id: string; url: string }[];
  likeCount: number;
  commentCount: number;
  liked: boolean;
};

export type PostComment = {
  id: string;
  userId: string;
  username: string;
  body: string;
  createdAt: string;
};

// What saving a post answers: its id, and which post photo each chosen
// garage photo became.
export type SavedPost = { id: string; added: Record<string, string> };

// A part a post shares, with its link and price when it has them.
export type SharedPart = {
  id: string;
  modId: string | null;
  name: string;
  url: string | null;
  quantity: number;
  price: string | null;
  currency: string | null;
};

// An installed mod on a build post's list.
export type BuildListMod = { id: string; name: string; categoryLabel: string };

export type PostDetail = {
  post: FeedPost;
  comments: PostComment[];
  // Part names only, kept for older app versions.
  parts: string[];
  sharedParts: SharedPart[];
  // A build post's installed mods, each with its shared parts by modId.
  buildList: BuildListMod[];
};

export type Feed = { posts: FeedPost[]; hasMore: boolean };

export type CommunityProfile = {
  userId: string;
  username: string;
  isOwn: boolean;
  blocked: boolean;
  suspended: boolean;
  posts: FeedPost[];
};

export type BlockedUser = { userId: string; username: string };

export type ReportKind = "post" | "comment" | "user";

export type OpenReport = {
  id: string;
  createdAt: string;
  targetType: ReportKind;
  targetId: string;
  reportedUserId: string | null;
  reportedUsername: string;
  contentSnapshot: string | null;
  reason: string;
  details: string | null;
  reporter: string | null;
  gone: boolean;
};

export type ModerationQueue = { reports: OpenReport[]; suspended: BlockedUser[] };

export type CommunityOptions = {
  defaultSort: string;
  sorts: { value: string; label: string }[];
  tags: { value: string; label: string }[];
  reasons: { value: string; label: string }[];
};
