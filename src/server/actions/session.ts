"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { USER_COOKIE } from "@/lib/auth/constants";
import { cookies } from "next/headers";

/**
 * Act as a different user. Cookies cannot be written while rendering a Server
 * Component, so this runs as a Server Function; the cookie is httpOnly so the
 * browser cannot forge an identity client-side.
 */
export async function switchUser(userId: string) {
  const user = await db.user.findFirst({
    where: { id: userId, isActive: true },
    include: { memberships: true },
  });
  if (!user || user.memberships.length === 0) {
    throw new Error("Unknown user");
  }

  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE, user.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return { name: user.name };
}
