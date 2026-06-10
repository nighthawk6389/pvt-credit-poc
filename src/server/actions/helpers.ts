import "server-only";

import { db } from "@/lib/db";
import { getActiveRole } from "@/lib/auth/server";
import { can, ROLE_META, type Action, type Resource } from "@/lib/auth/roles";

/** Resolve the acting role + display name, enforce a permission, then run. */
export async function guard(action: Action, resource: Resource) {
  const role = await getActiveRole();
  if (!can(role, action, resource)) {
    throw new Error(
      `Forbidden: role "${role}" cannot ${action} ${resource}. Switch roles to proceed.`,
    );
  }
  return { role, actor: ROLE_META[role].person };
}

export async function logActivity(
  dealId: string,
  actor: string,
  role: string,
  actionText: string,
  target?: string,
) {
  await db.activityLog.create({
    data: { dealId, actor, role, action: actionText, target },
  });
}
