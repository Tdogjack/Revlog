import { authed, fail, ok } from "@/lib/api";
import { saveUploadedPhoto } from "@/lib/gallery";

// One photo per request, like the website, to stay under the upload size limit.
// The form carries the photo, plus "kind" (build, record, or mod) and "targetId".
export const POST = authed<{ id: string }>(async ({ user, request, params }) => {
  const form = await request.formData();
  const error = await saveUploadedPhoto(
    user.id,
    params.id,
    String(form.get("kind") ?? "build"),
    typeof form.get("targetId") === "string" ? String(form.get("targetId")) : null,
    form,
  );
  return error ? fail(error) : ok({}, 201);
});
