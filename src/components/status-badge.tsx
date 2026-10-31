import { TriangleAlert } from "lucide-react";
import type { ReminderStatus } from "@/lib/reminders";

const styles: Record<ReminderStatus, { label: string; className: string; dot?: string }> = {
  // Solid red with an icon so overdue reads as urgent at a glance. The calmer
  // states are a colored dot and text, so the red stays the loudest thing.
  overdue: { label: "Overdue", className: "rounded bg-overdue-solid px-2 py-0.5 text-white" },
  due_soon: { label: "Due soon", className: "text-due", dot: "bg-due" },
  ok: { label: "On track", className: "text-done", dot: "bg-done" },
};

export function StatusBadge({ status, label }: { status: ReminderStatus; label?: string }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${s.className}`}
    >
      {status === "overdue" && <TriangleAlert className="h-3.5 w-3.5" aria-hidden />}
      {s.dot && <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />}
      {label ?? s.label}
    </span>
  );
}
