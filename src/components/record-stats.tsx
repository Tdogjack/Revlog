// The numbers on a service, mod, or reminder row, mileage first and largest,
// so a list can be scanned for "when" and "how much" at a glance.

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function RecordStats({
  miles,
  cost,
  extra = [],
}: {
  miles?: number | null;
  cost?: number | string | null;
  extra?: (string | null | false | undefined)[];
}) {
  const rest = extra.filter(Boolean);
  return (
    <p className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      {miles != null && (
        <span className="readout text-base text-chalk">
          {miles.toLocaleString("en-US")}
          <span className="ml-1 font-sans text-xs font-normal text-steel">mi</span>
        </span>
      )}
      {cost != null && cost !== "" && (
        <span className="readout text-base text-chalk">{money.format(Number(cost))}</span>
      )}
      {rest.map((t) => (
        <span key={t as string} className="text-sm text-steel">
          {t}
        </span>
      ))}
    </p>
  );
}

// Each row is its own plain card. Status lives in the badge and text, not the edge.
export const cardClass =
  "rounded-xl border border-graphite bg-carbon/50 px-4 py-3.5 transition-colors hover:bg-graphite/30";
