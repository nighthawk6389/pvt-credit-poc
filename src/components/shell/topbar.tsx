"use client";

import { MenuIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RoleSwitcher } from "@/components/shell/role-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { SidebarContent } from "@/components/shell/sidebar";

export function TopBar() {
  const openPalette = () =>
    window.dispatchEvent(new Event("open-command-palette"));

  return (
    <header className="bg-background/80 border-border/70 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md lg:px-6">
      {/* Mobile nav */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="lg:hidden">
            <MenuIcon className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <button
        onClick={openPalette}
        className="text-muted-foreground border-border/70 bg-muted/40 hover:bg-muted flex h-9 w-full max-w-md items-center gap-2 rounded-md border px-3 text-sm transition-colors"
      >
        <SearchIcon className="size-4" />
        <span className="flex-1 text-left">Search deals, borrowers…</span>
        <kbd className="bg-background text-muted-foreground pointer-events-none hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <RoleSwitcher />
      </div>
    </header>
  );
}
