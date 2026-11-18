import type { ReminderStatus } from "@/lib/reminders";

const SEGMENTS = 10;

// How far along a reminder's interval is, as a ten-segment bar. `used` is the
// share of the interval gone by (past 1 when overdue); null draws it empty.
export function Gauge({
  used,
  status,
  wide = false,
  label,
}: {
  used: number | null;
  status: ReminderStatus;
  wide?: boolean;
  label?: string;
}) {
  const lit = used == null ? 0 : Math.min(SEGMENTS, Math.ceil(used * SEGMENTS));
  const percent = used == null ? null : Math.round(used * 100);
  return (
    <span
      role="img"
      aria-label={label ?? (percent == null ? "Not tracked yet" : `${percent}% of the interval used`)}
      data-status={status}
      className={`gauge ${wide ? "gauge-wide" : ""}`}
    >
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <i key={i} data-lit={i < lit ? "" : undefined} />
      ))}
    </span>
  );
}

const STATUS_COLOR: Record<ReminderStatus, string> = {
  ok: "var(--color-gauge)",
  due_soon: "var(--color-due)",
  overdue: "var(--color-overdue)",
  unknown: "var(--color-steel)",
};

// A small three-quarter dial with the percent of the interval in the middle,
// for reminder cards.
export function MiniDial({ used, status }: { used: number | null; status: ReminderStatus }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const sweep = circumference * 0.75;
  const p = Math.min(Math.max(used ?? 0, 0), 1);
  const stroke = STATUS_COLOR[status];
  const percent = used == null ? null : Math.round(used * 100);
  return (
    <div
      role="img"
      aria-label={percent == null ? "Not tracked yet" : `${percent}% of the interval used`}
      className="relative h-24 w-24 shrink-0"
    >
      <svg viewBox="0 0 100 100" className="block h-full w-full" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--color-gauge-off)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${sweep} ${circumference}`}
          transform="rotate(135 50 50)"
        />
        {p > 0 && (
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${sweep * p} ${circumference}`}
            transform="rotate(135 50 50)"
          />
        )}
      </svg>
      <span
        className="readout absolute inset-0 grid place-items-center text-xl"
        style={{ color: percent == null ? "var(--color-steel)" : stroke }}
        aria-hidden
      >
        {percent == null ? "--" : `${percent}%`}
      </span>
    </div>
  );
}
