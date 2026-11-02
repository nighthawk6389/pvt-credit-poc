import { db } from "@/lib/db";
import type { IssuerKey } from "@/lib/bloomberg/types";
import { pickIssuerKey } from "@/lib/identifiers";

/**
 * The key to send Bloomberg for a borrower, from its stored identifiers.
 * `null` means no coverage — the borrower has no Bloomberg company ID or LEI
 * on file — and is a normal answer that callers must handle.
 */
export async function getIssuerKey(borrowerId: string, asOf: Date = new Date()): Promise<IssuerKey | null> {
  const borrower = await db.borrower.findUnique({
    where: { id: borrowerId },
    select: { name: true, identifiers: true },
  });
  return borrower ? pickIssuerKey(borrower.identifiers, borrower.name, asOf) : null;
}
