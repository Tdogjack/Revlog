import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { listPartsForVehicle } from "@/lib/parts";
import { categoryLabel } from "@/lib/service-categories";
import { listServiceRecords } from "@/lib/service-records";
import { listServiceTypes } from "@/lib/service-types";
import { getVehicle, vehicleName } from "@/lib/vehicles";

// A printable PDF of a car's service history, handy when selling the car.

const PAGE = { width: 612, height: 792, margin: 50 }; // US Letter
const INK = rgb(0.07, 0.08, 0.09);
const MUTED = rgb(0.4, 0.43, 0.48);
const RED = rgb(0.9, 0.22, 0.27);
const RULE = rgb(0.85, 0.86, 0.88);

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// The built-in PDF fonts only cover Latin-1, so swap or drop anything else.
function clean(text: string) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\r/g, "")
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of clean(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    private doc: PDFDocument,
    private fonts: { regular: PDFFont; bold: PDFFont },
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - PAGE.margin;
  }
  // Starts a new page when the next block won't fit.
  need(height: number) {
    if (this.y - height < PAGE.margin + 20) this.newPage();
  }
  text(value: string, opts: { x?: number; size?: number; bold?: boolean; color?: typeof INK }) {
    const size = opts.size ?? 10;
    this.page.drawText(clean(value), {
      x: opts.x ?? PAGE.margin,
      y: this.y - size,
      size,
      font: opts.bold ? this.fonts.bold : this.fonts.regular,
      color: opts.color ?? INK,
    });
  }
  rule() {
    this.page.drawLine({
      start: { x: PAGE.margin, y: this.y },
      end: { x: PAGE.width - PAGE.margin, y: this.y },
      thickness: 0.5,
      color: RULE,
    });
  }
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/garage/[id]/history">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user) return new Response("Log in to download this.", { status: 401 });
  const car = await getVehicle(user.id, id);
  if (!car) return new Response("That car wasn't found.", { status: 404 });

  const [records, parts, customTypes] = await Promise.all([
    listServiceRecords(user.id, car.id),
    listPartsForVehicle(user.id, car.id),
    listServiceTypes(user.id),
  ]);

  const doc = await PDFDocument.create();
  const name = vehicleName(car);
  doc.setTitle(`${name} service history`);
  doc.setCreator("Revlog");
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const w = new Writer(doc, fonts);
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const bodyX = PAGE.margin + 90;
  const bodyWidth = contentWidth - 90;

  // Header
  w.text("Rev", { size: 14, bold: true });
  w.text("log", {
    size: 14,
    bold: true,
    color: RED,
    x: PAGE.margin + fonts.bold.widthOfTextAtSize("Rev", 14),
  });
  w.y -= 30;
  w.text("Service history", { size: 20, bold: true });
  w.y -= 26;
  w.text(car.nickname ? `${car.nickname} - ${name}` : name, { size: 12 });
  w.y -= 18;
  const facts = [
    car.vin && `VIN ${car.vin}`,
    `Odometer ${car.currentMileage.toLocaleString("en-US")} mi`,
    `${records.length} ${records.length === 1 ? "record" : "records"}`,
    `Generated ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
  ].filter(Boolean) as string[];
  w.text(facts.join("   |   "), { size: 9, color: MUTED });
  w.y -= 22;
  w.rule();
  w.y -= 12;

  // Records, newest first
  for (const r of records) {
    const used = parts.filter((p) => p.serviceRecordId === r.id);
    const detail = [
      categoryLabel(r.category, customTypes),
      r.mileage != null && `${r.mileage.toLocaleString("en-US")} mi`,
      r.cost != null && money.format(Number(r.cost)),
      r.shop,
    ]
      .filter(Boolean)
      .join("  |  ");
    const noteLines = r.notes ? wrap(r.notes, fonts.regular, 9, bodyWidth) : [];
    const partLines = used.flatMap((p) =>
      wrap(
        `- ${p.name}${p.quantity > 1 ? ` x${p.quantity}` : ""}${p.price != null ? `  ${money.format(Number(p.price))}` : ""}`,
        fonts.regular,
        9,
        bodyWidth,
      ),
    );
    w.need(40 + (noteLines.length + partLines.length) * 12);

    const top = w.y;
    w.text(formatDate(r.servicedOn), { size: 9, color: MUTED });
    w.y = top;
    w.text(r.title, { x: bodyX, size: 11, bold: true });
    w.y -= 15;
    w.text(detail, { x: bodyX, size: 9, color: MUTED });
    w.y -= 13;
    for (const line of noteLines) {
      w.text(line, { x: bodyX, size: 9 });
      w.y -= 12;
    }
    if (partLines.length) {
      w.text("Parts", { x: bodyX, size: 9, bold: true });
      w.y -= 12;
      for (const line of partLines) {
        w.text(line, { x: bodyX, size: 9 });
        w.y -= 12;
      }
    }
    w.y -= 6;
    w.rule();
    w.y -= 12;
  }

  const total = records.reduce((n, r) => n + (r.cost ? Number(r.cost) : 0), 0);
  if (total > 0) {
    w.need(20);
    w.text(`Total recorded service cost: ${money.format(total)}`, { size: 10, bold: true });
  }

  // Page numbers and a footer on every page
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawText(clean(`${name} - from Revlog (revlog.me)`), {
      x: PAGE.margin,
      y: 28,
      size: 8,
      font: fonts.regular,
      color: MUTED,
    });
    const label = `Page ${i + 1} of ${pages.length}`;
    page.drawText(label, {
      x: PAGE.width - PAGE.margin - fonts.regular.widthOfTextAtSize(label, 8),
      y: 28,
      size: 8,
      font: fonts.regular,
      color: MUTED,
    });
  });

  const bytes = await doc.save();
  const filename = `${name.replace(/[^A-Za-z0-9]+/g, "-")}-service-history.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
