// Pulls a product price out of a store page's HTML. Most shops publish it as
// schema.org JSON-LD (Google Shopping requires it) or as product meta tags.
// Pure function, no network, so it's easy to test.

export type ExtractedPrice = { price: number; currency: string | null; source: string };

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d.,]/g, "");
  // "1.299,99" (European) vs "1,299.99" (US): the last separator is the decimal point.
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const normalized =
    lastComma > lastDot && cleaned.length - lastComma <= 3
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function decodeEntities(s: string) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

type Json = unknown;

function asArray(v: Json): Json[] {
  return Array.isArray(v) ? v : v == null ? [] : [v];
}

function typesOf(node: Record<string, Json>): string[] {
  return asArray(node["@type"]).filter((t): t is string => typeof t === "string");
}

// Finds the first offer-like price, preferring offers attached to a Product.
function priceFromJsonLd(root: Json): ExtractedPrice | null {
  const products: Record<string, Json>[] = [];
  const offers: Record<string, Json>[] = [];

  const walk = (node: Json, depth: number) => {
    if (depth > 8 || node == null || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach((n) => walk(n, depth + 1));
    const obj = node as Record<string, Json>;
    const types = typesOf(obj);
    if (types.includes("Product") || types.includes("ProductGroup")) products.push(obj);
    if (types.includes("Offer") || types.includes("AggregateOffer")) offers.push(obj);
    for (const value of Object.values(obj)) walk(value, depth + 1);
  };
  walk(root, 0);

  const fromOffer = (offer: Record<string, Json>): ExtractedPrice | null => {
    const spec = asArray(offer.priceSpecification)[0] as Record<string, Json> | undefined;
    const price =
      toNumber(offer.price) ?? toNumber(offer.lowPrice) ?? (spec ? toNumber(spec.price) : null);
    if (price == null) return null;
    const currency = offer.priceCurrency ?? spec?.priceCurrency;
    return { price, currency: typeof currency === "string" ? currency : null, source: "json-ld" };
  };

  for (const product of products) {
    for (const offer of asArray(product.offers)) {
      if (offer && typeof offer === "object") {
        const found = fromOffer(offer as Record<string, Json>);
        if (found) return found;
      }
    }
  }
  for (const offer of offers) {
    const found = fromOffer(offer);
    if (found) return found;
  }
  return null;
}

function metaContent(html: string, attr: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Attribute order varies, so match the tag first, then read content from it.
  // Microdata (itemprop) can sit on any element, not just <meta>.
  const tagPattern = new RegExp(`<[a-z]+\\b[^>]*\\s${attr}=["']${escaped}["'][^>]*>`, "i");
  const tag = html.match(tagPattern)?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content) : null;
}

export function extractPrice(html: string): ExtractedPrice | null {
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const [, body] of scripts) {
    try {
      const found = priceFromJsonLd(JSON.parse(body.trim()));
      if (found) return found;
    } catch {
      // Some stores ship invalid JSON-LD; try the next block.
    }
  }

  const metaPairs: [string, string, string, string][] = [
    ["property", "product:price:amount", "property", "product:price:currency"],
    ["property", "og:price:amount", "property", "og:price:currency"],
    ["itemprop", "price", "itemprop", "priceCurrency"],
  ];
  for (const [attr, name, curAttr, curName] of metaPairs) {
    const price = toNumber(metaContent(html, attr, name));
    if (price != null) {
      return { price, currency: metaContent(html, curAttr, curName), source: `meta:${name}` };
    }
  }
  return null;
}
