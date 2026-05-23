import type { ReviewData } from "./review";

export interface ProductInfo {
  id?: string | number;
  name?: string;
  category?: string;
  cost?: number | string;
  price?: number | string;
  moq?: number | string;
  material?: string;
  audience?: string;
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

export interface ProductMarketInfo {
  categoryKey?: string;
  categoryName?: string;
  marketType?: string;
  focus?: string[];
  insight?: string;
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
  report?: string;
}

export interface ProductRecord {
  id: string | number;
  product?: ProductInfo;
  result?: ProductAnalysisResult;
  review?: ReviewData;
  createdAt?: string;
  updatedAt?: string;
}
