import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  Scale,
  Clock,
  MinusCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  covenantVariant,
  ratingVariant,
  stageVariant,
  statusVariant,
} from "@/lib/status";

export function StageBadge({ stage }: { stage: string }) {
  return <Badge variant={stageVariant(stage)}>{stage}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
}

export function CovenantChip({ status }: { status: string }) {
  const Icon =
    status === "Breach" || status === "Missing"
      ? AlertTriangle
      : status === "Recon-flag"
        ? Scale
        : status === "Late"
          ? Clock
          : status === "N/A-springing"
            ? MinusCircle
            : null;
  return (
    <Badge variant={covenantVariant(status)} className="gap-1 whitespace-nowrap">
      {Icon && <Icon className="size-3" />}
      {status}
    </Badge>
  );
}

export function RiskRatingBadge({
  rating,
  trend,
}: {
  rating: string | null | undefined;
  trend?: string | null;
}) {
  if (!rating) return <span className="text-muted-foreground">—</span>;
  const TrendIcon =
    trend === "Improving"
      ? ArrowUpRight
      : trend === "Deteriorating"
        ? ArrowDownRight
        : ArrowRight;
  const trendColor =
    trend === "Improving"
      ? "text-[var(--success)]"
      : trend === "Deteriorating"
        ? "text-[var(--danger)]"
        : "text-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant={ratingVariant(rating)} className="tabular-nums">
        {rating}/7
      </Badge>
      {trend && <TrendIcon className={cn("size-3.5", trendColor)} />}
    </span>
  );
}

export function WatchlistBadge() {
  return (
    <Badge variant="warning" className="gap-1">
      <AlertTriangle className="size-3" />
      Watchlist
    </Badge>
  );
}
