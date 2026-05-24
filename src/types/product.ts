import type { ReviewData } from "./review";

export type StorageSource = "localStorage" | "supabase" | "session" | "unknown";

export interface ProductInfo {
  id?: string | number;
  name?: string;
  category?: string;
  cost?: number | string;
  price?: number | string;
  moq?: number | string;
  material?: string;
  audience?: string;
  targetUser?: string;
  channel?: string;
  supplier?: string;
  competitorPrice?: string;
  logistics?: string;
  keywords?: string;
  marketReference?: string;
  imageUrl?: string;
  imagePreview?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductInput extends ProductInfo {}

export interface ImageAnalysisResult {
  ok?: boolean;
  fallback?: boolean;
  fallbackMode?: "manual_or_demo" | string;
  fallbackMessage?: string;
  sourceNotice?: string;
  reason?: string;
  detail?: string;
  product?: ProductInput;
  content?: {
    xhsCover?: string;
    xhsTitles?: string[];
    xhsStructure?: string[];
    douyinScript?: string[];
  };
  risks?: string[];
  confidence?: string;
}

export interface ProductMarketInfo {
  categoryKey?: string;
  categoryName?: string;
  marketType?: string;
  focus?: string[];
  insight?: string;
}

export interface MarketEvidenceItem {
  sourceType?: string;
  sourceTypeLabel?: string;
  fallback?: boolean;
  evidenceScore?: number;
  confidenceScore?: number;
  evidenceSummary?: string;
  analysisConclusions?: string[];
  riskWarnings?: string[];
  nextActions?: string[];
  sourceNotice?: string;
}

export interface MarketEvidence {
  price?: MarketEvidenceItem;
  douyin?: MarketEvidenceItem;
  manual?: MarketEvidenceItem;
}

export interface ProductAnalysisResult {
  score?: number;
  totalScore?: number;
  suggestion?: string;
  status?: string;
  level?: string;
  grossMargin?: number;
  margin?: number;
  profit?: number;
  stockCost?: number;
  riskLevel?: string;
  riskTips?: string[];
  risks?: string[];
  nextActions?: string[];
  actions?: string[];
  market?: ProductMarketInfo;
  marketEvidence?: MarketEvidence;
  priceEvidence?: MarketEvidenceItem;
  douyinEvidence?: MarketEvidenceItem;
  manualMarketEvidence?: MarketEvidenceItem;
  xhsPackage?: Record<string, unknown>;
  douyinPackage?: Record<string, unknown>;
  aiReasoningInsights?: Record<string, unknown>;
  supplierCommunication?: Record<string, unknown>;
  effectivePrice?: Record<string, unknown>;
  scores?: Array<[string, number]>;
  scoringItems?: Array<Record<string, unknown>>;
  explanations?: Array<Record<string, unknown>>;
  contentPotentialScore?: number;
  report?: string;
}

export interface PurchaseDecisionResult extends ProductAnalysisResult {
  totalScore?: number;
  level?: string;
  status?: string;
  margin?: number;
  profit?: number;
  unitCost?: number;
  stockCost?: number;
  risks?: string[];
  actions?: string[];
  xhsPackage?: Record<string, unknown>;
  douyinPackage?: Record<string, unknown>;
}

export interface ProductRecord {
  id: string | number;
  product?: ProductInfo;
  result?: ProductAnalysisResult;
  review?: ReviewData;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  product_name?: string;
  category?: string;
  score?: number;
  advice?: string;
  price?: string | number;
  competitor_price?: string | number;
  report?: string;
  storageSource?: StorageSource;
}
