// Shared by the forms (browser) and the pages that fill them (server).

// A part row as the service and mod forms send it. `id` is set for parts
// that already exist (edit forms) and missing for new ones.
export type PartRow = {
  id?: string;
  name: string;
  url: string;
  quantity: string;
  price: string;
  trackPrice: boolean;
};

// Turns saved parts into form rows. Pass keepIds: false when copying a
// record, so the copy gets its own new parts.
export function toPartRows(
  saved: {
    id: string;
    name: string;
    url: string | null;
    quantity: number;
    price: string | null;
    trackPrice: boolean;
  }[],
  { keepIds = true } = {},
): PartRow[] {
  return saved.map((p) => ({
    ...(keepIds ? { id: p.id } : {}),
    name: p.name,
    url: p.url ?? "",
    quantity: p.quantity.toString(),
    price: p.price ?? "",
    trackPrice: p.trackPrice,
  }));
}
