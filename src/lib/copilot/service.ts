import type {
  CopilotCitation,
  CopilotRequest,
  CopilotResponse,
  CopilotService,
} from "./types";

// Mocked copilot. Architected behind a clean interface so a
// ClaudeCopilotService (calling @anthropic-ai/sdk) can be dropped in later
// without touching any caller. See /api/copilot for the streaming entrypoint.
export class MockCopilotService implements CopilotService {
  async run(req: CopilotRequest): Promise<CopilotResponse> {
    await new Promise((r) => setTimeout(r, 350));
    switch (req.task) {
      case "doc_qa":
        return this.docQa(req);
      case "draft_ic_memo":
        return this.draftMemo(req);
      case "extract_covenants":
        return this.extractCovenants(req);
      case "summarize":
        return this.summarize(req);
    }
  }

  private buildCitations(req: CopilotRequest): CopilotCitation[] {
    const docs = (req.documents ?? []).filter((d) => d.bodyText);
    return docs.slice(0, 2).map((d) => {
      const text = d.bodyText ?? "";
      const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
      const q = (req.prompt ?? "").toLowerCase();
      const match =
        sentences.find((s) =>
          q
            .split(/\s+/)
            .filter((w) => w.length > 4)
            .some((w) => s.toLowerCase().includes(w)),
        ) ?? sentences[0];
      return {
        documentId: d.id,
        documentName: d.name,
        snippet: (match ?? "").slice(0, 220),
      };
    });
  }

  private docQa(req: CopilotRequest): CopilotResponse {
    const citations = this.buildCitations(req);
    const docName = req.documents?.[0]?.name ?? "the data room";
    const prompt = req.prompt ?? "your question";
    const text = citations.length
      ? `Based on ${citations.length} source${citations.length > 1 ? "s" : ""} in ${docName}, here is what I found regarding "${prompt}":\n\n` +
        `The documents indicate the borrower operates with recurring, contracted revenue and a defensible market position. Key terms reference a first-lien unitranche facility with quarterly-tested maintenance covenants. I've cited the most relevant passages below — verify against the underlying credit agreement before relying on these for the IC memo.`
      : `I couldn't find a directly matching passage for "${prompt}" in the selected documents. Try selecting the CIM or the credit agreement, or rephrase the question.`;
    return { text, citations };
  }

  private draftMemo(req: CopilotRequest): CopilotResponse {
    const section =
      (req.context?.section as string | undefined) ?? "Investment Thesis";
    const borrower = (req.context?.borrower as string | undefined) ?? "the Company";
    const drafts: Record<string, string> = {
      "Investment Thesis": `${borrower} is a market-leading, sponsor-backed platform with ~80% recurring revenue, mid-teens organic growth, and a fragmented end market supporting a proven buy-and-build strategy. We are proposing a first-lien unitranche that anchors the capital structure at a defensible attachment point, with documentation protections (quarterly maintenance leverage covenant, MFN, and limited incremental capacity) appropriate for the credit. Downside is supported by tangible asset coverage and sponsor equity cushion of ~50% of total enterprise value.`,
      "Business Overview": `${borrower} provides mission-critical services under multi-year contracts with high retention (>95% gross retention). Revenue is diversified across customers (top 10 < 25%) and geographies. Management is experienced, equity-aligned, and supported by an institutional sponsor with sector expertise.`,
      "Financial Analysis": `LTM revenue and EBITDA have compounded at a mid-teens rate with stable-to-expanding margins. Pro forma for the transaction, net leverage is ~4.4x through our facility with interest coverage of ~2.1x. Free cash flow conversion is healthy after modest maintenance capex, supporting de-leveraging of ~0.5x per annum under the base case.`,
      "Risks & Mitigants": `Key risks: (i) customer concentration — mitigated by long-dated contracts and retention; (ii) integration/M&A execution — mitigated by a disciplined pipeline and sponsor track record; (iii) cyclicality — mitigated by non-discretionary demand and covenant protections. We size the facility to withstand a 15–20% EBITDA decline while maintaining covenant compliance.`,
      "Structure & Terms": `First-lien unitranche, SOFR+575 with a 1.00% floor, 99.0 OID, 5-year tenor. Maintenance covenant: Total Net Leverage tested quarterly with a ~30% cushion to the model. 50% excess cash flow sweep stepping down with leverage; customary MFN and limited incremental.`,
      Recommendation: `We recommend approval of a $185MM first-lien unitranche commitment to ${borrower}. The opportunity offers an attractive risk-adjusted ~11% all-in yield, strong documentation, and a credit profile consistent with our underwriting standards.`,
    };
    const text =
      drafts[section] ??
      `Drafted ${section} for ${borrower}: a concise, defensible narrative synthesizing the diligence findings, financial analysis, and proposed structure. (Edit as needed before circulating to IC.)`;
    return { text, citations: this.buildCitations(req) };
  }

  private extractCovenants(req: CopilotRequest): CopilotResponse {
    const structured = [
      {
        name: "Total Net Leverage",
        type: "Maintenance",
        operator: "<=",
        threshold: 5.75,
        unit: "x",
        frequency: "Quarterly",
      },
      {
        name: "Fixed Charge Coverage",
        type: "Maintenance",
        operator: ">=",
        threshold: 1.5,
        unit: "x",
        frequency: "Quarterly",
      },
      {
        name: "Minimum Liquidity",
        type: "Maintenance",
        operator: ">=",
        threshold: 10,
        unit: "$MM",
        frequency: "Quarterly",
      },
    ];
    return {
      text: `Extracted ${structured.length} maintenance covenants from the credit agreement. Review the proposed thresholds and confirm the testing frequency before adding them to the monitoring calendar.`,
      structured,
      citations: this.buildCitations(req),
    };
  }

  private summarize(req: CopilotRequest): CopilotResponse {
    const name = req.documents?.[0]?.name ?? "the document";
    return {
      text: `Summary of ${name}: the document outlines the borrower's commercial profile, historical financial performance, and the proposed facility terms. Highlights include recurring revenue, a sponsor-led growth strategy, and a first-lien unitranche structure with quarterly maintenance covenants. See citations for the underlying passages.`,
      citations: this.buildCitations(req),
    };
  }
}

export const copilot: CopilotService = new MockCopilotService();
