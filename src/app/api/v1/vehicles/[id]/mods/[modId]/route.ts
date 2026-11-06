import { authed, fail, ok, readBody } from "@/lib/api";
import { photoPathsFor, removePhotoFiles } from "@/lib/gallery";
import { editModEntry, readModFields } from "@/lib/mod-log";
import { deleteMod } from "@/lib/mods";

type Params = { id: string; modId: string };

// Saved parts stay as they are unless the body includes "parts".
export const PUT = authed<Params>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const error = await editModEntry(
    user.id,
    params.id,
    params.modId,
    readModFields((k) => body[k]),
  );
  return error ? fail(error) : ok({});
});

export const DELETE = authed<Params>(async ({ user, params }) => {
  const paths = await photoPathsFor(user.id, { kind: "mod", id: params.modId });
  await deleteMod(user.id, params.modId);
  await removePhotoFiles(paths);
  return ok({});
});
