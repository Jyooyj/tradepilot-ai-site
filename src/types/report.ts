import type { ProductAnalysisResult, ProductInfo, ProductRecord } from "./product";
import type { ReviewData } from "./review";

export interface ReportInput {
  product: ProductInfo;
  result: ProductAnalysisResult;
  review?: ReviewData;
  imageUrl?: string;
}

export interface ProductLibraryReportInput {
  records: ProductRecord[];
  generatedAt?: string;
}
