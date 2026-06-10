"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { guard, logActivity } from "./helpers";

export async function logEvent(
  dealId: string,
  data: { type: string; title: string; detail: string; amount?: number | null },
) {
  const { actor, role } = await guard("log_event", "event");
  await db.lifecycleEvent.create({
    data: {
      dealId,
      type: data.type,
      title: data.title,
      detail: data.detail,
      amount: data.amount ?? null,
      status: "Completed",
      effectiveDate: new Date(),
      createdBy: actor,
    },
  });
  await logActivity(dealId, actor, role, `logged a ${data.type.toLowerCase()} event`, data.title);
  revalidatePath(`/deals/${dealId}/events`);
  revalidatePath(`/deals/${dealId}`);
}

export async function toggleTask(dealId: string, taskId: string, status: string) {
  const { actor, role } = await guard("edit", "task");
  await db.task.update({ where: { id: taskId }, data: { status } });
  await logActivity(dealId, actor, role, `moved a task to "${status}"`);
  revalidatePath(`/deals/${dealId}`);
}

export async function addValuation(
  dealId: string,
  borrowerId: string,
  data: { method: string; fairValuePct: number; discountRate: number; note: string },
) {
  const { actor, role } = await guard("edit", "valuation");
  const fac = await db.facility.findFirst({ where: { dealId }, orderBy: { order: "asc" } });
  const cost = (await db.deal.findUnique({ where: { id: dealId } }))?.dealSize ?? 100;
  await db.valuation.create({
    data: {
      borrowerId,
      asOf: new Date(),
      method: data.method,
      fairValuePct: data.fairValuePct,
      fairValueAmt: +((data.fairValuePct / 100) * cost).toFixed(1),
      costBasis: cost,
      discountRate: data.discountRate,
      status: "Draft",
      note: data.note,
    },
  });
  void fac;
  await logActivity(dealId, actor, role, `recorded a ${data.method} valuation mark`, `${data.fairValuePct}% of par`);
  revalidatePath(`/deals/${dealId}/valuation`);
}

export async function waiveCovenantTest(dealId: string, testId: string) {
  const { actor, role } = await guard("edit", "covenant");
  await db.covenantTest.update({ where: { id: testId }, data: { status: "Waived" } });
  await logActivity(dealId, actor, role, "waived a covenant test");
  revalidatePath(`/deals/${dealId}/covenants`);
  revalidatePath(`/deals/${dealId}`);
}
