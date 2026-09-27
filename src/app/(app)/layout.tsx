import { getSession, listUsers } from "@/lib/auth/server";
import { getPaletteItems } from "@/server/queries/shell";
import { SessionProvider } from "@/lib/auth/context";
import { SidebarContent } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";
import { DEFAULT_ROLE } from "@/lib/auth/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const [paletteItems, users] = await Promise.all([
    getPaletteItems(session?.role ?? DEFAULT_ROLE),
    listUsers(),
  ]);

  return (
    <SessionProvider
      session={
        session
          ? {
              userId: session.user.id,
              name: session.user.name,
              title: session.user.title,
              initials: session.user.initials,
              role: session.role,
            }
          : null
      }
    >
      <div className="flex min-h-screen">
        <aside className="border-sidebar-border/60 sticky top-0 hidden h-screen w-60 shrink-0 border-r lg:block">
          <SidebarContent />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar users={users} />
          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
      <CommandPalette items={paletteItems} />
    </SessionProvider>
  );
}
