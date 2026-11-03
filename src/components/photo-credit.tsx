import type { DemoPhoto } from "@/lib/demo-garage";

// Author and license for a demo photo, linked, as the photos' licenses ask.
export function PhotoCredit({ label, photo }: { label: string; photo: DemoPhoto }) {
  return (
    <>
      <a href={photo.sourceUrl} className="underline underline-offset-2 hover:text-chalk">
        {label}
      </a>{" "}
      by {photo.author},{" "}
      <a href={photo.licenseUrl} className="underline underline-offset-2 hover:text-chalk">
        {photo.license}
      </a>
    </>
  );
}
