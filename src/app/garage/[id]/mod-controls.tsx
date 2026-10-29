"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { MOD_STATUSES, type ModStatus } from "@/lib/mod-categories";
import { changeModStatus, removeMod } from "./mods/actions";

const statusStyle: Record<ModStatus, string> = {
  installed: "bg-done-bg text-done",
  planned: "bg-graphite text-chalk",
  removed: "bg-carbon text-steel",
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
    <div className="flex items-center gap-3">
      {/* Keyed by status so the badge color and value refresh after a change. */}
      <form key={status} action={changeModStatus.bind(null, vehicleId, modId)}>
        <select
          name="status"
          defaultValue={status}
          aria-label="Mod status"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={`cursor-pointer rounded border-0 px-2 py-0.5 text-xs outline-none ${statusStyle[status]}`}
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
        className="text-steel hover:text-chalk"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </Link>
      <form
        action={removeMod.bind(null, vehicleId, modId)}
        onSubmit={(e) => {
          if (!confirm("Delete this mod?")) e.preventDefault();
        }}
      >
        <button type="submit" aria-label="Delete mod" className="text-steel hover:text-overdue">
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
