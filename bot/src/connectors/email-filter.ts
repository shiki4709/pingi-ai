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

/** Extra context passed from the connector for smarter filtering. */
export interface FilterContext {
  /** True if the email is in a multi-message thread or subject has Re:/Fwd: */
  isReplyThread?: boolean;
  /** True if the email snippet contains the user's name */
  mentionsUserName?: boolean;
  /** True if sender has a human name pattern AND snippet contains outreach language */
  hasPersonalOutreach?: boolean;
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
  // Job application platforms
  "@ashbyhq.com", "@workablemail.com", "@gem.com",
  "@myworkday.com", "@polymer.co",
  // Social media notifications
  "@nextdoor.com", "@rs.email.nextdoor.com",
  "@facebookmail.com", "@twitter.com", "@instagram.com",
  // E-commerce
  "@amazon.com", "@amazon.co.jp",
];

function isAutomatedSender(from: string): boolean {
  const lower = from.toLowerCase();
  return AUTOMATED_SENDERS.some((p) => lower.includes(p));
}

// ─── 1b. Automated sender subdomain patterns ───
// Subdomains like mail.*, email.*, news.* etc. are almost always automated

const AUTOMATED_SUBDOMAINS = [
  "mail.", "email.", "news.", "newsletter.",
  "marketing.", "promo.", "campaign.", "em.", "rs.",
  "bounce.", "send.", "bulk.", "msg.", "e.",
];

function isAutomatedSubdomain(from: string): boolean {
  // Extract domain from "Name <user@sub.domain.com>" or "user@sub.domain.com"
  const emailMatch = from.match(/@([^\s>]+)/i);
  if (!emailMatch) return false;
  const domain = emailMatch[1].toLowerCase();
  return AUTOMATED_SUBDOMAINS.some((sub) => domain.startsWith(sub));
}

// ─── 2. Newsletter / marketing detection ───

function isNewsletter(headers: EmailHeaders, snippet: string): boolean {
  // Note: List-Unsubscribe is checked earlier in shouldReply()

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

  // Calendar response subjects (match at start or anywhere)
  const subjectLower = headers.subject.toLowerCase();
  const startsWithPatterns = [
    "accepted:", "declined:", "tentative:",
  ];
  if (startsWithPatterns.some((p) => subjectLower.startsWith(p))) return true;

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

// ─── Generic local parts (used by multiple checks below) ───
// Real humans use their name (john@, sarah.lee@), not these generic addresses.

export const GENERIC_LOCAL_PARTS = new Set([
  "news", "noreply", "no-reply", "info", "support", "service",
  "marketing", "hello", "team", "notifications", "updates",
  "alert", "alerts", "cs", "reply", "contact", "admin",
  "sales", "billing", "help", "feedback", "newsletter",
  "promo", "promotions", "offers", "deals", "announce",
  "digest", "notification", "system", "mailer", "postmaster",
  "do-not-reply", "donotreply", "members", "community",
]);

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

  // Job application auto-replies: only filter if sender is generic (noreply, team, etc.)
  // Real recruiters (max@, sarah@) writing about applications should get through.
  const jobAppPatterns = [
    "thanks for applying", "thank you for applying",
    "application confirmation", "application received",
    "your application was sent", "your application has been",
    "we received your application",
  ];
  const hasJobAppSubject = jobAppPatterns.some((p) => subjectLower.includes(p))
    || jobAppPatterns.some((p) => snippetLower.includes(p));
  if (hasJobAppSubject) {
    const local = extractLocalPart(headers.from);
    if (local && GENERIC_LOCAL_PARTS.has(local)) return true;
    // Human sender with job-app language — don't filter (likely a real recruiter)
  }

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

// ─── 7. Emoji-heavy subjects (3+ emojis = marketing) ───

const EMOJI_RE = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

function isEmojiHeavySubject(subject: string): boolean {
  const matches = subject.match(EMOJI_RE);
  return !!matches && matches.length >= 3;
}

// ─── 8. Empty/near-empty snippet (auto-generated) ───

function isEmptySnippet(snippet: string): boolean {
  return snippet.trim().length < 20;
}

// ─── 9. Domain whitelist (two-tier trust) ───
// Personal domains (gmail, yahoo, etc.) = fully trusted.
// Whitelisted business domains = pass domain check but still filtered
// if the sender looks automated (generic local part, long snippet, etc.)
// Unknown domains = always filtered.

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.jp",
  "hotmail.com", "outlook.com", "live.com",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me", "pm.me",
  "aol.com", "zoho.com",
]);

export function extractDomain(from: string): string | null {
  const match = from.match(/@([^\s>]+)/i);
  if (!match) return null;
  return match[1].toLowerCase();
}

export function extractLocalPart(from: string): string | null {
  const match = from.match(/([^<\s]+)@/i);
  if (!match) return null;
  return match[1].toLowerCase();
}

function isPersonalDomain(domain: string): boolean {
  return PERSONAL_DOMAINS.has(domain);
}

// ─── 9b. Generic local part check ───

function isGenericLocalPart(from: string): boolean {
  const local = extractLocalPart(from);
  if (!local) return false;
  return GENERIC_LOCAL_PARTS.has(local);
}

// ─── 9c. Long snippet check ───
// Marketing emails tend to be long; personal emails are short.

function isLongSnippet(snippet: string): boolean {
  return snippet.length > 500;
}

// ─── Main filter ───

export function shouldReply(
  headers: EmailHeaders,
  snippet: string,
  whitelistedDomains?: Set<string>,
  filterContext?: FilterContext
): FilterResult {
  // Check in order of specificity (cheapest checks first)

  if (isAutomatedSender(headers.from)) {
    return { needsReply: false, reason: "automated sender" };
  }

  if (isAutomatedSubdomain(headers.from)) {
    return { needsReply: false, reason: "automated subdomain (mail./email./news./etc.)" };
  }

  if (isBulkMail(headers)) {
    return { needsReply: false, reason: "bulk mail (precedence header)" };
  }

  if (isCalendarOrAutoResponse(headers)) {
    return { needsReply: false, reason: "calendar invite or auto-response" };
  }

  // List-Unsubscribe is the strongest marketing signal — check early
  if (headers.listUnsubscribe) {
    return { needsReply: false, reason: "has List-Unsubscribe header (marketing)" };
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

  if (isEmojiHeavySubject(headers.subject)) {
    return { needsReply: false, reason: "emoji-heavy subject (marketing)" };
  }

  if (isEmptySnippet(snippet)) {
    return { needsReply: false, reason: "empty or near-empty snippet (auto-generated)" };
  }

  // ─── Two-tier domain trust ───
  const domain = extractDomain(headers.from);

  // Tier 1: Personal email domains are fully trusted
  if (domain && isPersonalDomain(domain)) {
    return { needsReply: true, reason: "" };
  }

  // Tier 2: Whitelisted business domains pass the domain gate
  // but must still pass additional scrutiny
  if (whitelistedDomains && domain && whitelistedDomains.has(domain)) {
    // Even whitelisted business domains get filtered for these signals
    if (isGenericLocalPart(headers.from)) {
      const local = extractLocalPart(headers.from) ?? "unknown";
      return { needsReply: false, reason: `generic sender address "${local}@" on business domain` };
    }

    if (isLongSnippet(snippet)) {
      return { needsReply: false, reason: `long snippet (${snippet.length} chars) from business domain — likely automated` };
    }

    // Passed all checks — likely a real person at a known company
    return { needsReply: true, reason: "" };
  }

  // Tier 3: Unknown domain — not personal, not whitelisted
  // But let through if it looks like a reply to something the user initiated,
  // mentions the user by name, or has personal outreach signals from a real person.
  if (filterContext?.isReplyThread) {
    return { needsReply: true, reason: "" };
  }
  if (filterContext?.mentionsUserName) {
    return { needsReply: true, reason: "" };
  }
  if (filterContext?.hasPersonalOutreach) {
    return { needsReply: true, reason: "" };
  }

  return { needsReply: false, reason: `domain "${domain ?? "unknown"}" not in sent-to whitelist` };
}
