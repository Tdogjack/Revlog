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
  photos: CarPhoto[];
  photoLimit: number;
  canUpload: boolean;
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
