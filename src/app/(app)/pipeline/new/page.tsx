import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { NewDealForm } from "@/components/deal/new-deal-form";

export default async function NewDealPage() {
  const sponsors = await db.sponsor.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Originate New Deal"
        description="Spin up a deal workspace — data room, DDQ playbook, and IC memo template are instantiated automatically."
      />
      <NewDealForm sponsors={sponsors} />
    </div>
  );
}
