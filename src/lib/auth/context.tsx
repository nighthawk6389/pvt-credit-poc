"use client";

import * as React from "react";

import { DEFAULT_ROLE, type Role } from "./roles";

export interface ClientSession {
  userId: string;
  name: string;
  title: string | null;
  initials: string | null;
  role: Role;
}

const SessionContext = React.createContext<ClientSession | null>(null);

/** Publishes the server-resolved session to client components. */
export function SessionProvider({
  session,
  children,
}: {
  session: ClientSession | null;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
  );
}

export function useSession(): ClientSession | null {
  return React.useContext(SessionContext);
}

/**
 * The acting user's role. Kept as a named hook because most client components
 * only gate on the role; identity now comes from the database, not the cookie.
 */
export function useRole(): { role: Role } {
  const session = React.useContext(SessionContext);
  return { role: session?.role ?? DEFAULT_ROLE };
}
