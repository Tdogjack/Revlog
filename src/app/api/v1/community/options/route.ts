import { authed, ok } from "@/lib/api";
import type { CommunityOptions } from "@/lib/api-types";
import { DEFAULT_SORT, POST_SORTS } from "@/lib/post-sorts";
import { POST_TAGS } from "@/lib/post-tags";
import { REPORT_REASONS } from "@/lib/report-reasons";

// Sent to the app rather than copied into it, so the lists can't drift.
export const GET = authed(async () =>
  ok<CommunityOptions>({
    defaultSort: DEFAULT_SORT,
    sorts: POST_SORTS.map(({ value, label }) => ({ value, label })),
    tags: POST_TAGS.map(({ value, label }) => ({ value, label })),
    reasons: REPORT_REASONS.map(({ value, label }) => ({ value, label })),
  }),
);
