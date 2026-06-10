export type CopilotTask =
  | "doc_qa"
  | "draft_ic_memo"
  | "extract_covenants"
  | "summarize";

export interface CopilotRequest {
  task: CopilotTask;
  dealId?: string;
  prompt?: string;
  documents?: { id: string; name: string; bodyText?: string | null }[];
  context?: Record<string, unknown>;
}

export interface CopilotCitation {
  documentId: string;
  documentName: string;
  snippet: string;
}

export interface CopilotResponse {
  text: string;
  citations?: CopilotCitation[];
  structured?: unknown;
}

export interface CopilotService {
  run(req: CopilotRequest): Promise<CopilotResponse>;
}
