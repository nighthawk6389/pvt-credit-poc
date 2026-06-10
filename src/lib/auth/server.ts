import { cookies } from "next/headers";

import { DEFAULT_ROLE, isValidRole, type Role } from "./roles";
import { ROLE_COOKIE } from "./constants";

export { ROLE_COOKIE };

/** Read the active role from the cookie (server components / actions). */
export async function getActiveRole(): Promise<Role> {
  const store = await cookies();
  const value = store.get(ROLE_COOKIE)?.value;
  return isValidRole(value) ? value : DEFAULT_ROLE;
}
