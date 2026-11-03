import { db } from "@/lib/db";
import { canSeeDeal, type Role } from "@/lib/auth/roles";
import { borrowerProfiles } from "@/server/masters";
import type { PaletteItem } from "@/components/shell/command-palette";
import { fmtMM } from "@/lib/utils";

/** Deals + borrowers for the command palette, filtered by information barrier. */
export async function getPaletteItems(role: Role): Promise<PaletteItem[]> {
  const deals = await db.deal.findMany({
    select: {
      id: true,
      codeName: true,
      dealSize: true,
      isPrivileged: true,
      borrower: { select: { id: true, masterRef: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const filtered = deals.filter((d) => canSeeDeal(role, d));
  const profile = await borrowerProfiles(filtered.map((d) => d.borrower));
  const visible = filtered.map((d) => ({ ...d, borrower: profile(d.borrower) }));

  const dealItems: PaletteItem[] = visible.map((d) => ({
    id: d.id,
    label: d.codeName,
    sublabel: `${d.borrower.name} · ${fmtMM(d.dealSize, 0)}`,
    href: `/deals/${d.id}`,
    group: "Deals",
  }));

  const seen = new Set<string>();
  const borrowerItems: PaletteItem[] = [];
  for (const d of visible) {
    if (seen.has(d.borrower.id)) continue;
    seen.add(d.borrower.id);
    borrowerItems.push({
      id: d.borrower.id,
      label: d.borrower.name,
      sublabel: d.borrower.sector,
      href: `/portfolio/${d.borrower.id}`,
      group: "Borrowers",
    });
  }

  return [...dealItems, ...borrowerItems];
}
