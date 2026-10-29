import "server-only";
import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import { isIP } from "node:net";
import { Agent, fetch } from "undici";
import { extractPrice, type ExtractedPrice } from "@/lib/price-extract";

// Fetching user-supplied links from our server is a classic way to probe
// private networks, so every connection is checked: http(s) only, standard
// ports, and no private, loopback, or link-local addresses, including after
// redirects and at connect time (which also stops DNS rebinding).

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 4;

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((n, octet) => (n << 8) + Number(octet), 0) >>> 0;
}

const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3], // multicast and reserved, through 255.255.255.255
];

export function isBlockedAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const n = ipv4ToInt(ip);
    return BLOCKED_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    // The URL parser rewrites ::ffff:127.0.0.1 as ::ffff:7f00:1.
    const hexMapped = lower.match(/^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hexMapped) {
      const [hi, lo] = [parseInt(hexMapped[1], 16), parseInt(hexMapped[2], 16)];
      return isBlockedAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    return (
      lower === "::" ||
      lower === "::1" ||
      /^f[cd]/.test(lower) || // unique local fc00::/7
      /^fe[89ab]/.test(lower) || // link-local fe80::/10
      /^ff/.test(lower) || // multicast
      lower.startsWith("2001:db8")
    );
  }
  return true;
}

// Used by the HTTP agent for every connection it opens.
function safeLookup(
  hostname: string,
  options: LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
) {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, []);
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
      return callback(Object.assign(new Error("Blocked address"), { code: "EBLOCKED" }), []);
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

const agent = new Agent({ connect: { lookup: safeLookup, timeout: TIMEOUT_MS } });

export class PriceCheckError extends Error {}

export function validatePartUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new PriceCheckError("That link isn't a valid web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new PriceCheckError("Links need to start with http:// or https://.");
  }
  if (url.username || url.password) throw new PriceCheckError("Links can't include a login.");
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new PriceCheckError("That link uses an unusual port and can't be checked.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && isBlockedAddress(host))
    throw new PriceCheckError("That link can't be checked.");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new PriceCheckError("That link can't be checked.");
  }
  return url;
}

async function readCapped(body: ReadableStream<Uint8Array> | null) {
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function fetchPagePrice(rawUrl: string): Promise<ExtractedPrice> {
  let url = validatePartUrl(rawUrl);
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res;
    try {
      res = await fetch(url, {
        dispatcher: agent,
        redirect: "manual",
        signal,
        headers: {
          "user-agent": "RevlogPriceCheck/1.0 (+https://revlog.me)",
          accept: "text/html,application/xhtml+xml",
        },
      });
    } catch (err) {
      const code = (err as { cause?: { code?: string } }).cause?.code;
      if (code === "EBLOCKED") throw new PriceCheckError("That link can't be checked.");
      if ((err as Error).name === "TimeoutError") {
        throw new PriceCheckError("The store took too long to respond.");
      }
      throw new PriceCheckError("Couldn't reach that store.");
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) throw new PriceCheckError("The store sent a broken redirect.");
      url = validatePartUrl(new URL(location, url).toString());
      continue;
    }
    if (res.status === 403 || res.status === 429) {
      await res.body?.cancel();
      throw new PriceCheckError("That store blocks automatic price checks.");
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new PriceCheckError(`The store returned an error (${res.status}).`);
    }

    const html = await readCapped(res.body as ReadableStream<Uint8Array> | null);
    const found = extractPrice(html);
    if (!found) throw new PriceCheckError("Couldn't find a price on that page.");
    return found;
  }
  throw new PriceCheckError("That link redirects too many times.");
}
