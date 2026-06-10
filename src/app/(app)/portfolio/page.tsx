import { getActiveRole } from "@/lib/auth/server";
import { getPortfolioBook } from "@/server/queries/portfolio";
import { fmtMM, fmtPct } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { PortfolioTable } from "@/components/tables/portfolio-table";
import { Card, CardContent } from "@/components/ui/card";

export default async function PortfolioPage() {
  const role = await getActiveRole();
  const positions = await getPortfolioBook(role);

  const committed = positions.reduce((s, p) => s + p.size, 0);
  const funded = positions.reduce((s, p) => s + p.funded, 0);
  const watch = positions.filter((p) => p.watchlist).length;
  const avgMark =
    positions.filter((p) => p.mark != null).reduce((s, p) => s + (p.mark ?? 0), 0) /
    (positions.filter((p) => p.mark != null).length || 1);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Portfolio Book"
        description={`${positions.length} funded positions under active monitoring`}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Committed" value={fmtMM(committed, 0)} />
        <Stat label="Funded" value={fmtMM(funded, 0)} />
        <Stat label="Avg. Mark" value={fmtPct(avgMark)} />
        <Stat label="On Watchlist" value={String(watch)} />
      </div>

      <PortfolioTable positions={positions} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
