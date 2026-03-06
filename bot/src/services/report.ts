/**
 * Weekly engagement report generator.
 *
 * Produces a MarkdownV2-formatted Telegram message summarising
 * the past 7 days of engagement activity.
 */

import type { TrackedItem, Platform, Urgency } from "../types.js";

// ─── MarkdownV2 escaping (same pattern as formatter.ts) ───

const SPECIAL = /([_*\[\]()~`>#+\-=|{}.!\\])/g;
function esc(text: string): string {
  return text.replace(SPECIAL, "\\$1");
}

// ─── Helpers ───

function pct(n: number, total: number): string {
  if (total === 0) return "0";
  return Math.round((n / total) * 100).toString();
}

function bar(n: number, total: number, width = 10): string {
  if (total === 0) return esc("-".repeat(width));
  const filled = Math.round((n / total) * width);
  return esc("\u2588".repeat(filled) + "\u2591".repeat(width - filled));
}

// ─── Report generator ───

export function generateWeeklyReport(items: TrackedItem[]): string {
  const total = items.length;

  // Platform breakdown
  const byPlatform: Record<Platform, number> = {
    gmail: 0,
    twitter: 0,
    linkedin: 0,
  };
  for (const item of items) {
    byPlatform[item.platform]++;
  }

  // Urgency breakdown
  const byUrgency: Record<Urgency, number> = {
    red: 0,
    amber: 0,
    green: 0,
  };
  for (const item of items) {
    byUrgency[item.urgency]++;
  }

  // Status breakdown
  const sent = items.filter((i) => i.status === "sent").length;
  const skipped = items.filter((i) => i.status === "skipped").length;
  const pending = items.filter((i) => i.status === "pending").length;
  const responseRate = pct(sent, sent + skipped);

  // Date range
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // ─── Build the message ───

  const lines: string[] = [];

  // Header
  lines.push(
    `*Weekly Engagement Report*`,
    `${esc(fmt(weekAgo))} \\- ${esc(fmt(now))}`,
    ``
  );

  // Overview
  lines.push(
    `*Overview*`,
    `Total items: *${esc(String(total))}*`,
    `Response rate: *${esc(responseRate)}%*`,
    ``
  );

  // Platform breakdown
  const platformLabels: Record<Platform, string> = {
    gmail: "Gmail",
    twitter: "X / Twitter",
    linkedin: "LinkedIn",
  };
  lines.push(`*By Platform*`);
  for (const p of ["gmail", "twitter", "linkedin"] as Platform[]) {
    const count = byPlatform[p];
    lines.push(
      `${bar(count, total)} ${esc(platformLabels[p])}: *${esc(String(count))}*`
    );
  }
  lines.push(``);

  // Urgency breakdown
  const urgencyLabels: Record<Urgency, string> = {
    red: "Urgent",
    amber: "Getting stale",
    green: "Fresh",
  };
  lines.push(`*By Urgency*`);
  for (const u of ["red", "amber", "green"] as Urgency[]) {
    const count = byUrgency[u];
    lines.push(
      `${bar(count, total)} ${esc(urgencyLabels[u])}: *${esc(String(count))}*`
    );
  }
  lines.push(``);

  // Action breakdown
  lines.push(
    `*Actions Taken*`,
    `Sent: *${esc(String(sent))}*`,
    `Skipped: *${esc(String(skipped))}*`,
    `Pending: *${esc(String(pending))}*`,
    ``
  );

  // Footer
  lines.push(`_Pingi Weekly Digest_`);

  return lines.join("\n");
}
