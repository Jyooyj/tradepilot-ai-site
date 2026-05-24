export interface ReviewData {
  views?: number | string;
  likes?: number | string;
  saves?: number | string;
  collects?: number | string;
  comments?: number | string;
  inquiries?: number | string;
  orders?: number | string;
  cost?: number | string;
  testCost?: number | string;
  interactionRate?: number;
  inquiryRate?: number;
  conversionRate?: number;
  costPerOrder?: number;
  conclusion?: string;
  nextAction?: string;
}
