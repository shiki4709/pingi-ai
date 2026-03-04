/**
 * Email filter: decides whether an email needs a human reply.
 * Pure function — no API calls, no side effects.
 */

export interface EmailHeaders {
  from: string;
  subject: string;
  contentType?: string;
  listUnsubscribe?: string;
  precedence?: string;
  xMailerType?: string;
  autoSubmitted?: string;
}

export interface FilterResult {
  needsReply: boolean;
  reason: string;
}

// ─── 1. Automated sender addresses ───

const AUTOMATED_SENDERS = [
  "noreply@", "no-reply@", "noreply+", "no-reply+",
  "notifications@", "notification@",
  "mailer-daemon@", "postmaster@",
  "do-not-reply@", "donotreply@",
  "accounts@", "account@",
  "billing@", "invoices@",
  "receipts@", "receipt@",
  "support@", "help@",
  "info@", "hello@",
  "news@", "newsletter@",
  "digest@", "updates@",
  "alerts@", "alert@",
  "noreply.", "no-reply.",
];

function isAutomatedSender(from: string): boolean {
  const lower = from.toLowerCase();
  return AUTOMATED_SENDERS.some((p) => lower.includes(p));
}

// ─── 2. Newsletter / marketing detection ───

function isNewsletter(headers: EmailHeaders, snippet: string): boolean {
  // List-Unsubscribe header is the strongest signal
  if (headers.listUnsubscribe) return true;

  // Body contains unsubscribe link
  const lower = snippet.toLowerCase();
  if (lower.includes("unsubscribe") || lower.includes("opt out") || lower.includes("opt-out")) {
    return true;
  }

  // Subject patterns common in marketing
  const subjectLower = headers.subject.toLowerCase();
  const marketingPatterns = [
    "weekly digest", "monthly digest", "daily digest",
    "weekly update", "monthly update",
    "weekly newsletter", "monthly newsletter",
    "weekly roundup", "monthly roundup",
    "% off", "limited time", "flash sale", "exclusive offer",
    "don't miss", "act now", "last chance",
  ];
  return marketingPatterns.some((p) => subjectLower.includes(p));
}

// ─── 3. Calendar invites and auto-responses ───

function isCalendarOrAutoResponse(headers: EmailHeaders): boolean {
  // Calendar invites
  if (headers.contentType?.includes("text/calendar")) return true;
  if (headers.contentType?.includes("application/ics")) return true;

  // Auto-submitted header (RFC 3834)
  if (headers.autoSubmitted && headers.autoSubmitted !== "no") return true;

  // Calendar response subjects
  const subjectLower = headers.subject.toLowerCase();
  const autoSubjects = [
    "accepted:", "declined:", "tentative:",
    "re: accepted", "re: declined", "re: tentative",
    "invitation:", "updated invitation:",
    "canceled event:", "cancelled event:",
    "out of office", "automatic reply",
    "auto-reply", "autoreply",
  ];
  return autoSubjects.some((p) => subjectLower.includes(p));
}

// ─── 4. Receipts and transactional ───

function isTransactional(headers: EmailHeaders, snippet: string): boolean {
  const subjectLower = headers.subject.toLowerCase();
  const snippetLower = snippet.toLowerCase();

  const transactionalSubjects = [
    "order confirmation", "order confirmed",
    "payment received", "payment confirmation",
    "your receipt", "your invoice",
    "shipping confirmation", "shipment notification",
    "delivery confirmation", "delivered:",
    "password reset", "reset your password",
    "verify your email", "confirm your email",
    "verification code", "security code",
    "two-factor", "2fa", "one-time password",
    "sign-in attempt", "login attempt",
    "subscription confirmed", "you've been added",
    "welcome to", // welcome emails from services
  ];

  if (transactionalSubjects.some((p) => subjectLower.includes(p))) return true;

  // Snippet-level signals for receipts
  const transactionalSnippets = [
    "order #", "order number",
    "tracking number", "tracking id",
    "transaction id", "confirmation number",
    "your verification code is",
  ];

  return transactionalSnippets.some((p) => snippetLower.includes(p));
}

// ─── 5. Bulk mail (precedence headers) ───

function isBulkMail(headers: EmailHeaders): boolean {
  if (headers.precedence) {
    const lower = headers.precedence.toLowerCase();
    if (lower === "bulk" || lower === "list" || lower === "junk") return true;
  }
  if (headers.xMailerType) return true;
  return false;
}

// ─── 6. Support ticket auto-responses ───

const TICKET_ID_PATTERN = /\[(?:ticket|case|ref|id)[:#\s]*\w{4,}\]/i;

function isSupportTicket(headers: EmailHeaders): boolean {
  return TICKET_ID_PATTERN.test(headers.subject);
}

// ─── Main filter ───

export function shouldReply(headers: EmailHeaders, snippet: string): FilterResult {
  // Check in order of specificity (cheapest checks first)

  if (isAutomatedSender(headers.from)) {
    return { needsReply: false, reason: "automated sender" };
  }

  if (isBulkMail(headers)) {
    return { needsReply: false, reason: "bulk mail (precedence header)" };
  }

  if (isCalendarOrAutoResponse(headers)) {
    return { needsReply: false, reason: "calendar invite or auto-response" };
  }

  if (isNewsletter(headers, snippet)) {
    return { needsReply: false, reason: "newsletter or marketing" };
  }

  if (isTransactional(headers, snippet)) {
    return { needsReply: false, reason: "transactional or receipt" };
  }

  if (isSupportTicket(headers)) {
    return { needsReply: false, reason: "support ticket auto-response" };
  }

  return { needsReply: true, reason: "" };
}
