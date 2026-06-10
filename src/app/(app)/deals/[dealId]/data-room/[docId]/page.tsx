import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Sparkles } from "lucide-react";

import { getDocument } from "@/server/queries/deal";
import { fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocIcon, privilegeVariant } from "@/components/data-room/doc-icon";
import { CopilotPanel } from "@/components/copilot/copilot-panel";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ dealId: string; docId: string }>;
}) {
  const { dealId, docId } = await params;
  const doc = await getDocument(dealId, docId);
  if (!doc) notFound();

  // Synthesize a couple of paragraphs from the stored bodyText for the viewer.
  const paragraphs = (doc.bodyText ?? "No extractable text preview available.")
    .split(/(?<=[.])\s+/)
    .reduce<string[]>((acc, sentence, i) => {
      const idx = Math.floor(i / 2);
      acc[idx] = (acc[idx] ? acc[idx] + " " : "") + sentence;
      return acc;
    }, []);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Document */}
      <div className="lg:col-span-3">
        <div className="mb-3 flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/deals/${dealId}/data-room`}>
              <ArrowLeft className="size-4" /> Data room
            </Link>
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border/70">
          <div className="flex items-start gap-3 border-b border-border/60 p-4">
            <DocIcon fileType={doc.fileType} className="mt-0.5 size-5" />
            <div className="min-w-0 flex-1">
              <h1 className="font-semibold leading-snug">{doc.name}</h1>
              <div className="text-muted-foreground mt-1 text-xs">
                {doc.folder?.name} · {doc.kind} · v{doc.version} ·{" "}
                {(doc.sizeKb / 1024).toFixed(1)}MB · uploaded by {doc.uploadedBy} on{" "}
                {fmtDate(doc.uploadedAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={privilegeVariant(doc.privilege)}>
                {doc.privilege}
              </Badge>
              <Button variant="outline" size="icon-sm" aria-label="Download">
                <Download className="size-4" />
              </Button>
            </div>
          </div>

          {/* Synthetic document body */}
          <div className="space-y-4 p-6 lg:p-8">
            <div className="mx-auto max-w-prose space-y-4">
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono uppercase">
                  {doc.fileType}
                </span>
                <span>Confidential — {doc.deal.borrower.name}</span>
              </div>
              <h2 className="text-lg font-semibold">{doc.name.replace(/\.[^.]+$/, "")}</h2>
              {paragraphs.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed">
                  {p}
                </p>
              ))}
              <div className="text-muted-foreground border-t border-border/50 pt-4 text-xs italic">
                Synthetic document preview generated for this POC. In production
                this pane renders the actual PDF/XLSX/DOCX.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copilot */}
      <div className="lg:col-span-2">
        <div className="sticky top-20 h-[calc(100vh-7rem)]">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs">
            <Sparkles className="size-3.5" />
            Ask questions grounded in this document
          </div>
          <CopilotPanel
            dealId={dealId}
            documentIds={[doc.id]}
            documentName={doc.name}
            className="h-[calc(100%-1.75rem)]"
            suggestions={[
              "Summarize this document",
              "What are the key terms?",
              "Any risks I should flag?",
            ]}
          />
        </div>
      </div>
    </div>
  );
}
