/**
 * Plan/access helpers.
 *
 * Pro access = plan is 'pro', OR plan is 'trial' with trial_ends_at in the future.
 * Admin emails always get Pro access regardless.
 */

const ADMIN_EMAILS = ["shiki4709@gmail.com"];

export interface UserPlan {
  plan: string | null;
  trial_ends_at: string | null;
  email: string | null;
}

export function hasPro(user: UserPlan): boolean {
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return true;
  }
  if (user.plan === "pro") return true;
  if (user.plan === "trial" && user.trial_ends_at) {
    return new Date(user.trial_ends_at) > new Date();
  }
  return false;
}

export function trialExpired(user: UserPlan): boolean {
  if (user.plan !== "trial") return false;
  if (!user.trial_ends_at) return true;
  return new Date(user.trial_ends_at) <= new Date();
}

export function daysLeftInTrial(user: UserPlan): number {
  if (user.plan !== "trial" || !user.trial_ends_at) return 0;
  const ms = new Date(user.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
