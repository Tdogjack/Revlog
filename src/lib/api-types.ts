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
  lowestPrice: number | null;
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
  photos: CarPhoto[];
  photoLimit: number;
  canUpload: boolean;
};

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

export type PostDetail = {
  post: FeedPost;
  comments: PostComment[];
  parts: string[];
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
