import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { copilot } from "@/lib/copilot/service";
import type { CopilotRequest, CopilotTask } from "@/lib/copilot/types";

// Mocked copilot endpoint. Architected so a streaming Claude-backed service can
// be swapped in behind the same contract (see lib/copilot/service.ts).
export async function POST(req: Request) {
  const body = (await req.json()) as {
    task: CopilotTask;
    dealId?: string;
    prompt?: string;
    documentIds?: string[];
    context?: Record<string, unknown>;
  };

  let documents: CopilotRequest["documents"] = [];
  if (body.documentIds?.length) {
    const docs = await db.document.findMany({
      where: { id: { in: body.documentIds } },
      select: { id: true, name: true, bodyText: true },
    });
    documents = docs;
  } else if (body.dealId) {
    const docs = await db.document.findMany({
      where: { dealId: body.dealId, bodyText: { not: null } },
      select: { id: true, name: true, bodyText: true },
      take: 6,
    });
    documents = docs;
  }

  const result = await copilot.run({
    task: body.task,
    dealId: body.dealId,
    prompt: body.prompt,
    documents,
    context: body.context,
  });

  return NextResponse.json(result);
}
