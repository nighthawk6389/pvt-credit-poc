import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { DEFAULT_ROLE, isValidRole, type Role } from "./roles";
import { USER_COOKIE } from "./constants";

export interface Session {
  user: { id: string; name: string; title: string | null; initials: string | null };
  role: Role;
  orgId: string;
}

/**
 * The data access layer for identity. Every server read/mutation resolves the
 * acting user through here, so permissions derive from a real OrgMembership
 * rather than a role string handed over by the client.
 *
 * Memoized per render pass with React `cache` so a page that checks the session
 * in several places still issues one query.
 *
 * NOTE: this is deliberately not authentication — there is no credential check.
 * The cookie names which seeded user you are acting as. Swapping it for a real
 * verified session is the remaining work; every call site is already routed
 * through this function, so that change is contained here.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_COOKIE)?.value;

  const membership = userId
    ? await db.orgMembership.findFirst({
        where: { userId, user: { isActive: true } },
        include: { user: true },
      })
    : null;

  // No (or stale) cookie: fall back to a Deal Lead so the demo is usable on a
  // first visit, mirroring "logged in as the deal team".
  const resolved =
    membership ??
    (await db.orgMembership.findFirst({
      where: { role: "Deal Lead", user: { isActive: true } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    })) ??
    (await db.orgMembership.findFirst({
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }));

  if (!resolved) return null;

  return {
    user: {
      id: resolved.user.id,
      name: resolved.user.name,
      title: resolved.user.title,
      initials: resolved.user.initials,
    },
    role: isValidRole(resolved.role) ? resolved.role : DEFAULT_ROLE,
    orgId: resolved.orgId,
  };
});

/** All users who can be acted as, for the switcher. */
export const listUsers = cache(async () => {
  const memberships = await db.orgMembership.findMany({
    where: { user: { isActive: true } },
    include: { user: true },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
  });
  return memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    title: m.user.title,
    initials: m.user.initials,
    role: isValidRole(m.role) ? m.role : DEFAULT_ROLE,
  }));
});
