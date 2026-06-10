import { db } from "@/lib/db";
import { canSeeDeal, type Role } from "@/lib/auth/roles";
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
      borrower: { select: { id: true, name: true, sector: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const visible = deals.filter((d) => canSeeDeal(role, d));

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
