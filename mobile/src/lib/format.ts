const pad = (n: number) => String(n).padStart(2, "0");

export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => toIsoDate(new Date());

export const fromIsoDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const formatDate = (iso: string) =>
  fromIsoDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const formatMiles = (miles: number) => `${miles.toLocaleString("en-US")} mi`;

export const formatMoney = (amount: string) =>
  Number(amount).toLocaleString("en-US", { style: "currency", currency: "USD" });

// For server timestamps, shown in the person's own time zone.
export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
