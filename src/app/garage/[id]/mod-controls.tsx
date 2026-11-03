"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { MOD_STATUSES, type ModStatus } from "@/lib/mod-categories";
import { changeModStatus, removeMod } from "./mods/actions";

const statusStyle: Record<ModStatus, string> = {
  installed: "border-done/30 text-done",
  planned: "border-graphite text-chalk",
  removed: "border-graphite text-steel",
};

// Status works as a badge you can click to change, e.g. planned → installed.
export function ModControls({
  vehicleId,
  modId,
  status,
}: {
  vehicleId: string;
  modId: string;
  status: ModStatus;
}) {
  return (
    <div className="flex items-center gap-1">
      {/* Keyed by status so the badge color and value refresh after a change. */}
      <form key={status} action={changeModStatus.bind(null, vehicleId, modId)}>
        <select
          name="status"
          defaultValue={status}
          aria-label="Mod status"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={`mr-1 min-h-8 cursor-pointer rounded-md border bg-carbon px-2 text-xs font-semibold ${statusStyle[status]}`}
        >
          {MOD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </form>
      <Link
        href={`/garage/${vehicleId}/mods/${modId}/edit`}
        aria-label="Edit mod"
        title="Edit mod"
        className="icon-btn"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </Link>
      <form
        action={removeMod.bind(null, vehicleId, modId)}
        onSubmit={(e) => {
          if (!confirm("Delete this mod?")) e.preventDefault();
        }}
      >
        <button
          type="submit"
          aria-label="Delete mod"
          title="Delete mod"
          className="icon-btn icon-btn-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
