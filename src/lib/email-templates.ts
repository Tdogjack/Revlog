// Email HTML in the Redline look. Email clients ignore stylesheets and most
// modern CSS, so everything is tables with inline styles. Kept pure (no
// database or env) so the output is easy to check.

import type { ReminderStatus } from "@/lib/reminders";

const C = {
  carbon: "#121417",
  panel: "#1b1f24",
  graphite: "#2a2e35",
  redline: "#e63946",
  steel: "#8d99ae",
  chalk: "#f4f1ec",
  due: "#f2b950",
  overdue: "#ff5c66",
};

const FONT = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The outer frame: logo, a panel for the content, and a footer.
export function emailLayout({
  preheader,
  body,
  footer,
}: {
  preheader: string;
  body: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Revlog</title>
</head>
<body style="margin:0;padding:0;background:${C.carbon};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.carbon};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 4px 20px;font-family:${FONT};font-size:22px;font-weight:700;color:${C.chalk};">
Rev<span style="color:${C.redline};">log</span>
</td></tr>
<tr><td style="background:${C.panel};border:1px solid ${C.graphite};border-radius:12px;padding:28px 24px;font-family:${FONT};color:${C.chalk};font-size:15px;line-height:1.55;">
${body}
</td></tr>
<tr><td style="padding:20px 4px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.steel};">
${footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function emailButton(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr>
<td style="background:${C.redline};border-radius:6px;">
<a href="${href}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
</td></tr></table>`;
}

// `likely` marks a reminder estimated from driving pace, not a logged reading.
export type ReminderEmailItem = {
  task: string;
  status: ReminderStatus;
  due: string;
  likely?: boolean;
};
export type ReminderEmailCar = { name: string; items: ReminderEmailItem[] };

export function reminderEmail({
  cars,
  garageUrl,
  settingsUrl,
  unsubscribeUrl,
}: {
  cars: ReminderEmailCar[];
  garageUrl: string;
  settingsUrl: string;
  unsubscribeUrl: string;
}) {
  const items = cars.flatMap((c) => c.items.map((i) => ({ ...i, car: c.name })));
  const overdue = items.filter((i) => i.status === "overdue").length;

  let subject: string;
  if (items.length === 1) {
    const [only] = items;
    subject = `${only.task} is ${only.status === "overdue" ? "overdue" : only.likely ? "likely due soon" : "due soon"} on your ${only.car}`;
  } else {
    subject = overdue
      ? `${items.length} services need attention (${overdue} overdue)`
      : `${items.length} services are due soon`;
  }

  const carBlocks = cars
    .map((car) => {
      const rows = car.items
        .map((item) => {
          const color = item.status === "overdue" ? C.overdue : C.due;
          const label = item.status === "overdue" ? "Overdue" : item.likely ? "Check soon" : "Due soon";
          return `<tr>
<td style="padding:10px 0;border-top:1px solid ${C.graphite};font-family:${FONT};font-size:15px;color:${C.chalk};">${escapeHtml(item.task)}<br><span style="font-size:13px;color:${color};">${escapeHtml(item.due)}</span></td>
<td align="right" valign="top" style="padding:10px 0 10px 12px;border-top:1px solid ${C.graphite};font-family:${FONT};font-size:12px;font-weight:600;color:${color};white-space:nowrap;">${label}</td>
</tr>`;
        })
        .join("");
      return `<p style="margin:20px 0 4px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${C.steel};">${escapeHtml(car.name)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
    })
    .join("");

  const html = emailLayout({
    preheader: subject,
    body: `<h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:${C.chalk};">Service coming up</h1>
<p style="margin:0;color:${C.steel};">Here's what your cars need, based on your service history and mileage.</p>
${carBlocks}
${emailButton(garageUrl, "Open your garage")}
<p style="margin:12px 0 0;font-size:13px;color:${C.steel};">Mileage out of date? Update it in your garage and the reminders adjust.</p>`,
    footer: `You're getting this because reminder emails are on for your Revlog account.
<a href="${settingsUrl}" style="color:${C.steel};">Email settings</a> &middot;
<a href="${unsubscribeUrl}" style="color:${C.steel};">Unsubscribe</a>`,
  });

  const text = [
    "Service coming up",
    "",
    ...cars.flatMap((car) => [
      car.name.toUpperCase(),
      ...car.items.map((i) => `- ${i.task}: ${i.due}${i.status === "overdue" ? " (overdue)" : ""}`),
      "",
    ]),
    `Open your garage: ${garageUrl}`,
    "",
    `Email settings: ${settingsUrl}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function testEmail({ garageUrl, settingsUrl }: { garageUrl: string; settingsUrl: string }) {
  const subject = "Revlog test email";
  const html = emailLayout({
    preheader: "Reminder emails are working.",
    body: `<h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:${C.chalk};">Emails are working</h1>
<p style="margin:0;color:${C.steel};">This is a test from your Revlog settings. When a service is due within 500 miles or 14 days, you'll get an email like this one listing what's coming up.</p>
${emailButton(garageUrl, "Open your garage")}`,
    footer: `<a href="${settingsUrl}" style="color:${C.steel};">Email settings</a>`,
  });
  const text = `Emails are working\n\nThis is a test from your Revlog settings.\n\nOpen your garage: ${garageUrl}`;
  return { subject, html, text };
}
