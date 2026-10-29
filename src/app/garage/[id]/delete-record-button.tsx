"use client";

import { Trash2 } from "lucide-react";
import { removeServiceRecord } from "./service/actions";

export function DeleteRecordButton({ vehicleId, recordId }: { vehicleId: string; recordId: string }) {
  return (
    <form
      action={removeServiceRecord.bind(null, vehicleId, recordId)}
      onSubmit={(e) => {
        if (!confirm("Delete this service record?")) e.preventDefault();
      }}
    >
      <button type="submit" aria-label="Delete record" className="text-steel hover:text-due">
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </form>
  );
}
