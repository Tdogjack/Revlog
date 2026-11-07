import { authed, ok } from "@/lib/api";
import { costsView } from "@/lib/api-views";

export const GET = authed(async ({ user }) => ok(await costsView(user.id)));
