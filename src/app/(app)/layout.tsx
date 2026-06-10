import { getActiveRole } from "@/lib/auth/server";
import { getPaletteItems } from "@/server/queries/shell";
import { RoleProvider } from "@/lib/auth/context";
import { SidebarContent } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getActiveRole();
  const paletteItems = await getPaletteItems(role);

  return (
    <RoleProvider initialRole={role}>
      <div className="flex min-h-screen">
        <aside className="border-sidebar-border/60 sticky top-0 hidden h-screen w-60 shrink-0 border-r lg:block">
          <SidebarContent />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
      <CommandPalette items={paletteItems} />
    </RoleProvider>
  );
}
