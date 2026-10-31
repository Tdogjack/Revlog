// Feed sort orders, shared by the feed query and the Sort by menu. Likes and
// comments stand in for votes, with a comment worth two likes.
export const POST_SORTS = [
  { value: "best", label: "Best", hint: "Most liked and discussed" },
  { value: "hot", label: "Hot", hint: "Popular right now" },
  { value: "new", label: "New", hint: "Newest first" },
  { value: "top", label: "Top", hint: "Most liked" },
  { value: "rising", label: "Rising", hint: "Picking up in the last 3 days" },
] as const;

export type PostSort = (typeof POST_SORTS)[number]["value"];

export const DEFAULT_SORT: PostSort = "best";

export function isPostSort(value: string): value is PostSort {
  return POST_SORTS.some((s) => s.value === value);
}
