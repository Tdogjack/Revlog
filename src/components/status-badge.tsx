import { TriangleAlert } from "lucide-react";
import type { ReminderStatus } from "@/lib/reminders";

const styles: Record<ReminderStatus, { label: string; className: string }> = {
  // Solid red with an icon so overdue reads as urgent at a glance.
  overdue: { label: "Overdue", className: "bg-overdue-solid font-medium text-white" },
  due_soon: { label: "Due soon", className: "bg-due-bg text-due" },
  ok: { label: "On track", className: "bg-done-bg text-done" },
};

export function StatusBadge({ status, label }: { status: ReminderStatus; label?: string }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs ${s.className}`}
    >
      {status === "overdue" && <TriangleAlert className="h-3.5 w-3.5" aria-hidden />}
      {label ?? s.label}
    </span>
  );
}
