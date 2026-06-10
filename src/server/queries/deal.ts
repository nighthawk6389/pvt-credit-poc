import { db } from "@/lib/db";
import { canSeeDeal, type Role } from "@/lib/auth/roles";

/** Lightweight deal header used by the deal layout / sub-nav. */
export async function getDealHeader(id: string, role: Role) {
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      borrower: true,
      sponsor: true,
      team: true,
      facilities: { orderBy: { order: "asc" } },
    },
  });
  if (!deal) return { deal: null, blocked: false };
  if (!canSeeDeal(role, deal)) return { deal: null, blocked: true };
  return { deal, blocked: false };
}

export async function getDealOverview(id: string) {
  return db.deal.findUnique({
    where: { id },
    include: {
      borrower: {
        include: {
          financials: { orderBy: { periodEnd: "asc" } },
          valuations: { orderBy: { asOf: "desc" } },
        },
      },
      sponsor: true,
      facilities: { orderBy: { order: "asc" } },
      team: true,
      tasks: { orderBy: { dueDate: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      activity: { orderBy: { createdAt: "desc" }, take: 10 },
      ddqItems: true,
      votes: true,
      covenants: { include: { tests: true } },
      _count: { select: { documents: true } },
    },
  });
}

export async function getDataRoom(id: string) {
  return db.deal.findUnique({
    where: { id },
    include: {
      folders: {
        orderBy: { order: "asc" },
        include: { documents: { orderBy: { name: "asc" } } },
      },
      documents: {
        where: { folderId: null },
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function getDocument(dealId: string, docId: string) {
  return db.document.findFirst({
    where: { id: docId, dealId },
    include: { deal: { include: { borrower: true } }, folder: true },
  });
}

export async function getDiligence(id: string) {
  return db.deal.findUnique({
    where: { id },
    include: {
      ddqItems: { orderBy: { order: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      borrower: true,
    },
  });
}

export async function getMemo(id: string) {
  return db.deal.findUnique({
    where: { id },
    include: {
      memo: true,
      votes: { orderBy: { votedAt: "asc" } },
      borrower: true,
      documents: { select: { id: true, name: true, bodyText: true } },
    },
  });
}

export async function getStructuring(id: string) {
  return db.deal.findUnique({
    where: { id },
    include: {
      facilities: { orderBy: { order: "asc" } },
      borrower: {
        include: { financials: { orderBy: { periodEnd: "desc" }, take: 1 } },
      },
      sponsor: true,
    },
  });
}

export async function getCovenants(id: string) {
  return db.deal.findUnique({
    where: { id },
    include: {
      covenants: {
        include: { tests: { orderBy: { periodEnd: "asc" } } },
      },
      borrower: true,
    },
  });
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
  return deal;
}

export async function getCashflow(id: string) {
  return db.deal.findUnique({
    where: { id },
    include: {
      cashflows: { orderBy: { order: "asc" } },
      facilities: { orderBy: { order: "asc" } },
    },
  });
}

export async function getEvents(id: string) {
  return db.deal.findUnique({
    where: { id },
    include: {
      events: { orderBy: { effectiveDate: "desc" } },
      activity: { orderBy: { createdAt: "desc" } },
    },
  });
}
