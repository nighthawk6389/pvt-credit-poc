import { CovenantSubnav } from "@/components/covenants/covenant-subnav";

export default async function CovenantsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  return (
    <div>
      <CovenantSubnav dealId={dealId} />
      {children}
    </div>
  );
}
