"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Rocket } from "lucide-react";
import { toast } from "sonner";

import { useRole } from "@/lib/auth/context";
import { can } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDeal } from "@/server/actions/create-deal";

const SECTORS = [
  "Software",
  "Healthcare Services",
  "Business Services",
  "Industrials",
  "Consumer",
  "Transportation",
  "Chemicals",
  "Insurance Services",
  "Building Products",
  "Aerospace & Defense",
  "Infrastructure",
];

const FACILITY_TYPES = ["Unitranche", "First Lien TL", "Delayed Draw", "Second Lien"];

export function NewDealForm({
  sponsors,
}: {
  sponsors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { role } = useRole();
  const [pending, start] = React.useTransition();

  const [form, setForm] = React.useState({
    codeName: "",
    borrowerName: "",
    sector: "Software",
    sponsorId: sponsors[0]?.id ?? "",
    facilityType: "Unitranche",
    dealSize: "100",
    spreadBps: "575",
    floorBps: "100",
    oidPct: "1.0",
    targetClose: "",
    isPrivileged: "yes",
    thesis: "",
    useOfProceeds: "",
    revenue: "",
    ebitda: "",
    netLeverage: "",
  });

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const input =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(k)(e.target.value);

  if (!can(role, "edit", "deal")) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          Your current role ({role}) cannot originate deals. Switch to Deal Lead
          or Analyst.
        </CardContent>
      </Card>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        const { dealId } = await createDeal({
          codeName: form.codeName,
          borrowerName: form.borrowerName,
          sector: form.sector,
          sponsorId: form.sponsorId,
          facilityType: form.facilityType as "Unitranche",
          dealSize: form.dealSize,
          spreadBps: form.spreadBps,
          floorBps: form.floorBps,
          oidPct: form.oidPct,
          targetClose: form.targetClose || undefined,
          isPrivileged: form.isPrivileged === "yes",
          thesis: form.thesis || undefined,
          useOfProceeds: form.useOfProceeds || undefined,
          revenue: form.revenue || undefined,
          ebitda: form.ebitda || undefined,
          netLeverage: form.netLeverage || undefined,
        });
        toast.success(`${form.codeName} created — workspace ready`);
        router.push(`/deals/${dealId}`);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Opportunity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opportunity</CardTitle>
          <CardDescription>
            A standard workspace (data room folders, DDQ playbook, memo
            template) is created automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Code name *">
            <Input
              value={form.codeName}
              onChange={input("codeName")}
              placeholder="Project Aurora"
              required
            />
          </Field>
          <Field label="Borrower *">
            <Input
              value={form.borrowerName}
              onChange={input("borrowerName")}
              placeholder="Acme Outpatient Group"
              required
            />
          </Field>
          <Field label="Sector">
            <Select value={form.sector} onValueChange={set("sector")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sponsor">
            <Select value={form.sponsorId} onValueChange={set("sponsorId")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select sponsor" />
              </SelectTrigger>
              <SelectContent>
                {sponsors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Use of proceeds" className="sm:col-span-2">
            <Input
              value={form.useOfProceeds}
              onChange={input("useOfProceeds")}
              placeholder="LBO financing / refinancing & growth capital"
            />
          </Field>
          <Field label="Initial thesis" className="sm:col-span-2">
            <Textarea
              value={form.thesis}
              onChange={input("thesis")}
              placeholder="Why this credit, why now…"
              className="min-h-20"
            />
          </Field>
        </CardContent>
      </Card>

      {/* Proposed structure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proposed Structure</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Facility type">
            <Select value={form.facilityType} onValueChange={set("facilityType")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FACILITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Size ($MM) *">
            <Input
              type="number"
              min="1"
              value={form.dealSize}
              onChange={input("dealSize")}
              required
            />
          </Field>
          <Field label="Spread (bps)">
            <Input
              type="number"
              value={form.spreadBps}
              onChange={input("spreadBps")}
            />
          </Field>
          <Field label="Floor (bps)">
            <Input
              type="number"
              value={form.floorBps}
              onChange={input("floorBps")}
            />
          </Field>
          <Field label="OID (pts)">
            <Input
              type="number"
              step="0.25"
              value={form.oidPct}
              onChange={input("oidPct")}
            />
          </Field>
          <Field label="Target close">
            <Input
              type="date"
              value={form.targetClose}
              onChange={input("targetClose")}
            />
          </Field>
          <Field label="Information barrier" className="col-span-2">
            <Select value={form.isPrivileged} onValueChange={set("isPrivileged")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">
                  <span className="flex items-center gap-1.5">
                    <LockKeyhole className="size-3.5" /> Privileged (wall-crossed only)
                  </span>
                </SelectItem>
                <SelectItem value="no">Non-privileged (firm-wide visible)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* Initial financials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Initial LTM Financials</CardTitle>
          <CardDescription>
            Optional — seeds the financial chart and screening metrics.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Field label="Revenue ($MM)">
            <Input
              type="number"
              value={form.revenue}
              onChange={input("revenue")}
              placeholder="—"
            />
          </Field>
          <Field label="EBITDA ($MM)">
            <Input
              type="number"
              value={form.ebitda}
              onChange={input("ebitda")}
              placeholder="—"
            />
          </Field>
          <Field label="Net leverage (x)">
            <Input
              type="number"
              step="0.1"
              value={form.netLeverage}
              onChange={input("netLeverage")}
              placeholder="—"
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/pipeline")}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Rocket className="size-4" />
          )}
          Create deal workspace
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
