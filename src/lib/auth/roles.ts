// Simulated access control for the deal room.
// Demonstrates the "privileged deal team" / information-barrier (ethical wall)
// concept without standing up real auth.

export const ROLES = [
  "Deal Lead",
  "Analyst",
  "IC Member",
  "Compliance",
  "Read-only",
] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "Deal Lead";

export type Action =
  | "view"
  | "edit"
  | "vote"
  | "approve"
  | "cross_wall"
  | "manage_team"
  | "upload"
  | "log_event";

export type Resource =
  | "deal"
  | "memo"
  | "document"
  | "covenant"
  | "valuation"
  | "vote"
  | "event"
  | "task"
  | "note";

// Role -> Resource -> allowed actions.
const PERMISSIONS: Record<Role, Partial<Record<Resource, Action[]>>> = {
  "Deal Lead": {
    deal: ["view", "edit", "manage_team"],
    memo: ["view", "edit", "approve"],
    document: ["view", "upload"],
    covenant: ["view", "edit"],
    valuation: ["view", "edit"],
    vote: ["view", "vote"],
    event: ["view", "log_event"],
    task: ["view", "edit"],
    note: ["view", "edit"],
  },
  Analyst: {
    deal: ["view", "edit"],
    memo: ["view", "edit"],
    document: ["view", "upload"],
    covenant: ["view", "edit"],
    valuation: ["view", "edit"],
    vote: ["view"],
    event: ["view", "log_event"],
    task: ["view", "edit"],
    note: ["view", "edit"],
  },
  "IC Member": {
    deal: ["view"],
    memo: ["view", "approve"],
    document: ["view"],
    covenant: ["view"],
    valuation: ["view"],
    vote: ["view", "vote"],
    event: ["view"],
    task: ["view"],
    note: ["view"],
  },
  Compliance: {
    deal: ["view", "cross_wall"],
    memo: ["view"],
    document: ["view"],
    covenant: ["view"],
    valuation: ["view"],
    vote: ["view"],
    event: ["view"],
    task: ["view"],
    note: ["view"],
  },
  "Read-only": {
    deal: ["view"],
    memo: ["view"],
    document: ["view"],
    covenant: ["view"],
    valuation: ["view"],
    vote: ["view"],
    event: ["view"],
    task: ["view"],
    note: ["view"],
  },
};

export function can(role: Role, action: Action, resource: Resource): boolean {
  return PERMISSIONS[role]?.[resource]?.includes(action) ?? false;
}

// Information barrier: a privileged (wall-crossed) deal is only visible to the
// active deal team and Compliance. Read-only / outside users cannot see it.
export function canSeeDeal(
  role: Role,
  deal: { isPrivileged: boolean },
): boolean {
  if (!deal.isPrivileged) return true;
  return role !== "Read-only";
}

export function isValidRole(value: string | undefined | null): value is Role {
  return !!value && (ROLES as readonly string[]).includes(value);
}

export const ROLE_META: Record<
  Role,
  { initials: string; person: string; blurb: string; tone: string }
> = {
  "Deal Lead": {
    initials: "JM",
    person: "Jordan Mercer",
    blurb: "Originates & owns the transaction end-to-end",
    tone: "info",
  },
  Analyst: {
    initials: "AP",
    person: "Avery Patel",
    blurb: "Builds the model, runs diligence & the memo",
    tone: "primary",
  },
  "IC Member": {
    initials: "RC",
    person: "Riley Chen",
    blurb: "Votes at Investment Committee",
    tone: "success",
  },
  Compliance: {
    initials: "SK",
    person: "Sam Okafor",
    blurb: "Manages wall-crossings & information barriers",
    tone: "warning",
  },
  "Read-only": {
    initials: "GU",
    person: "Guest User",
    blurb: "Limited view — privileged deals hidden",
    tone: "muted",
  },
};
