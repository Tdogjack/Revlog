export const REPORT_REASONS = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "sexual", label: "Sexual content" },
  { value: "violence", label: "Violence or threats" },
  { value: "illegal", label: "Illegal or dangerous activity" },
  { value: "other", label: "Something else" },
] as const;

export const isReportReason = (value: string) => REPORT_REASONS.some((r) => r.value === value);

export const reportReasonLabel = (value: string) =>
  REPORT_REASONS.find((r) => r.value === value)?.label ?? value;

export type ReportKind = "post" | "comment" | "user";
