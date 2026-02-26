import { Urgency, Platform, ItemType } from "./types";

interface SLAConfig {
  greenHours: number;
  amberHours: number;
}

const DEFAULT_SLA: SLAConfig = {
  greenHours: 4,
  amberHours: 12,
};

export function calculateUrgency(
  detectedAt: Date,
  now: Date = new Date(),
  sla: SLAConfig = DEFAULT_SLA
): Urgency {
  const hoursElapsed =
    (now.getTime() - detectedAt.getTime()) / (1000 * 60 * 60);

  if (hoursElapsed < sla.greenHours) return "green";
  if (hoursElapsed < sla.amberHours) return "amber";
  return "red";
}

// Some platforms reward fast replies more — boost urgency
export function adjustForPlatform(
  base: Urgency,
  platform: Platform,
  itemType: ItemType
): Urgency {
  // Twitter mentions decay fast
  if (platform === "twitter" && itemType === "mention") {
    if (base === "green") return "amber";
    if (base === "amber") return "red";
  }

  // Email follow-ups are high priority
  if (platform === "gmail" && itemType === "email") {
    if (base === "green") return "amber";
  }

  return base;
}

export function urgencyEmoji(u: Urgency): string {
  return u === "red" ? "🔥" : u === "amber" ? "⚡" : "💬";
}

export function urgencyLabel(u: Urgency): string {
  return u === "red"
    ? "URGENT — overdue"
    : u === "amber"
      ? "Getting stale"
      : "Fresh";
}
