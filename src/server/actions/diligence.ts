"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { guard, logActivity } from "./helpers";

export async function updateDdqStatus(
  dealId: string,
  itemId: string,
  status: string,
) {
  const { actor, role } = await guard("edit", "deal");
  const item = await db.dDQItem.update({
    where: { id: itemId },
    data: { status },
  });
  await logActivity(dealId, actor, role, `marked a DDQ item "${status}"`, item.question.slice(0, 48));
  revalidatePath(`/deals/${dealId}/diligence`);
}

export async function addNote(
  dealId: string,
  data: { title: string; body: string; kind: string },
) {
  const { actor, role } = await guard("edit", "note");
  await db.note.create({
    data: {
      dealId,
      title: data.title,
      body: data.body,
      kind: data.kind,
      author: actor,
    },
  });
  await logActivity(dealId, actor, role, "added a note", data.title);
  revalidatePath(`/deals/${dealId}/diligence`);
  revalidatePath(`/deals/${dealId}`);
}
