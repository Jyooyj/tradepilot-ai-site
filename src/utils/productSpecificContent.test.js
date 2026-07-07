import { describe, it, expect } from "vitest";
import { analyzeProduct } from "../../App.jsx";
import {
  buildProductSpecificBrief,
  buildSpecificXhsCopy,
  specializeText,
  GENERIC_FILLER_PHRASES,
} from "./productSpecificContent";

// 报告内容拍平（跳过内部禁用词配置元数据）。
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
function flat(result) {
  const seen = new Set();
  const parts = [];
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === "string") {
      parts.push(v);
      return;
    }
    if (typeof v === "object") {
      if (seen.has(v)) return;
      seen.add(v);
      Object.entries(v).forEach(([k, x]) => {
        if (META.has(k)) return;
        walk(x);
      });
    }
  };
  walk(result);
  return parts.join(" ");
}

const FILLER = ["小东西", "小问题", "实用小物", "日常幸福感", "每天都忍", "用前用后差别"];

describe("内容具体化（基于当前商品信息）", () => {
  it("桌面收纳盒：内容包/脚本/风险包含当前相关词，不出现空泛词", () => {
    const product = {
      name: "桌面收纳盒",
      category: "家居收纳",
      material: "塑料",
      audience: "上班族",
      channel: "抖音 小红书",
      cost: "8",
      price: "39.9",
      moq: "50",
      keywords: "办公桌 整理 桌面",
    };
    const text = flat(analyzeProduct(product, false));
    // 至少包含若干当前相关词
    const related = ["桌面", "收纳", "收纳盒", "办公", "塑料", "尺寸", "承重", "边缘"];
    const hitCount = related.filter((w) => text.includes(w)).length;
    expect(hitCount).toBeGreaterThanOrEqual(6);
    // 价格 / MOQ 风险体现
    expect(text.includes("MOQ") || text.includes("起订量") || text.includes("压货")).toBe(true);
    // 不出现空泛词
    FILLER.forEach((w) => expect(text.includes(w), `should not contain filler ${w}`).toBe(false));
  });

  it("发夹：脚本/风险包含发夹、碎发、夹力/掉色、发饰等相关词", () => {
    const product = {
      name: "发夹",
      category: "发饰",
      material: "金属",
      audience: "学生",
      channel: "小红书",
      cost: "1",
      price: "9",
      moq: "200",
      keywords: "碎发 刘海 整理头发",
    };
    const text = flat(analyzeProduct(product, false));
    expect(text).toContain("发夹");
    expect(text).toContain("碎发");
    expect(text).toContain("金属");
    expect(text.includes("掉色") || text.includes("生锈") || text.includes("过敏")).toBe(true);
  });

  it("缺少材质时，不编造塑料/木珠/金属等具体材质", () => {
    const product = {
      name: "桌面小风扇",
      category: "数码配件",
      material: "",
      audience: "学生",
      channel: "小红书",
      keywords: "宿舍 降温",
    };
    const text = flat(analyzeProduct(product, false));
    // 没填材质就不该凭空出现这些材质风险描述
    expect(text.includes("塑料厚度")).toBe(false);
    expect(text.includes("木珠")).toBe(false);
    expect(text.includes("金属件是否容易掉色")).toBe(false);
  });

  it("信息严重不足（只有名字）时，提示信息不足而非伪具体内容", () => {
    const brief = buildProductSpecificBrief(
      { productName: "某新品", productIdentity: {}, coreProductTerms: ["某新品"] },
      { name: "某新品" }
    );
    expect(brief.hasName).toBe(true);
    expect(brief.sufficient).toBe(false);
    expect(brief.missing).toContain("材质");
  });

  it("buildSpecificXhsCopy 把商品名、材质、场景写进文案", () => {
    const brief = buildProductSpecificBrief(
      {
        productName: "桌面收纳盒",
        category: "家居收纳",
        material: "塑料",
        audience: "上班族",
        productIdentity: {},
        coreProductTerms: ["桌面收纳盒", "收纳盒"],
      },
      { name: "桌面收纳盒", material: "塑料", audience: "上班族", keywords: "办公桌" }
    );
    const copy = buildSpecificXhsCopy(brief);
    const text = JSON.stringify(copy);
    expect(text).toContain("桌面收纳盒");
    expect(text).toContain("塑料");
    expect(copy.body).toContain("桌面收纳盒");
  });

  it("specializeText 把空泛名词替换为商品核心名词，并移除空洞表达", () => {
    const brief = { coreNoun: "桌面收纳盒", shortNoun: "收纳盒" };
    expect(specializeText("这种小东西用过才知道方便", brief)).toContain("桌面收纳盒");
    expect(specializeText("这种小东西用过才知道方便", brief)).not.toContain("小东西");
    const cleaned = specializeText("不是大件，但真的会提高日常幸福感", brief);
    expect(cleaned).not.toContain("日常幸福感");
    expect(cleaned).not.toContain("不是大件");
  });

  it("当前商品确实是钥匙扣时，钥匙扣不被误删", () => {
    const product = {
      name: "金属钥匙扣",
      category: "文创挂饰",
      material: "金属",
      audience: "学生",
      channel: "小红书",
      keywords: "钥匙扣 挂件",
    };
    const text = flat(analyzeProduct(product, false));
    expect(text).toContain("钥匙扣");
  });

  it("当前商品不是钥匙扣时，不出现旧案例钥匙扣/木珠/果核", () => {
    const product = {
      name: "桌面收纳盒",
      category: "家居收纳",
      material: "塑料",
      audience: "上班族",
      channel: "抖音",
      keywords: "办公桌 整理",
    };
    const text = flat(analyzeProduct(product, false));
    ["钥匙扣", "木珠", "果核", "包包挂件", "校园市集"].forEach((w) =>
      expect(text.includes(w), `should not contain legacy ${w}`).toBe(false)
    );
  });

  it("GENERIC_FILLER_PHRASES 覆盖了关键空泛话术", () => {
    ["这个小东西", "实用小物", "日常幸福感", "每天都忍", "不是大件"].forEach((p) =>
      expect(GENERIC_FILLER_PHRASES).toContain(p)
    );
  });
});
