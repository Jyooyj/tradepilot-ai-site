import type { ProductAnalysisResult, ProductInfo, ProductRecord } from "./product";
import type { ReviewData } from "./review";

export type AiInsightScenario = "purchase_decision" | "content_testing" | "review_summary";
export type AiInsightSource = "llm" | "fallback";

export interface AiInsightResult {
  ok?: boolean;
  source: AiInsightSource;
  scenario: AiInsightScenario | string;
  summary: string;
  reasoningPoints: string[];
  nextActions: string[];
  riskWarnings: string[];
  confidenceNote: string;
}

export interface SupplierCommunicationPack {
  summary: string;
  inquiryMessage: string;
  negotiationMessage: string;
  sampleMessage: string;
  shippingMessage: string;
  riskCheckQuestions: string[];
  copyBlocks: Array<{
    title: string;
    content: string;
  }>;
}

export interface ReportInput {
  product: ProductInfo;
  result: ProductAnalysisResult;
  review?: ReviewData;
  imageUrl?: string;
  aiReasoningInsights?: Partial<Record<AiInsightScenario, AiInsightResult>>;
  supplierCommunication?: SupplierCommunicationPack;
}

export interface ProductLibraryReportInput {
  records: ProductRecord[];
  generatedAt?: string;
}
