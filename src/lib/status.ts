// Centralized mapping of domain statuses → badge variants & colors.
import type { ComponentProps } from "react";
import type { Badge } from "@/components/ui/badge";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

export const STAGE_ORDER = [
  "Sourcing",
  "Screening",
  "Diligence",
  "IC",
  "Docs",
  "Closed",
  "Passed",
] as const;

export function stageVariant(stage: string): BadgeVariant {
  switch (stage) {
    case "Sourcing":
    case "Screening":
      return "muted";
    case "Diligence":
      return "info";
    case "IC":
      return "warning";
    case "Docs":
      return "info";
    case "Closed":
      return "success";
    case "Passed":
      return "danger";
    default:
      return "secondary";
  }
}

export function covenantVariant(status: string): BadgeVariant {
  switch (status) {
    case "Pass":
      return "success";
    case "Breach":
      return "danger";
    case "Near-breach":
      return "warning";
    case "Recon-flag":
      return "warning";
    case "Late":
      return "danger";
    case "Missing":
      return "danger";
    case "Delivered":
      return "success";
    case "Pending":
      return "muted";
    case "N/A-springing":
      return "muted";
    case "Waived":
      return "warning";
    case "Upcoming":
      return "muted";
    default:
      return "secondary";
  }
}

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case "Active":
    case "Cleared":
    case "Approved":
    case "Completed":
    case "Final":
    case "Done":
      return "success";
    case "On Hold":
    case "In Review":
    case "Conditional":
    case "Doing":
    case "Committee":
    case "Pending":
      return "warning";
    case "Passed":
    case "Rejected":
    case "Flag":
    case "Breach":
      return "danger";
    case "Draft":
    case "Todo":
    case "Open":
      return "muted";
    default:
      return "secondary";
  }
}

// Internal 1-7 risk rating → variant. 1-3 strong, 4-5 watch, 6-7 distressed.
export function ratingVariant(rating: string | null | undefined): BadgeVariant {
  const r = Number(rating);
  if (!r) return "muted";
  if (r <= 3) return "success";
  if (r <= 5) return "warning";
  return "danger";
}

export function voteVariant(vote: string): BadgeVariant {
  switch (vote) {
    case "Approve":
      return "success";
    case "Reject":
      return "danger";
    case "Conditional":
      return "warning";
    case "Abstain":
      return "muted";
    default:
      return "secondary";
  }
}

export function priorityVariant(p: string): BadgeVariant {
  switch (p) {
    case "High":
      return "danger";
    case "Medium":
      return "warning";
    case "Low":
      return "muted";
    default:
      return "secondary";
  }
}
