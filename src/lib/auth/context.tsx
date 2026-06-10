"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DEFAULT_ROLE, type Role } from "./roles";
import { ROLE_COOKIE } from "./constants";

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
};

const RoleContext = React.createContext<RoleContextValue | null>(null);

export function RoleProvider({
  initialRole,
  children,
}: {
  initialRole: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRoleState] = React.useState<Role>(initialRole ?? DEFAULT_ROLE);

  const setRole = React.useCallback(
    (next: Role) => {
      setRoleState(next);
      // Persist to cookie so server components/actions read the same value,
      // then refresh to re-fetch server-filtered data (wall-cross demo).
      document.cookie = `${ROLE_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
    [router],
  );

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = React.useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
