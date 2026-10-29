import type { ReminderStatus } from "@/lib/reminders";

const styles: Record<ReminderStatus, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-overdue-bg text-overdue" },
  due_soon: { label: "Due soon", className: "bg-due-bg text-due" },
  ok: { label: "On track", className: "bg-done-bg text-done" },
};

export function StatusBadge({ status, label }: { status: ReminderStatus; label?: string }) {
  const s = styles[status];
  return (
    <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${s.className}`}>{label ?? s.label}</span>
  );
}
