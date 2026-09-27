import { DEFAULT_ROLE, type Role } from "./roles";
import { getSession } from "./session";

export { USER_COOKIE } from "./constants";
export { getSession, listUsers } from "./session";

/**
 * The acting user's org role. Retained as a thin wrapper over getSession() so
 * the many server components that only need the role stay unchanged.
 */
export async function getActiveRole(): Promise<Role> {
  return (await getSession())?.role ?? DEFAULT_ROLE;
}
