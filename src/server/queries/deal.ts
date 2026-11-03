import { db } from "@/lib/db";
import { canSeeDeal, type Role } from "@/lib/auth/roles";
import { withBorrower, withFacilityTerms, withMasters } from "@/server/masters";

// Borrower details and facility terms are not stored here: every query that
// returns them reads them through @/server/masters, from the entity master and
// the security master (or a deal's term sheet before booking).

/** Lightweight deal header used by the deal layout / sub-nav. */
export async function getDealHeader(id: string, role: Role) {
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      borrower: true,
      sponsor: true,
      team: { include: { user: true } },
      facilities: { orderBy: { order: "asc" } },
    },
  });
  if (!deal) return { deal: null, blocked: false };
  if (!canSeeDeal(role, deal)) return { deal: null, blocked: true };
  return { deal: await withMasters(deal), blocked: false };
}

export async function getDealOverview(id: string) {
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      borrower: {
        include: {
          financials: { orderBy: { periodEnd: "asc" } },
          valuations: { orderBy: { asOf: "desc" } },
        },
      },
      sponsor: true,
      facilities: { orderBy: { order: "asc" }, include: { identifiers: true } },
      team: { include: { user: true } },
      tasks: { orderBy: { dueDate: "asc" }, include: { assignee: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      activity: { orderBy: { createdAt: "desc" }, take: 10, include: { actor: true } },
      ddqItems: true,
      votes: true,
      covenants: { include: { tests: true } },
      _count: { select: { documents: true } },
    },
  });
  return deal && withMasters(deal);
}

export async function getDataRoom(id: string) {
  return db.deal.findUnique({
    where: { id },
    include: {
      folders: {
        orderBy: { order: "asc" },
        include: { documents: { orderBy: { name: "asc" }, include: { uploadedBy: true } } },
      },
      documents: {
        where: { folderId: null },
        orderBy: { name: "asc" },
        include: { uploadedBy: true },
      },
    },
  });
}

export async function getDocument(dealId: string, docId: string) {
  const doc = await db.document.findFirst({
    where: { id: docId, dealId },
    include: { deal: { include: { borrower: true } }, folder: true, uploadedBy: true },
  });
  return doc && { ...doc, deal: await withBorrower(doc.deal) };
}

export async function getDiligence(id: string) {
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      ddqItems: { orderBy: { order: "asc" }, include: { assignee: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      borrower: true,
    },
  });
  return deal && withBorrower(deal);
}

export async function getMemo(id: string) {
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      memo: true,
      votes: { orderBy: { votedAt: "asc" }, include: { voter: true } },
      borrower: true,
      documents: { select: { id: true, name: true, bodyText: true } },
    },
  });
  return deal && withBorrower(deal);
}

export async function getStructuring(id: string) {
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      facilities: { orderBy: { order: "asc" }, include: { identifiers: true } },
      borrower: {
        include: {
          financials: { orderBy: { periodEnd: "desc" }, take: 1 },
          identifiers: true,
        },
      },
      sponsor: true,
    },
  });
  return deal && withMasters(deal);
}

export async function getCovenants(id: string) {
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      covenants: {
        include: { tests: { orderBy: { periodEnd: "asc" } } },
      },
      borrower: true,
    },
  });
  return deal && withBorrower(deal);
}

export async function getValuation(id: string) {
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      borrower: {
        include: {
          valuations: { orderBy: { asOf: "desc" } },
          financials: { orderBy: { periodEnd: "asc" } },
        },
      },
      facilities: { orderBy: { order: "asc" } },
    },
  });
  return deal && withMasters(deal);
}

export async function getCashflow(id: string) {
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      cashflows: { orderBy: { order: "asc" } },
      facilities: { orderBy: { order: "asc" } },
    },
  });
  return deal && withFacilityTerms(deal);
}

export async function getEvents(id: string) {
  return db.deal.findUnique({
    where: { id },
    include: {
      events: { orderBy: { effectiveDate: "desc" }, include: { createdBy: true } },
      activity: { orderBy: { createdAt: "desc" }, include: { actor: true } },
    },
  });
}
