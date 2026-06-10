"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useRole } from "@/lib/auth/context";
import { can } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addValuation } from "@/server/actions/deal-ops";

export function AddValuation({
  dealId,
  borrowerId,
}: {
  dealId: string;
  borrowerId: string;
}) {
  const { role } = useRole();
  const [open, setOpen] = React.useState(false);
  const [method, setMethod] = React.useState("Yield");
  const [pct, setPct] = React.useState("99.0");
  const [rate, setRate] = React.useState("10.0");
  const [note, setNote] = React.useState("");
  const [pending, start] = React.useTransition();

  if (!can(role, "edit", "valuation")) return null;

  function submit() {
    start(async () => {
      try {
        await addValuation(dealId, borrowerId, {
          method,
          fairValuePct: parseFloat(pct),
          discountRate: parseFloat(rate),
          note,
        });
        toast.success("Valuation mark recorded");
        setOpen(false);
        setNote("");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Record mark
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record valuation mark</DialogTitle>
          <DialogDescription>
            Add a fair-value mark for the valuation committee.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yield">Yield</SelectItem>
                <SelectItem value="DCF">DCF</SelectItem>
                <SelectItem value="MarketComp">Market Comp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fair value (% of par)</Label>
              <Input
                type="number"
                step="0.1"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Discount rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Rationale…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            Record mark
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
