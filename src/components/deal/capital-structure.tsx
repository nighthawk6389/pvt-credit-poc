import { fmtMM, fmtSpread } from "@/lib/utils";
import { forDisplay, isIdScheme, SCHEME_SPECS, type StoredIdentifier } from "@/lib/identifiers";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Facility = {
  id: string;
  name: string;
  type: string;
  seniority: string;
  commitment: number;
  spreadBps: number;
  floorBps: number;
  oidPct: number;
  pikBps: number;
  /** When present, the facility's live identifiers are shown under its name. */
  identifiers?: StoredIdentifier[];
};

/** The identifiers people quote for a facility, e.g. "CUSIP 53621LAB5". */
function FacilityIdentifiers({ rows }: { rows: StoredIdentifier[] }) {
  const live = forDisplay(rows);
  if (live.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 font-mono text-[10px]">
      {live.map((r) => (
        <span key={`${r.scheme}:${r.namespace}:${r.value}`} title={r.namespace || undefined}>
          <span className="text-muted-foreground">{isIdScheme(r.scheme) ? SCHEME_SPECS[r.scheme].label : r.scheme}</span>{" "}
          {r.value}
        </span>
      ))}
    </div>
  );
}

export function CapitalStructure({
  facilities,
  ebitda,
}: {
  facilities: Facility[];
  ebitda?: number | null;
}) {
  const total = facilities.reduce((s, f) => s + f.commitment, 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Facility</TableHead>
          <TableHead className="text-right">Commitment</TableHead>
          <TableHead className="text-right">Pricing</TableHead>
          <TableHead className="text-right">Floor</TableHead>
          <TableHead className="text-right">OID</TableHead>
          {ebitda ? <TableHead className="text-right">Thru x</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {facilities.map((f, idx) => {
          const cumulative = facilities
            .slice(0, idx + 1)
            .reduce((s, x) => s + x.commitment, 0);
          const thru = ebitda ? cumulative / ebitda : null;
          return (
            <TableRow key={f.id}>
              <TableCell>
                <div className="font-medium">{f.name}</div>
                <div className="text-muted-foreground text-xs">
                  {f.seniority}
                  {f.pikBps > 0 && (
                    <Badge variant="muted" className="ml-1.5 text-[9px]">
                      +{f.pikBps}bps PIK
                    </Badge>
                  )}
                </div>
                {f.identifiers && <FacilityIdentifiers rows={f.identifiers} />}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {fmtMM(f.commitment, 0)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtSpread(f.spreadBps)}
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {(f.floorBps / 100).toFixed(2)}%
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {f.oidPct ? (100 - f.oidPct).toFixed(2) : "—"}
              </TableCell>
              {ebitda ? (
                <TableCell className="text-right tabular-nums">
                  {thru ? `${thru.toFixed(1)}x` : "—"}
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
        <TableRow className="border-t-2 font-semibold">
          <TableCell>Total Facilities</TableCell>
          <TableCell className="text-right tabular-nums">
            {fmtMM(total, 0)}
          </TableCell>
          <TableCell colSpan={ebitda ? 4 : 3} />
        </TableRow>
      </TableBody>
    </Table>
  );
}
