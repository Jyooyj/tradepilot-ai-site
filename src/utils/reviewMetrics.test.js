import { describe, it, expect } from "vitest";
import {
  buildReviewMetrics,
  buildReviewMetricCards,
  formatPercent,
  formatMoney,
} from "./reviewMetrics";

describe("reviewMetrics 漏斗与指标计算", () => {
  it("正确计算漏斗各层转化率", () => {
    const m = buildReviewMetrics({
      views: "3000",
      likes: "100",
      saves: "50",
      comments: "50",
      inquiries: "15",
      orders: "3",
      cost: "120",
    });
    expect(m.exposureCount).toBe(3000);
    expect(m.interactionCount).toBe(200); // 100+50+50
    expect(m.favoriteCount).toBe(50);
    expect(m.inquiryCount).toBe(15);
    expect(m.orderCount).toBe(3);
    expect(m.interactionRate).toBe(6.7); // 200/3000
    expect(m.favoriteVsInteraction).toBe(25); // 50/200
    expect(m.inquiryVsFavorite).toBe(30); // 15/50
    expect(m.orderRate).toBe(20); // 3/15
    const funnel = m.funnelSteps.map((s) => [s.label, s.value]);
    expect(funnel).toEqual([
      ["曝光量", 3000],
      ["互动量", 200],
      ["收藏量", 50],
      ["询价量", 15],
      ["成交量", 3],
    ]);
  });

  it("分母为 0 或字段缺失时返回 null（待补充），不报错", () => {
    const m = buildReviewMetrics({ views: "", likes: "5" });
    expect(m.exposureCount).toBeNull();
    expect(m.interactionRate).toBeNull();
    expect(m.orderRate).toBeNull();
    expect(formatPercent(m.interactionRate)).toBe("待补充");
    expect(m.missingFields).toContain("曝光量");
    expect(m.missingFields).toContain("成交量");
  });

  it("有成本时计算单次询价成本与单次成交成本（保留2位）", () => {
    const m = buildReviewMetrics({
      views: "3000",
      likes: "100",
      saves: "80",
      comments: "20",
      inquiries: "10",
      orders: "2",
      cost: "100",
    });
    expect(m.costPerInquiry).toBe(10);
    expect(m.costPerOrder).toBe(50);
    expect(formatMoney(m.costPerOrder)).toBe("¥50");
  });

  it("高曝光低互动 → 判断为封面/标题问题", () => {
    const m = buildReviewMetrics({ views: "5000", likes: "10", saves: "5", comments: "5", inquiries: "1", orders: "0" });
    expect(m.bottleneck).toBe("interaction");
    expect(m.judgment).toContain("封面");
  });

  it("高收藏低询价 → 判断为价格/购买路径/信任问题", () => {
    const m = buildReviewMetrics({ views: "3000", likes: "100", saves: "80", comments: "20", inquiries: "5", orders: "1" });
    expect(m.bottleneck).toBe("inquiry");
    expect(m.judgment).toMatch(/价格|购买路径|信任/);
  });

  it("高询价低成交 → 判断为价格/客服/运费/售后问题", () => {
    const m = buildReviewMetrics({ views: "3000", likes: "100", saves: "80", comments: "20", inquiries: "40", orders: "2" });
    expect(m.bottleneck).toBe("order");
    expect(m.judgment).toMatch(/价格|运费|客服|售后/);
  });

  it("数据量过小时降低置信度并提示作为假设", () => {
    const m = buildReviewMetrics({ views: "120", likes: "3" });
    expect(m.dataTooSmall).toBe(true);
    expect(m.confidenceLevel).toBe("低");
    expect(m.bottleneck).toBe("insufficient");
  });

  it("指标卡缺失值显示待补充，不显示 0%", () => {
    const cards = buildReviewMetricCards(buildReviewMetrics({ likes: "5" }));
    const interaction = cards.find((c) => c.key === "interactionRate");
    expect(interaction.value).toBe("待补充");
  });
});
