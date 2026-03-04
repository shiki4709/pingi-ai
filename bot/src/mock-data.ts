import type { TrackedItem } from "./types.js";

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3600_000);
}

// Matches ITEMS from docs/design/dashboard-reference.jsx
const SEED_ITEMS: TrackedItem[] = [
  {
    id: "1",
    platform: "twitter",
    urgency: "red",
    context: "BUSINESS_OPPORTUNITY",
    priorityScore: 9,
    authorName: "Sarah Chen",
    authorHandle: "@sarahchen_vc",
    originalText:
      "Love what you're building with Pingi. We're looking at tools in this space for our portfolio companies. Would love to chat about your roadmap.",
    contextText: "Your tweet about AI tools",
    detectedAt: hoursAgo(14),
    draftText:
      "Appreciate that, Sarah. Happy to walk you through what we're building. Free Thursday or Friday for a quick call?",
    status: "pending",
  },
  {
    id: "2",
    platform: "gmail",
    urgency: "red",
    context: "OPERATIONAL",
    priorityScore: 8,
    authorName: "James Park",
    authorHandle: "james@startup.io",
    originalText:
      "Following up on the partnership proposal from last week. Let me know your thoughts.",
    contextText: "Re: Partnership Proposal",
    detectedAt: hoursAgo(18),
    draftText:
      "Hey James, took a closer look at the proposal. The integration angle makes sense. Let's do a call Thursday to go through specifics.",
    status: "pending",
  },
  {
    id: "3",
    platform: "linkedin",
    urgency: "amber",
    context: "KNOWLEDGE_EXCHANGE",
    priorityScore: 7,
    authorName: "Maria Rodriguez",
    originalText:
      "How do you handle classification when a message is ambiguous between a lead and casual interest?",
    contextText: "Your post: Building an AI engagement agent",
    detectedAt: hoursAgo(6),
    draftText:
      "We score each message 1-10 based on sender profile, language, and past engagement. Ambiguous ones land around 5-6 so they still surface without false urgency.",
    status: "pending",
  },
  {
    id: "4",
    platform: "twitter",
    urgency: "amber",
    context: "AUDIENCE_ENGAGEMENT",
    priorityScore: 6,
    authorName: "Dev Patel",
    authorHandle: "@devpatel_eng",
    originalText:
      "The urgency escalation idea is solid. Way better than just marking things unread.",
    detectedAt: hoursAgo(8),
    draftText:
      "Thanks Dev. Yeah, time-since-received turned out to be a better signal than read/unread.",
    status: "pending",
  },
  {
    id: "5",
    platform: "gmail",
    urgency: "green",
    context: "PROFESSIONAL_NETWORK",
    priorityScore: 7,
    authorName: "Yuki Tanaka",
    authorHandle: "yuki@designstudio.co",
    originalText:
      "I'm a product designer following your project. Would love to collaborate on the UI/UX.",
    contextText: "Collaboration opportunity",
    detectedAt: hoursAgo(2),
    draftText:
      "Hey Yuki, good to hear from you. Always looking to connect with designers who get the product. Got a portfolio I can check out?",
    status: "pending",
  },
  {
    id: "6",
    platform: "linkedin",
    urgency: "green",
    context: "AUDIENCE_ENGAGEMENT",
    priorityScore: 3,
    authorName: "Alex Kim",
    originalText: "Great post. Totally agree.",
    detectedAt: hoursAgo(1),
    draftText: "Thanks, Alex.",
    status: "pending",
  },
  {
    id: "7",
    platform: "twitter",
    urgency: "green",
    context: "AUDIENCE_ENGAGEMENT",
    priorityScore: 4,
    authorName: "Lisa Wang",
    authorHandle: "@lisawang_pm",
    originalText:
      "Just discovered @pingi_ai. The engagement tracking angle is smarter than just auto-replies.",
    detectedAt: hoursAgo(0.75),
    draftText:
      "Appreciate that, Lisa. That's the core idea, tracking what you're missing matters more than generating replies.",
    status: "pending",
  },
];

// In-memory store (will be replaced with Supabase)
let items: TrackedItem[] = structuredClone(SEED_ITEMS);

export function getAllItems(): TrackedItem[] {
  return items;
}

export function getPendingItems(): TrackedItem[] {
  return items
    .filter((i) => i.status === "pending")
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function getSentItems(): TrackedItem[] {
  return items.filter((i) => i.status === "sent");
}

export function getItemById(id: string): TrackedItem | undefined {
  return items.find((i) => i.id === id);
}

export function markSent(id: string, finalDraft?: string): boolean {
  const item = items.find((i) => i.id === id);
  if (!item || item.status !== "pending") return false;
  item.status = "sent";
  item.sentAt = new Date();
  if (finalDraft) item.finalDraft = finalDraft;
  return true;
}

export function markSkipped(id: string): boolean {
  const item = items.find((i) => i.id === id);
  if (!item || item.status !== "pending") return false;
  item.status = "skipped";
  return true;
}

export function updateDraft(id: string, newDraft: string): boolean {
  const item = items.find((i) => i.id === id);
  if (!item || item.status !== "pending") return false;
  item.draftText = newDraft;
  return true;
}

export function getUrgentItems(): TrackedItem[] {
  return items
    .filter((i) => i.status === "pending" && i.urgency === "red")
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function resetMockData(): void {
  items = structuredClone(SEED_ITEMS);
}
