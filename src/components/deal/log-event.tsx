"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useRole } from "@/lib/auth/context";
import { can } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { logEvent } from "@/server/actions/deal-ops";

const TYPES = [
  "Amendment",
  "Waiver",
  "Drawdown",
  "Paydown",
  "RateReset",
  "Restructuring",
  "Notice",
];

export function LogEvent({ dealId }: { dealId: string }) {
  const { role } = useRole();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState("Drawdown");
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [pending, start] = React.useTransition();

  if (!can(role, "log_event", "event")) return null;

  function submit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    start(async () => {
      try {
        await logEvent(dealId, {
          type,
          title,
          detail,
          amount: amount ? parseFloat(amount) : null,
        });
        toast.success("Event logged");
        setOpen(false);
        setTitle("");
        setDetail("");
        setAmount("");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Log event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log lifecycle event</DialogTitle>
          <DialogDescription>
            Record an amendment, waiver, drawdown, or other event.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount ($MM, optional)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Delayed-draw funded — Acq. #2"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Detail</Label>
            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Optional description…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            Log event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
