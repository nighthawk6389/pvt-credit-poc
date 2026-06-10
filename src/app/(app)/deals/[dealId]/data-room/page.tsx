import { notFound } from "next/navigation";
import Link from "next/link";
import { Folder, ChevronRight, ShieldCheck } from "lucide-react";

import { getDataRoom } from "@/server/queries/deal";
import { fmtDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocIcon, privilegeVariant } from "@/components/data-room/doc-icon";

export default async function DataRoomPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const deal = await getDataRoom(dealId);
  if (!deal) notFound();

  const totalDocs =
    deal.folders.reduce((s, f) => s + f.documents.length, 0) +
    deal.documents.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">Virtual Data Room</CardTitle>
            <CardDescription>
              {totalDocs} documents · {deal.folders.length} folders · access
              governed by privilege tags
            </CardDescription>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ShieldCheck className="size-4 text-[var(--success)]" />
            Audit-logged
          </div>
        </CardHeader>
      </Card>

      {deal.folders.map((folder) => (
        <Card key={folder.id} className="gap-0 py-0">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <Folder className="size-4 text-primary" />
            <span className="text-sm font-medium">{folder.name}</span>
            <Badge variant="muted" className="ml-1 text-[10px]">
              {folder.documents.length}
            </Badge>
          </div>
          <div className="divide-y divide-border/50">
            {folder.documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/deals/${dealId}/data-room/${doc.id}`}
                className="hover:bg-muted/40 group flex items-center gap-3 px-4 py-2.5 transition-colors"
              >
                <DocIcon fileType={doc.fileType} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{doc.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {doc.kind} · v{doc.version} · {(doc.sizeKb / 1024).toFixed(1)}MB ·{" "}
                    {doc.uploadedBy} · {fmtDate(doc.uploadedAt)}
                  </div>
                </div>
                <Badge variant={privilegeVariant(doc.privilege)} className="text-[10px]">
                  {doc.privilege}
                </Badge>
                <ChevronRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
            {folder.documents.length === 0 && (
              <div className="text-muted-foreground px-4 py-3 text-sm">
                No documents.
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
