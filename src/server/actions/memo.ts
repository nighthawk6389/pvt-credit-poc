"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { guard, logActivity } from "./helpers";

type Section = { key: string; title: string; body: string };

export async function updateMemoSection(
  dealId: string,
  sectionKey: string,
  body: string,
) {
  const { actor, role } = await guard("edit", "memo");
  const memo = await db.creditMemo.findUnique({ where: { dealId } });
  if (!memo) throw new Error("Memo not found");
  const sections = JSON.parse(memo.sections) as Section[];
  const next = sections.map((s) =>
    s.key === sectionKey ? { ...s, body } : s,
  );
  await db.creditMemo.update({
    where: { dealId },
    data: { sections: JSON.stringify(next) },
  });
  const title = sections.find((s) => s.key === sectionKey)?.title ?? sectionKey;
  await logActivity(dealId, actor, role, "edited the IC memo", title);
  revalidatePath(`/deals/${dealId}/memo`);
}

export async function setMemoStatus(dealId: string, status: string) {
  const { actor, role } = await guard("approve", "memo");
  await db.creditMemo.update({ where: { dealId }, data: { status } });
  await logActivity(dealId, actor, role, `set the memo status to "${status}"`, "IC Memo");
  revalidatePath(`/deals/${dealId}/memo`);
  revalidatePath(`/deals/${dealId}`);
}

export async function castVote(
  dealId: string,
  vote: string,
  comment: string,
) {
  const { actor, role } = await guard("vote", "vote");
  // One vote per voter — upsert by (deal, voter).
  const existing = await db.iCVote.findFirst({
    where: { dealId, voter: actor },
  });
  if (existing) {
    await db.iCVote.update({
      where: { id: existing.id },
      data: { vote, comment, votedAt: new Date() },
    });
  } else {
    await db.iCVote.create({
      data: { dealId, voter: actor, vote, comment },
    });
  }
  await logActivity(dealId, actor, role, `voted ${vote}`, "IC Vote");
  revalidatePath(`/deals/${dealId}/memo`);
  revalidatePath(`/deals/${dealId}`);
}
