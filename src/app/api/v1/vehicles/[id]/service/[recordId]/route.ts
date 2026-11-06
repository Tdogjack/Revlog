import { authed, fail, ok, readBody } from "@/lib/api";
import { photoPathsFor, removePhotoFiles } from "@/lib/gallery";
import { editService, readServiceFields } from "@/lib/service-log";
import { deleteServiceRecord } from "@/lib/service-records";

type Params = { id: string; recordId: string };

// Saved parts stay as they are unless the body includes "parts".
export const PUT = authed<Params>(async ({ user, request, params }) => {
  const body = await readBody(request);
  const error = await editService(
    user.id,
    params.id,
    params.recordId,
    readServiceFields((k) => body[k]),
  );
  return error ? fail(error) : ok({});
});

export const DELETE = authed<Params>(async ({ user, params }) => {
  const paths = await photoPathsFor(user.id, { kind: "record", id: params.recordId });
  await deleteServiceRecord(user.id, params.recordId);
  await removePhotoFiles(paths);
  return ok({});
});
