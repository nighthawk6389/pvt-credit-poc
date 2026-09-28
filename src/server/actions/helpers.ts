import "server-only";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { can, type Action, type Resource } from "@/lib/auth/roles";

/**
 * Resolve the acting user, enforce a permission, and hand back their identity.
 * Server Actions are public endpoints, so every mutation goes through this.
 */
export async function guard(action: Action, resource: Resource) {
  const session = await getSession();
  if (!session) throw new Error("No active session");
  if (!can(session.role, action, resource)) {
    throw new Error(
      `Forbidden: role "${session.role}" cannot ${action} ${resource}. Switch users to proceed.`,
    );
  }
  return { role: session.role, actorId: session.user.id, actorName: session.user.name };
}

export async function logActivity(
  dealId: string,
  actorId: string,
  role: string,
  actionText: string,
  target?: string,
) {
  await db.activityLog.create({
    data: { dealId, actorId, role, action: actionText, target },
  });
}
