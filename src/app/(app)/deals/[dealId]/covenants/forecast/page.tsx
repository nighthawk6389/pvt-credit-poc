import { notFound } from "next/navigation";
import { LineChart } from "lucide-react";

import { getActiveRole } from "@/lib/auth/server";
import { getForecastInputs } from "@/server/queries/covenants";
import { AccessDenied } from "@/components/deal/access-denied";
import { ScenarioSlider } from "@/components/covenants/scenario-slider";
import { Card, CardContent } from "@/components/ui/card";

export default async function ForecastPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const role = await getActiveRole();
  const data = await getForecastInputs(dealId, role);
  if (data.blocked) return <AccessDenied />;
  if (!data.deal) notFound();

  return (
    <div className="space-y-4">
      <Card className="border-[color-mix(in_oklch,var(--info)_25%,transparent)] bg-[color-mix(in_oklch,var(--info)_5%,var(--card))]">
        <CardContent className="flex items-start gap-3 pt-6 text-sm">
          <LineChart className="mt-0.5 size-5 shrink-0 text-[var(--info)]" />
          <div>
            <p className="font-medium">Forecasting & early warning</p>
            <p className="text-muted-foreground leading-relaxed">
              Break-even EBITDA per covenant, projected headroom against the
              stepped-down thresholds, and an interactive downside scenario.
              Drag the sliders to stress EBITDA and rates and watch which
              covenants trip, and when.
            </p>
          </div>
        </CardContent>
      </Card>

      <ScenarioSlider definitions={data.definitions} periods={data.periods} />
    </div>
  );
}
