import { db } from "@/lib/db";
import type { IssuerKey } from "@/lib/bloomberg/types";
import { pickIssuerKey } from "@/lib/identifiers";
import { borrowerProfiles } from "@/server/masters";

/**
 * The key to send Bloomberg for a borrower, from its stored identifiers.
 * `null` means no coverage — the borrower has no Bloomberg company ID or LEI
 * on file — and is a normal answer that callers must handle.
 */
export async function getIssuerKey(borrowerId: string, asOf: Date = new Date()): Promise<IssuerKey | null> {
  const borrower = await db.borrower.findUnique({
    where: { id: borrowerId },
    select: { masterRef: true, identifiers: true },
  });
  if (!borrower) return null;
  // The name is for display on the key only; the identifiers decide coverage.
  const { name } = (await borrowerProfiles([borrower]))(borrower);
  return pickIssuerKey(borrower.identifiers, name, asOf);
}
