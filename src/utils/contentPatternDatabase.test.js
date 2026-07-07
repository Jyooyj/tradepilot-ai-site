import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { parseContentPatternCsv } from "./contentPatternUtils.js";
import { buildLocalXiaohongshuCopywritingPackage } from "./contentPatternCopywriting.js";
import {
  __resetContentPatternDatabaseForTests,
  checkRawTextLeakage,
  exportContentPatternDatasetCsv,
  exportContentPatternDatasetJson,
  exportContentPatternSeedJson,
  generateStructureFingerprint,
  importContentRawStaging,
  loadContentPatternDataset,
  loadContentRawStaging,
  markContentPatternReviewed,
  mergeContentPatternSeed,
  sanitizePatternForStorage,
  saveContentPatternDataset,
  saveContentPatternCopywriting,
} from "../services/contentPatternDatabase.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}

function samplePattern(overrides = {}) {
  return {
    platform: "小红书",
    category_key: "饰品",
    hook_type: "question",
    title_structure: "【人群】+【场景问题】+【选择建议】",
    opening_structure: "从目标人群的日常使用困扰切入",
    reusable_template: "【人群】也能入的【价格定位】【商品】，日常用不心疼",
    suitable_audience: "通勤人群",
    selling_points: ["使用场景", "选择理由"],
    content_angle: ["提出问题", "解释选择"],
    suitable_channel: "图文",
    avoid_claims: ["不编造功效"],
    example_generated_title: "通勤党怎么挑一件日常配饰",
    source_type: "manual_import",
    source_batch_id: "batch-test",
    ...overrides,
  };
}

beforeEach(() => {
  globalThis.window = { localStorage: new MemoryStorage() };
  __resetContentPatternDatabaseForTests();
});

afterEach(() => {
  delete globalThis.window;
});

describe("Content Pattern Database V1", () => {
  it("parses UTF-8 Chinese CSV fields without mojibake", () => {
    const csv = "平台,来源类型,关键词,类目,原始标题,原始开头,内容类型,商品名称,备注,收集时间\n小红书,人工导入,通勤耳饰,饰品,通勤耳饰怎么选？,先说一个常见困扰,图文,珍珠耳夹,仅用于结构提取,2026-06-23";
    const result = parseContentPatternCsv(csv);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ platform: "小红书", title_raw: "通勤耳饰怎么选？", opening_raw: "先说一个常见困扰" });
  });

  it("imports CSV-shaped rows into staging without touching dataset", () => {
    const result = importContentRawStaging([{ platform: "抖音", title_raw: "临时原始标题", opening_raw: "临时原始开头" }]);
    expect(result.imported).toBe(1);
    expect(loadContentRawStaging()).toHaveLength(1);
    expect(loadContentPatternDataset()).toHaveLength(0);
  });

  it("uses a strict dataset whitelist and forces privacy defaults", () => {
    const safe = sanitizePatternForStorage(samplePattern({
      title_raw: "禁止保存",
      opening_raw: "禁止保存",
      body: "禁止保存",
      originalText: "禁止保存",
      rawTitle: "禁止保存",
      rawOpening: "禁止保存",
      nickname: "禁止保存",
      followers: 10000,
      raw_text_stored: true,
    }));
    expect(safe).not.toHaveProperty("title_raw");
    expect(safe).not.toHaveProperty("opening_raw");
    expect(safe).not.toHaveProperty("body");
    expect(safe).not.toHaveProperty("nickname");
    expect(safe.raw_text_stored).toBe(false);
    expect(safe.human_reviewed).toBe(false);
  });

  it("generates a stable normalized structure fingerprint", () => {
    const one = generateStructureFingerprint(samplePattern());
    const two = generateStructureFingerprint(samplePattern({ title_structure: "【人群】 + 【场景问题】，+【选择建议】" }));
    expect(one).toMatch(/^cpf1-[0-9a-f]{8}$/);
    expect(two).toBe(one);
  });

  it("recognizes duplicate structures instead of saving twice", () => {
    const first = saveContentPatternDataset(samplePattern());
    const second = saveContentPatternDataset(samplePattern({ pattern_id: "another-id" }));
    expect(first.status).toBe("saved");
    expect(second.status).toBe("duplicate");
    expect(second.message).toBe("该结构可能已存在。");
    expect(loadContentPatternDataset()).toHaveLength(1);
  });

  it("blocks an eight-character Chinese raw-text leak", () => {
    const rawInput = { title_raw: "这是一个不应该直接保存的原始标题片段" };
    const risky = samplePattern({ reusable_template: "模板开头：不应该直接保存的原始标题片段" });
    expect(checkRawTextLeakage(risky, rawInput).risk).toBe(true);
    const result = saveContentPatternDataset(risky, rawInput);
    expect(result.status).toBe("rejected_raw_leak");
    expect(loadContentPatternDataset()).toHaveLength(0);
  });

  it("blocks a raw-text leak inside the Xiaohongshu copywriting package", () => {
    const saved = saveContentPatternDataset(samplePattern());
    const rawInput = { opening_raw: "这是一段绝对不能复制进文案包的原始开头内容" };
    const copy = buildLocalXiaohongshuCopywritingPackage({ brief: { topic: "通勤耳夹" } });
    copy.xiaohongshu.body = "开头直接复制：绝对不能复制进文案包的原始开头内容";
    const result = saveContentPatternCopywriting(saved.pattern.pattern_id, copy, "fallback", rawInput);
    expect(result.status).toBe("rejected_raw_leak");
    expect(loadContentPatternDataset()[0].copywriting_generated).toBe(false);
  });

  it("marks a saved pattern as human reviewed", () => {
    const saved = saveContentPatternDataset(samplePattern());
    const reviewed = markContentPatternReviewed(saved.pattern.pattern_id, true);
    expect(reviewed.ok).toBe(true);
    expect(reviewed.pattern.human_reviewed).toBe(true);
  });

  it("exports JSON and CSV from dataset without raw fields or raw values", () => {
    const rawValue = "这段原文绝不能进入导出";
    saveContentPatternDataset(samplePattern(), { title_raw: rawValue });
    const json = exportContentPatternDatasetJson().content;
    const csv = exportContentPatternDatasetCsv().content;
    for (const content of [json, csv]) {
      expect(content).not.toContain("title_raw");
      expect(content).not.toContain("opening_raw");
      expect(content).not.toContain(rawValue);
    }
    expect(json).toContain('"raw_text_stored": false');
    expect(csv).toContain("human_reviewed");
  });

  it("exports and merges public seed packages without overriding local edits", () => {
    const local = saveContentPatternDataset(samplePattern({ suitable_audience: "本地编辑人群" }));
    const copy = buildLocalXiaohongshuCopywritingPackage({ brief: { topic: "宿舍桌面灯" } });
    const seedPattern = samplePattern({
      pattern_id: "seed-pattern",
      category_key: "宿舍/家居",
      title_structure: "【空间】+【困扰】+【轻量改变】",
      opening_structure: "从小空间日常需求切入",
      reusable_template: "【空间】也能有【目标感受】",
      copywriting_package: copy,
      copywriting_generated: true,
      copywriting_source: "seed",
    });
    const merged = mergeContentPatternSeed([local.pattern, seedPattern]);
    expect(merged.added).toBe(1);
    expect(merged.dataset.find((item) => item.pattern_id === local.pattern.pattern_id).suitable_audience).toBe("本地编辑人群");
    const exported = exportContentPatternSeedJson(merged.dataset).content;
    expect(exported).toContain('"copywriting_package"');
    expect(exported).not.toMatch(/title_raw|opening_raw|douyin_script|video_script|shot_script|oral_script/);
  });

  it("does not add Xiaohongshu or Douyin crawler dependencies", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    expect(dependencies).not.toHaveProperty("puppeteer");
    expect(dependencies).not.toHaveProperty("playwright");
  });
});
