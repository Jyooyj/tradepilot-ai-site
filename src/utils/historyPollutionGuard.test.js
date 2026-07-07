import { describe, it, expect } from "vitest";
import {
  SUSPECT_LEGACY_TERMS,
  buildContextKeywordText,
  detectHistoryPollution,
  sanitizeLegacyPollutionText,
  stripLegacyPollution,
  guardModuleContent,
} from "./historyPollutionGuard";

describe("historyPollutionGuard", () => {
  it("exposes the known legacy pollution terms", () => {
    ["木珠", "果核", "帆布包", "钥匙扣", "国风", "校园市集", "小礼物", "包包挂件"].forEach(
      (term) => {
        expect(SUSPECT_LEGACY_TERMS).toContain(term);
      }
    );
  });

  it("flags legacy terms that the current product context does not contain", () => {
    const ctx = buildContextKeywordText("桌面收纳盒", "家居收纳", "塑料", "上班族");
    const result = detectHistoryPollution(
      "适合做成木珠果核钥匙扣，主打校园市集低预算礼物。",
      ctx
    );
    expect(result.polluted).toBe(true);
    expect(result.hits).toEqual(expect.arrayContaining(["木珠", "果核", "钥匙扣"]));
  });

  it("does NOT flag legacy terms that the current product genuinely contains", () => {
    const ctx = buildContextKeywordText("木珠钥匙扣", "文创挂饰", "木珠", "学生");
    const result = detectHistoryPollution("这款木珠钥匙扣适合手作风格。", ctx);
    expect(result.polluted).toBe(false);
    expect(result.hits).toEqual([]);
  });

  it("strips polluted legacy terms from a string but keeps legit ones", () => {
    const ctx = buildContextKeywordText("发夹", "发饰", "金属");
    const text = sanitizeLegacyPollutionText(
      "这款发夹建议参考木珠和钥匙扣的卖法。",
      ctx,
      "相关品类"
    );
    expect(text).not.toContain("木珠");
    expect(text).not.toContain("钥匙扣");
    expect(text).toContain("发夹");
  });

  it("supports a replacement function", () => {
    const ctx = "";
    const text = sanitizeLegacyPollutionText("主打国风风格", ctx, () => "当前风格");
    expect(text).toBe("主打当前风格风格");
  });

  it("recursively strips pollution from nested structures", () => {
    const ctx = buildContextKeywordText("收纳盒", "家居");
    const input = {
      title: "木珠收纳盒",
      tags: ["国风", "校园市集", "收纳"],
      nested: { copy: "送朋友的低预算礼物" },
    };
    const cleaned = stripLegacyPollution(input, ctx, "");
    const text = JSON.stringify(cleaned);
    expect(text).not.toContain("木珠");
    expect(text).not.toContain("国风");
    expect(text).not.toContain("校园市集");
    expect(text).not.toContain("低预算礼物");
    expect(text).toContain("收纳");
  });

  it("guardModuleContent reports ok=false and returns cleaned content", () => {
    const ctx = buildContextKeywordText("手机支架", "数码配件");
    const guarded = guardModuleContent("木珠帆布包挂件推荐", ctx, { replacement: "" });
    expect(guarded.ok).toBe(false);
    expect(guarded.polluted).toBe(true);
    expect(guarded.hits.length).toBeGreaterThan(0);
    expect(guarded.content).not.toContain("木珠");
    expect(guarded.content).not.toContain("帆布包");
  });
});
