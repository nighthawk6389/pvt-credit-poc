"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { guard, logActivity } from "./helpers";

const NewDealSchema = z.object({
  codeName: z.string().trim().min(3, "Code name is required"),
  borrowerName: z.string().trim().min(2, "Borrower name is required"),
  sector: z.string().min(1),
  sponsorId: z.string().min(1, "Select a sponsor"),
  facilityType: z.enum(["Unitranche", "First Lien TL", "Delayed Draw", "Second Lien"]),
  dealSize: z.coerce.number().positive().max(2000),
  spreadBps: z.coerce.number().int().min(200).max(1200),
  floorBps: z.coerce.number().int().min(0).max(300).default(100),
  oidPct: z.coerce.number().min(0).max(5).default(1),
  targetClose: z.string().optional(),
  isPrivileged: z.coerce.boolean().default(true),
  thesis: z.string().trim().optional(),
  useOfProceeds: z.string().trim().optional(),
  // Optional initial LTM financials so the workspace isn't empty.
  revenue: z.coerce.number().positive().optional(),
  ebitda: z.coerce.number().positive().optional(),
  netLeverage: z.coerce.number().positive().max(12).optional(),
});

export type NewDealInput = z.input<typeof NewDealSchema>;

// Standard templates instantiated for every new deal — mirrors how platforms
// like DealCloud/Allvue spin up a deal workspace from a playbook.
const FOLDER_TEMPLATE = [
  "01 — Confidential Information Memorandum",
  "02 — Financial Statements & Model",
  "03 — Legal & Corporate",
  "04 — Commercial Due Diligence",
  "05 — Management Presentations",
];

const DDQ_TEMPLATE: { cat: string; q: string }[] = [
  { cat: "Commercial", q: "Confirm customer concentration and contract tenor" },
  { cat: "Commercial", q: "Validate market growth rate and competitive position" },
  { cat: "Commercial", q: "Assess pricing power and churn/retention" },
  { cat: "Financial", q: "Reconcile management EBITDA to QoE adjusted EBITDA" },
  { cat: "Financial", q: "Stress test downside leverage & covenant headroom" },
  { cat: "Financial", q: "Confirm maintenance vs growth capex split" },
  { cat: "Financial", q: "Validate FCF conversion assumptions" },
  { cat: "Legal", q: "Review draft credit agreement covenant package" },
  { cat: "Legal", q: "Confirm guarantor coverage & collateral package" },
  { cat: "Legal", q: "Litigation & regulatory review" },
  { cat: "Management", q: "Background checks on key executives" },
  { cat: "Management", q: "Confirm management equity rollover & alignment" },
  { cat: "ESG", q: "ESG screening & sector-specific risk review" },
];

const MEMO_TEMPLATE = [
  { key: "thesis", title: "Investment Thesis", body: "" },
  { key: "business", title: "Business Overview", body: "" },
  { key: "financial", title: "Financial Analysis", body: "" },
  { key: "risks", title: "Risks & Mitigants", body: "" },
  { key: "structure", title: "Structure & Terms", body: "" },
  { key: "recommendation", title: "Recommendation", body: "" },
];

export async function createDeal(raw: NewDealInput): Promise<{ dealId: string }> {
  const { actor, role } = await guard("edit", "deal");
  const input = NewDealSchema.parse(raw);

  const existing = await db.deal.findUnique({
    where: { codeName: input.codeName },
  });
  if (existing) throw new Error(`Code name "${input.codeName}" is already in use`);

  const borrower = await db.borrower.create({
    data: {
      name: input.borrowerName,
      sector: input.sector,
      sponsorId: input.sponsorId,
      riskRating: null,
      riskTrend: "Stable",
    },
  });

  if (input.revenue && input.ebitda && input.netLeverage) {
    await db.financialStatement.create({
      data: {
        borrowerId: borrower.id,
        periodEnd: new Date(Date.UTC(2026, 2, 31)),
        periodLabel: "Q1 2026",
        periodType: "LTM",
        revenue: input.revenue,
        ebitda: input.ebitda,
        ebitdaMargin: +((input.ebitda / input.revenue) * 100).toFixed(1),
        netLeverage: input.netLeverage,
        interestCoverage: +(2.6 - input.netLeverage * 0.18).toFixed(2),
        liquidity: +(input.ebitda * 0.5).toFixed(1),
        isActual: true,
      },
    });
  }

  const deal = await db.deal.create({
    data: {
      codeName: input.codeName,
      borrowerId: borrower.id,
      sponsorId: input.sponsorId,
      stage: "Sourcing",
      status: "Active",
      facilityType: input.facilityType,
      dealSize: input.dealSize,
      useOfProceeds: input.useOfProceeds || null,
      targetClose: input.targetClose ? new Date(input.targetClose) : null,
      leadName: actor,
      probability: 25,
      isPrivileged: input.isPrivileged,
      thesis: input.thesis || null,
    },
  });

  await db.facility.create({
    data: {
      dealId: deal.id,
      borrowerId: borrower.id,
      name: `${input.facilityType} Facility`,
      type: input.facilityType.replace(/\s/g, ""),
      seniority: input.facilityType === "Second Lien" ? "Second Lien" : "First Lien",
      commitment: input.dealSize,
      spreadBps: input.spreadBps,
      floorBps: input.floorBps,
      oidPct: input.oidPct,
      upfrontFeeBps: 200,
      maturity: new Date(Date.UTC(2031, 5, 30)),
    },
  });

  // Wall-cross the creator onto the deal team.
  await db.dealTeamMember.create({
    data: {
      dealId: deal.id,
      name: actor,
      role,
      wallCrossed: true,
      crossedAt: new Date(),
    },
  });

  // Instantiate the standard workspace from templates.
  await db.folder.createMany({
    data: FOLDER_TEMPLATE.map((name, i) => ({ dealId: deal.id, name, order: i })),
  });
  await db.dDQItem.createMany({
    data: DDQ_TEMPLATE.map((d, i) => ({
      dealId: deal.id,
      category: d.cat,
      question: d.q,
      status: "Open",
      order: i,
    })),
  });
  await db.creditMemo.create({
    data: {
      dealId: deal.id,
      status: "Draft",
      sections: JSON.stringify(MEMO_TEMPLATE),
    },
  });

  await logActivity(deal.id, actor, role, "originated a new deal", input.codeName);

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return { dealId: deal.id };
}
