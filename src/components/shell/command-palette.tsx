"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  GitBranch,
  Building2,
  FileText,
} from "lucide-react";

import { PRIMARY_NAV } from "@/lib/nav";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export type PaletteItem = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  group: "Deals" | "Borrowers";
};

export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-command-palette", handler);
    return () => window.removeEventListener("open-command-palette", handler);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const deals = items.filter((i) => i.group === "Deals");
  const borrowers = items.filter((i) => i.group === "Borrowers");

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search deals, borrowers, or jump to a page…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {PRIMARY_NAV.map((n) => (
            <CommandItem
              key={n.href}
              value={`nav ${n.title}`}
              onSelect={() => go(n.href)}
            >
              <n.icon />
              {n.title}
            </CommandItem>
          ))}
        </CommandGroup>
        {deals.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Deals">
              {deals.map((i) => (
                <CommandItem
                  key={i.id}
                  value={`deal ${i.label} ${i.sublabel ?? ""}`}
                  onSelect={() => go(i.href)}
                >
                  <GitBranch />
                  <span>{i.label}</span>
                  {i.sublabel && (
                    <span className="text-muted-foreground ml-auto text-xs">
                      {i.sublabel}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {borrowers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Borrowers">
              {borrowers.map((i) => (
                <CommandItem
                  key={i.id}
                  value={`borrower ${i.label} ${i.sublabel ?? ""}`}
                  onSelect={() => go(i.href)}
                >
                  <Building2 />
                  <span>{i.label}</span>
                  {i.sublabel && (
                    <span className="text-muted-foreground ml-auto text-xs">
                      {i.sublabel}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Quick links">
          <CommandItem value="portfolio book" onSelect={() => go("/portfolio")}>
            <Briefcase />
            Portfolio book
          </CommandItem>
          <CommandItem value="covenant calendar" onSelect={() => go("/covenants")}>
            <FileText />
            Covenant calendar
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
