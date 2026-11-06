import { USERNAME_TAKEN, usernameProblem } from "@/lib/account";
import { authed, fail, ok, readBody } from "@/lib/api";
import { createProfile } from "@/lib/profiles";
import { normalizeUsername } from "@/lib/username-rules";

// For accounts made before usernames existed, or whose pick was taken.
export const POST = authed(async ({ user, request }) => {
  const body = await readBody(request);
  const username = normalizeUsername(String(body.username ?? ""));
  const problem = usernameProblem(username);
  if (problem) return fail(problem);
  if (!(await createProfile(user.id, username))) return fail(USERNAME_TAKEN);
  return ok({ username }, 201);
});
