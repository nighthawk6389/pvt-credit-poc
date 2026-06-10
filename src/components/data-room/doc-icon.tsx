import { FileSpreadsheet, FileText, FileType, File } from "lucide-react";

import { cn } from "@/lib/utils";

export function DocIcon({
  fileType,
  className,
}: {
  fileType: string;
  className?: string;
}) {
  const map: Record<
    string,
    { Icon: typeof FileText; color: string }
  > = {
    xlsx: { Icon: FileSpreadsheet, color: "text-[var(--success)]" },
    pdf: { Icon: FileType, color: "text-[var(--danger)]" },
    docx: { Icon: FileText, color: "text-[var(--info)]" },
  };
  const { Icon, color } = map[fileType] ?? { Icon: File, color: "text-muted-foreground" };
  return <Icon className={cn("size-4 shrink-0", color, className)} />;
}

export function privilegeVariant(p: string) {
  switch (p) {
    case "IC":
      return "warning" as const;
    case "Compliance":
      return "danger" as const;
    case "All":
      return "muted" as const;
    default:
      return "info" as const;
  }
}
