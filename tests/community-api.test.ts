import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isModerator: vi.fn(() => false),
  isSuspended: vi.fn(async () => false),
  isBlockedBy: vi.fn(async () => false),
  getProfile: vi.fn(async () => ({ username: "gearhead" }) as object | null),
  getProfileByUsername: vi.fn(),
  hasBlockedWords: vi.fn((text: string) => text.includes("slur")),
  createPost: vi.fn(async () => ({ id: "post" })),
  addComment: vi.fn(async () => null),
  countRecentComments: vi.fn(async () => 0),
  listPosts: vi.fn(async () => []),
  getPost: vi.fn(),
  listComments: vi.fn(async () => []),
  listPostParts: vi.fn(async () => []),
  createReport: vi.fn(async () => null),
  blockUser: vi.fn(async () => null),
  setLike: vi.fn(async () => ({ liked: true, likeCount: 1 })),
  removeContent: vi.fn(async () => {}),
  dismissReport: vi.fn(async () => {}),
  removeReportedContent: vi.fn(async () => null),
  suspendReportedUser: vi.fn(async () => null),
  suspendUser: vi.fn(async () => null),
  restoreUser: vi.fn(async () => {}),
  listOpenReports: vi.fn(async () => []),
  listSuspendedUsers: vi.fn(async () => []),
  postCount: vi.fn(async () => [{ n: 0 }]),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUser: mocks.getUser }));
vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ where: mocks.postCount }) }) },
}));
vi.mock("@/lib/community", () => ({
  FEATURED_BUILD_TAG: "featured-build",
  FEED_PAGE: 20,
  addComment: mocks.addComment,
  addPostPhoto: vi.fn(),
  countRecentComments: mocks.countRecentComments,
  createPost: mocks.createPost,
  setLike: mocks.setLike,
  listPosts: mocks.listPosts,
  getPost: mocks.getPost,
  listComments: mocks.listComments,
  listPostParts: mocks.listPostParts,
  deletePost: vi.fn(),
}));
vi.mock("@/lib/moderation", () => ({
  SUSPENDED_MESSAGE: "suspended",
  isModerator: mocks.isModerator,
  isSuspended: mocks.isSuspended,
  isBlockedBy: mocks.isBlockedBy,
  createReport: mocks.createReport,
  blockUser: mocks.blockUser,
  listBlockedUsers: vi.fn(async () => []),
  removeContent: mocks.removeContent,
  dismissReport: mocks.dismissReport,
  removeReportedContent: mocks.removeReportedContent,
  suspendReportedUser: mocks.suspendReportedUser,
  suspendUser: mocks.suspendUser,
  restoreUser: mocks.restoreUser,
  listOpenReports: mocks.listOpenReports,
  listSuspendedUsers: mocks.listSuspendedUsers,
}));
vi.mock("@/lib/profiles", () => ({
  getProfile: mocks.getProfile,
  getProfileByUsername: mocks.getProfileByUsername,
}));
vi.mock("@/lib/text-filter", () => ({
  BLOCKED_WORDING: "blocked wording",
  hasBlockedWords: mocks.hasBlockedWords,
}));
vi.mock("@/lib/email-verification", () => ({
  CONFIRM_EMAIL_FIRST: "confirm",
  isEmailVerified: vi.fn(async () => true),
}));
vi.mock("@/lib/photos", () => ({ readPhoto: vi.fn() }));
vi.mock("@/lib/vehicles", () => ({
  isUuid: (id: string) => /^[0-9a-f-]{36}$/.test(id),
  vehicleName: () => "2014 Honda Civic",
}));

const ID = "11111111-1111-1111-1111-111111111111";
const USER = { id: "22222222-2222-2222-2222-222222222222", email: "a@example.com" };
const post = (body: unknown, url = "http://localhost/api") =>
  new NextRequest(url, { method: "POST", body: JSON.stringify(body) });
const context = <P>(params: P) => ({ params: Promise.resolve(params) });
const noParams = { params: Promise.resolve(undefined) } as never;
const postBody = { vehicleId: ID, title: "New wheels", body: "Fitted today", tag: "mod" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isModerator.mockReset();
  mocks.isModerator.mockReturnValue(false);
  mocks.getUser.mockResolvedValue(USER);
});

describe("posting", () => {
  it("publishes a clean post as the token's user", async () => {
    const { POST } = await import("@/app/api/v1/community/posts/route");
    const res = await POST(post({ ...postBody, userId: "someone-else" }), noParams);
    expect(res.status).toBe(201);
    expect(mocks.createPost).toHaveBeenCalledWith(USER.id, expect.anything());
  });

  it("stops suspended accounts", async () => {
    mocks.isSuspended.mockResolvedValueOnce(true);
    const { POST } = await import("@/app/api/v1/community/posts/route");
    const res = await POST(post(postBody), noParams);
    expect(res.status).toBe(400);
    expect(mocks.createPost).not.toHaveBeenCalled();
  });

  it("stops wording the text filter blocks", async () => {
    const { POST } = await import("@/app/api/v1/community/posts/route");
    const res = await POST(post({ ...postBody, body: "a slur" }), noParams);
    expect(await res.json()).toEqual({ error: "blocked wording" });
    expect(mocks.createPost).not.toHaveBeenCalled();
  });

  it("stops the daily post limit", async () => {
    mocks.postCount.mockResolvedValueOnce([{ n: 10 }]);
    const { POST } = await import("@/app/api/v1/community/posts/route");
    await POST(post(postBody), noParams);
    expect(mocks.createPost).not.toHaveBeenCalled();
  });

  it("asks for a username first, with a 409 the app can act on", async () => {
    mocks.getProfile.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/v1/community/posts/route");
    const res = await POST(post(postBody), noParams);
    expect(res.status).toBe(409);
  });

  it("keeps the build tag for the car's public build", async () => {
    const { POST } = await import("@/app/api/v1/community/posts/route");
    await POST(post({ ...postBody, tag: "build" }), noParams);
    expect(mocks.createPost).toHaveBeenCalledWith(
      USER.id,
      expect.objectContaining({ tag: "progress" }),
    );
  });
});

describe("comments", () => {
  const send = async (body: string) => {
    const { POST } = await import("@/app/api/v1/community/posts/[id]/comments/route");
    return POST(post({ body }), context({ id: ID }));
  };

  it("adds a clean comment", async () => {
    expect((await send("Nice build")).status).toBe(201);
    expect(mocks.addComment).toHaveBeenCalledWith(USER.id, ID, "Nice build");
  });

  it("stops suspended accounts, blocked wording, and the daily limit", async () => {
    mocks.isSuspended.mockResolvedValueOnce(true);
    await send("Nice build");
    await send("a slur");
    mocks.countRecentComments.mockResolvedValueOnce(100);
    await send("Nice build");
    expect(mocks.addComment).not.toHaveBeenCalled();
  });
});

describe("the feed", () => {
  it("is always filtered for the person viewing, never as a moderator", async () => {
    mocks.isModerator.mockReturnValueOnce(true);
    const { GET } = await import("@/app/api/v1/community/posts/route");
    await GET(new NextRequest("http://localhost/api?sort=nonsense&tag=nonsense"), noParams);
    const [options] = mocks.listPosts.mock.lastCall as unknown as [Record<string, unknown>];
    expect(options).toMatchObject({ viewerId: USER.id, sort: "best", tag: undefined });
    expect(options.moderator).toBeUndefined();
  });

  it("hides a blocked person's profile posts", async () => {
    mocks.getProfileByUsername.mockResolvedValueOnce({ userId: ID, username: "blocked" });
    mocks.isBlockedBy.mockResolvedValueOnce(true);
    const { GET } = await import("@/app/api/v1/community/profile/route");
    const res = await GET(new NextRequest("http://localhost/api?username=blocked"), noParams);
    expect((await res.json()).posts).toEqual([]);
    expect(mocks.listPosts).not.toHaveBeenCalled();
  });
});

describe("report and block", () => {
  it("files a report as the token's user", async () => {
    const { POST } = await import("@/app/api/v1/community/reports/route");
    const res = await POST(post({ kind: "post", targetId: ID, reason: "spam" }), noParams);
    expect(res.status).toBe(201);
    expect(mocks.createReport).toHaveBeenCalledWith(USER.id, "post", ID, "spam", null);
  });

  it("refuses unknown reasons and kinds", async () => {
    const { POST } = await import("@/app/api/v1/community/reports/route");
    await POST(post({ kind: "post", targetId: ID, reason: "because" }), noParams);
    await POST(post({ kind: "everything", targetId: ID, reason: "spam" }), noParams);
    expect(mocks.createReport).not.toHaveBeenCalled();
  });

  it("blocks as the token's user", async () => {
    const { POST } = await import("@/app/api/v1/community/blocks/route");
    await POST(post({ userId: ID }), noParams);
    expect(mocks.blockUser).toHaveBeenCalledWith(USER.id, ID);
  });
});

describe("moderator routes", () => {
  it("answer 404 to everyone else and do nothing", async () => {
    const queue = await import("@/app/api/v1/moderation/route");
    const reports = await import("@/app/api/v1/moderation/reports/[id]/route");
    const users = await import("@/app/api/v1/moderation/users/[id]/route");
    const content = await import("@/app/api/v1/moderation/content/[id]/route");

    const responses = await Promise.all([
      queue.GET(new NextRequest("http://localhost/api"), noParams),
      reports.POST(post({ action: "remove" }), context({ id: ID })),
      users.POST(post({ action: "suspend" }), context({ id: ID })),
      content.DELETE(post({ kind: "post" }), context({ id: ID })),
    ]);
    expect(responses.map((r) => r.status)).toEqual([404, 404, 404, 404]);
    expect(mocks.listOpenReports).not.toHaveBeenCalled();
    expect(mocks.removeReportedContent).not.toHaveBeenCalled();
    expect(mocks.suspendUser).not.toHaveBeenCalled();
    expect(mocks.removeContent).not.toHaveBeenCalled();
  });

  it("run for a moderator", async () => {
    mocks.isModerator.mockReturnValue(true);
    const { POST } = await import("@/app/api/v1/moderation/reports/[id]/route");
    const res = await POST(post({ action: "suspend" }), context({ id: ID }));
    expect(res.status).toBe(200);
    expect(mocks.suspendReportedUser).toHaveBeenCalledWith(ID);
  });
});
