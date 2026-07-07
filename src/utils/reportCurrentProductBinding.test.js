import { describe, it, expect } from "vitest";
import {
  analyzeProduct,
  createContentContext,
  validateGeneratedContent,
  inferMarketInfo,
} from "../../App.jsx";

// 把整份报告结果拍平成文本，便于检查串线关键词。
// 跳过 contentContext / productIdentity 等“配置元数据”字段——
// 那里本就保存“禁用词列表”，属于内部规则而非展示给用户的报告文案。
const META_KEYS = new Set([
  "contentContext",
  "productIdentity",
  "bannedTerms",
  "forbiddenIdentityTerms",
  "allowedTerms",
  "allowedIdentityTerms",
  "coreProductTerms",
  "sceneTerms",
  "sellingPoints",
  "scenarioTerms",
]);

function reportText(result) {
  const seen = new Set();
  const parts = [];
  const walk = (value) => {
    if (value == null) return;
    if (typeof value === "string") {
      parts.push(value);
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") return;
    if (typeof value === "object") {
      if (seen.has(value)) return;
      seen.add(value);
      Object.entries(value).forEach(([key, item]) => {
        if (META_KEYS.has(key)) return;
        walk(item);
      });
    }
  };
  walk(result);
  return parts.join(" ");
}

const SUSPECT = ["木珠", "果核", "帆布包", "钥匙扣", "国风", "校园市集", "包包挂件", "低预算礼物"];

describe("report stays bound to the current product", () => {
  it("a generic product with no legacy material does not inject 木珠/果核/帆布包/钥匙扣", () => {
    const product = {
      name: "桌面收纳盒",
      category: "家居收纳",
      material: "塑料",
      audience: "上班族",
      channel: "抖音",
      cost: "8",
      price: "39.9",
      moq: "50",
      keywords: "办公桌 整理 桌面",
    };
    const result = analyzeProduct(product, false);
    const text = reportText(result);
    SUSPECT.forEach((term) => {
      expect(text.includes(term), `report should not contain legacy term ${term}`).toBe(false);
    });
  });

  it("product B report does not carry product A specific keywords", () => {
    const productA = {
      name: "木珠钥匙扣",
      category: "文创挂饰",
      material: "木珠 果核",
      audience: "学生党",
      channel: "小红书",
      cost: "2",
      price: "9.9",
      moq: "100",
      keywords: "国风 校园市集 帆布包挂件",
    };
    const productB = {
      name: "桌面收纳盒",
      category: "家居收纳",
      material: "塑料",
      audience: "上班族",
      channel: "抖音",
      cost: "8",
      price: "39.9",
      moq: "50",
      keywords: "办公桌 整理",
    };
    // 先分析 A，再分析 B —— B 的结果必须与 A 无关。
    analyzeProduct(productA, false);
    const resultB = analyzeProduct(productB, false);
    const text = reportText(resultB);
    ["木珠", "果核", "帆布包", "钥匙扣", "国风", "校园市集"].forEach((term) => {
      expect(text.includes(term), `B report should not contain A term ${term}`).toBe(false);
    });
    // B 应包含自己的核心信息。
    expect(text).toContain("收纳");
  });

  it("a product that genuinely is a 木珠钥匙扣 may keep those terms", () => {
    const product = {
      name: "木珠钥匙扣",
      category: "文创挂饰",
      material: "木珠",
      audience: "学生党",
      channel: "小红书",
      cost: "2",
      price: "9.9",
      moq: "100",
      keywords: "木珠 钥匙扣 手作",
    };
    const result = analyzeProduct(product, false);
    const text = reportText(result);
    // 当前商品确实是木珠钥匙扣，允许出现相关词。
    expect(text.includes("木珠") || text.includes("钥匙扣")).toBe(true);
  });

  it("validateGeneratedContent strips legacy pollution not present in current product", () => {
    const market = inferMarketInfo({ name: "发夹", category: "发饰" });
    const ctx = createContentContext(
      { name: "发夹", category: "发饰", material: "金属", audience: "学生" },
      false,
      market,
      null,
      null,
      null
    );
    const polluted = { copy: "建议参考木珠果核钥匙扣，主打校园市集低预算礼物。" };
    const { content } = validateGeneratedContent(ctx, polluted, "xhsPackage");
    const text = JSON.stringify(content);
    expect(text).not.toContain("木珠");
    expect(text).not.toContain("果核");
    expect(text).not.toContain("校园市集");
  });
});
