import { authed, ok } from "@/lib/api";
import { serviceTypesView } from "@/lib/api-views";

export const GET = authed(async ({ user }) => ok(await serviceTypesView(user.id)));
