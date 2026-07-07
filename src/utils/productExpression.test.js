import { describe, it, expect } from "vitest";
import { analyzeProduct } from "../../App.jsx";
import {
  buildProductExpression,
  toDisplayText,
  cleanHashtags,
  sanitizeDisplayDeep,
  FORBIDDEN_DISPLAY_PHRASES,
} from "./productExpression";

const META = new Set([
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
function collect(result, keysFilter) {
  const seen = new Set();
  const parts = [];
  const walk = (v, key) => {
    if (v == null) return;
    if (typeof v === "string") {
      if (!keysFilter || keysFilter(key)) parts.push(v);
      return;
    }
    if (typeof v === "object") {
      if (seen.has(v)) return;
      seen.add(v);
      Object.entries(v).forEach(([k, x]) => {
        if (META.has(k)) return;
        walk(x, k);
      });
    }
  };
  walk(result, "");
  return parts.join(" ");
}

const PENGUIN = {
  name: "戴黄帽背书包企鹅毛绒钥匙扣挂件",
  category: "毛绒挂件",
  material: "毛绒 合金扣 布料书包带",
  audience: "学生群体（中小学生/大学生）、年轻女性、二次元/盲盒爱好者",
  channel: "小红书",
  cost: "3.5",
  price: "19.9",
  moq: "100",
  keywords: "可爱 钥匙扣 挂件",
  note: "产品形象为一只圆滚滚的灰白色小企鹅（或小鸟），头戴黄色贝雷帽",
};

describe("商品信息表达层 productExpression", () => {
  it("长识别名被压缩成自然短商品名", () => {
    const expr = buildProductExpression(
      { productName: PENGUIN.name, category: PENGUIN.category, material: PENGUIN.material, audience: PENGUIN.audience, channel: PENGUIN.channel, productIdentity: {}, coreProductTerms: [] },
      PENGUIN
    );
    expect(expr.displayName.length).toBeLessThanOrEqual(16);
    expect(expr.shortName.length).toBeLessThanOrEqual(8);
    expect(expr.displayName).not.toContain("戴黄帽");
    expect(expr.displayName).not.toContain("背书包");
    expect(expr.displayName).toContain("企鹅");
    expect(expr.displayName).toContain("挂件");
  });

  it("不确定识别结果进入 uncertaintyNotes，而不是商品名", () => {
    const expr = buildProductExpression(
      { productName: PENGUIN.name, material: PENGUIN.material, audience: PENGUIN.audience, productIdentity: {}, coreProductTerms: [] },
      PENGUIN
    );
    expect(expr.uncertaintyNotes.join(" ")).toContain("或小鸟");
    expect(expr.displayName).not.toContain("或小鸟");
    expect(expr.shortName).not.toContain("或小鸟");
  });

  it("toDisplayText 去除系统式表达与不确定括号", () => {
    expect(toDisplayText("产品形象为一只圆滚滚的小企鹅（或小鸟）")).not.toContain("产品形象为");
    expect(toDisplayText("产品形象为一只圆滚滚的小企鹅（或小鸟）")).not.toContain("或小鸟");
    expect(FORBIDDEN_DISPLAY_PHRASES).toContain("产品形象为");
  });

  it("cleanHashtags 过滤超过12字或像句子的长标签", () => {
    const tags = cleanHashtags(["企鹅挂件", "一只圆滚滚的灰白色小企鹅挂件", "产品形象为企鹅", "可爱小物，超适合"]);
    expect(tags).toContain("#企鹅挂件");
    tags.forEach((t) => expect(t.replace(/^#/, "").length).toBeLessThanOrEqual(12));
    expect(tags.join(" ")).not.toContain("产品形象为");
    expect(tags.join(" ")).not.toContain("，");
  });
});

describe("企鹅毛绒钥匙扣挂件报告（表达层接入后）", () => {
  const result = analyzeProduct(PENGUIN, true);

  it("不把系统式长句塞进小红书/抖音/标签/搜索词", () => {
    const visibleText = collect({
      xhsPackage: result.xhsPackage,
      douyinPackage: result.douyinPackage,
      keywordPlan: result.keywordPlan,
    });
    FORBIDDEN_DISPLAY_PHRASES.forEach((p) => {
      expect(visibleText.includes(p), `should not contain system phrase ${p}`).toBe(false);
    });
    expect(visibleText.includes("或小鸟")).toBe(false);
  });

  it("标题/标签不出现超长识别句，标签均为短标签", () => {
    (result.xhsPackage.titles || []).forEach((t) => {
      expect(t).not.toContain("产品形象为");
      expect(t).not.toContain("或小鸟");
    });
    (result.xhsPackage.tags || []).forEach((tag) => {
      const body = String(tag).replace(/^#/, "");
      expect(body.length).toBeLessThanOrEqual(12);
      expect(/[，。！？,.!?；;]/.test(body)).toBe(false);
    });
  });

  it("生成挂包/书包/钥匙扣/毛绒/挂扣/缝线/掉毛等具体内容", () => {
    const all = collect(result);
    ["挂", "书包", "钥匙扣", "毛绒", "挂扣", "缝线", "掉毛"].forEach((w) => {
      expect(all.includes(w), `should contain ${w}`).toBe(true);
    });
  });

  it("抖音脚本不在每个镜头重复完整原始识别句", () => {
    const shots = result.douyinPackage.shots || [];
    const longRaw = "戴黄帽背书包企鹅毛绒钥匙扣挂件";
    const repeats = shots.filter((s) => JSON.stringify(s).includes(longRaw)).length;
    expect(repeats).toBe(0);
  });

  it("displayName 出现在报告头部且为压缩后的短名", () => {
    expect(result.productExpression.displayName.length).toBeLessThanOrEqual(16);
    expect(result.report).toContain(result.productExpression.displayName);
    expect(result.report).not.toContain("戴黄帽背书包企鹅毛绒钥匙扣挂件");
  });

  it("供应商清单包含挂扣/装饰件/样品大货一致性等真实进货问题", () => {
    const sup = (result.supplierQuestions || []).join(" ");
    expect(sup).toContain("挂扣");
    expect(sup.includes("装饰件") || sup.includes("脱落")).toBe(true);
    expect(sup).toContain("样品和大货");
  });

  it("sanitizeDisplayDeep 递归剔除系统话术", () => {
    const cleaned = sanitizeDisplayDeep({ a: "产品形象为企鹅挂件", list: ["识别结果显示很可爱"] });
    expect(JSON.stringify(cleaned)).not.toContain("产品形象为");
    expect(JSON.stringify(cleaned)).not.toContain("识别结果显示");
  });
});
