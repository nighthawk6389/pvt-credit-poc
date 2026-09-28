import { describe, it, expect } from "vitest";

import {
  ROLES,
  can,
  canSeeDeal,
  isValidRole,
  type Role,
  type Action,
  type Resource,
} from "@/lib/auth/roles";

// Since phase 2 these functions gate real access: the role comes from an
// OrgMembership row rather than a client-supplied cookie value, so a silent
// change here is a privilege change. These tests pin the policy.

describe("permission matrix", () => {
  it("only Deal Lead and IC Member can approve a memo", () => {
    const approvers = ROLES.filter((r) => can(r, "approve", "memo"));
    expect([...approvers].sort()).toEqual(["Deal Lead", "IC Member"]);
  });

  it("only Deal Lead and IC Member can vote", () => {
    const voters = ROLES.filter((r) => can(r, "vote", "vote"));
    expect([...voters].sort()).toEqual(["Deal Lead", "IC Member"]);
  });

  it("only Deal Lead and Analyst can edit covenants", () => {
    const editors = ROLES.filter((r) => can(r, "edit", "covenant"));
    expect([...editors].sort()).toEqual(["Analyst", "Deal Lead"]);
  });

  it("only Compliance can cross the wall", () => {
    expect(ROLES.filter((r) => can(r, "cross_wall", "deal"))).toEqual(["Compliance"]);
  });

  it("Read-only can view every resource but mutate none", () => {
    const resources: Resource[] = [
      "deal", "memo", "document", "covenant", "valuation", "vote", "event", "task", "note",
    ];
    const mutations: Action[] = ["edit", "approve", "vote", "upload", "log_event", "manage_team"];
    for (const r of resources) {
      expect(can("Read-only", "view", r)).toBe(true);
      for (const m of mutations) {
        expect(can("Read-only", m, r)).toBe(false);
      }
    }
  });

  it("grants nothing for an unknown role/resource pairing", () => {
    expect(can("Analyst", "cross_wall", "deal")).toBe(false);
    expect(can("Compliance", "edit", "memo")).toBe(false);
    expect(can("IC Member", "edit", "deal")).toBe(false);
  });
});

describe("information barrier", () => {
  it("hides privileged deals from Read-only and shows them to wall-crossed roles", () => {
    const privileged = { isPrivileged: true };
    expect(canSeeDeal("Read-only", privileged)).toBe(false);
    for (const r of ROLES.filter((r) => r !== "Read-only")) {
      expect(canSeeDeal(r, privileged)).toBe(true);
    }
  });

  it("shows non-privileged deals to everyone, Read-only included", () => {
    for (const r of ROLES) {
      expect(canSeeDeal(r, { isPrivileged: false })).toBe(true);
    }
  });
});

describe("role validation guards the membership -> session boundary", () => {
  it("accepts exactly the known roles", () => {
    for (const r of ROLES) expect(isValidRole(r)).toBe(true);
  });

  it("rejects anything else, so a bad membership row cannot widen access", () => {
    for (const bad of ["admin", "Owner", "", "deal lead", "READ-ONLY", null, undefined]) {
      expect(isValidRole(bad as unknown as Role)).toBe(false);
    }
  });
});
