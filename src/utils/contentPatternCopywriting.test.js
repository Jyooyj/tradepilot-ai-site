import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildLocalXiaohongshuCopywritingPackage,
  containsForbiddenCopywritingFields,
  normalizeXiaohongshuCopywritingPackage,
} from "./contentPatternCopywriting.js";
import { getContentPatternHookLabel, sanitizePatternForStorage } from "../services/contentPatternDatabase.js";

function xhsOutputText(copy) {
  return JSON.stringify(copy.xiaohongshu);
}

describe("Xiaohongshu copywriting package", () => {
  it("generates only the required Xiaohongshu graphic-post package", () => {
    const copy = buildLocalXiaohongshuCopywritingPackage({
      pattern: { hook_type: "question" },
      brief: { topic: "通勤耳夹", audience: "无耳洞通勤人群", keyPoints: "轻量、适合日常搭配", scene: "上课和通勤" },
    });
    expect(Object.keys(copy)).toEqual(["xiaohongshu", "selling_points", "generation_basis"]);
    expect(copy.xiaohongshu.titles).toHaveLength(5);
    expect(copy.xiaohongshu.cover_texts).toHaveLength(5);
    expect(copy.xiaohongshu.openings).toHaveLength(3);
    expect(copy.xiaohongshu.ending_guides).toHaveLength(3);
    expect(copy.xiaohongshu.hashtags).toHaveLength(8);
    expect(copy.xiaohongshu.image_suggestions).toHaveLength(5);
    expect(copy.generation_basis.platform_style).toBe("小红书图文");
    expect(containsForbiddenCopywritingFields(copy)).toBe(false);
  });

  it("does not contain oral, shot, short-video, or video-script output fields", () => {
    const copy = buildLocalXiaohongshuCopywritingPackage({ brief: { topic: "桌面收纳盒" } });
    const serialized = JSON.stringify(copy);
    for (const field of ["douyin_hooks", "douyin_script", "oral_script", "shot_script", "video_script", "short_video"]) {
      expect(serialized).not.toContain(field);
    }
  });

  it("does not invent price, material, sales, engagement, efficacy, or user feedback", () => {
    const copy = buildLocalXiaohongshuCopywritingPackage({ brief: { topic: "桌面小物" } });
    const output = xhsOutputText(copy);
    expect(output).not.toMatch(/\d+元|纯银|真皮|爆卖|卖疯|万人下单|点赞过万|收藏过万|很多人都说|大家都在买|100%有效/);
  });

  it("sanitizes unsafe claims and user-provided banned expressions", () => {
    const copy = normalizeXiaohongshuCopywritingPackage({
      xiaohongshu: {
        titles: ["全网最低必买收纳盒"],
        body: "很多人都说它100%有效，而且这是绝对舒适的选择。",
      },
    }, { topic: "收纳盒", avoid: "绝对舒适" });
    const output = xhsOutputText(copy);
    expect(output).not.toMatch(/全网最低|必买|很多人都说|100%有效|绝对舒适/);
  });

  it("normalizes legacy records without a copywriting package", () => {
    const pattern = sanitizePatternForStorage({ title_structure: "场景 + 价值", opening_structure: "生活化开头" });
    expect(pattern.copywriting_generated).toBe(false);
    expect(pattern.copywriting_package.xiaohongshu.titles).toEqual([]);
  });

  it("uses Chinese Hook labels and the expanded edit button wording", () => {
    expect(getContentPatternHookLabel("question")).toBe("提问型");
    expect(getContentPatternHookLabel("pain_point")).toBe("痛点型");
    const panelSource = readFileSync(new URL("../components/ContentPatternDatabasePanel.jsx", import.meta.url), "utf8");
    expect(panelSource).toContain("展开并编辑");
  });

  it("public seed contains Xiaohongshu packages and no video-script fields", () => {
    const seed = JSON.parse(readFileSync(new URL("../../public/datasets/content_pattern_seed.json", import.meta.url), "utf8"));
    expect(seed.platform).toBe("xiaohongshu");
    expect(seed.patterns.length).toBeGreaterThan(0);
    for (const pattern of seed.patterns) {
      const xiaohongshuPackage = pattern.copywriting_package?.xiaohongshu;
      expect(xiaohongshuPackage).toBeTruthy();
      if (pattern.copywriting_generated) {
        expect(xiaohongshuPackage.body).toBeTruthy();
      }
      expect(pattern.raw_text_stored).toBe(false);
      expect(containsForbiddenCopywritingFields(pattern.copywriting_package)).toBe(false);
    }
    expect(JSON.stringify(seed)).not.toMatch(/title_raw|opening_raw|originalText|rawTitle|rawOpening|douyin_script|video_script|shot_script|oral_script|short_video/);
  });

  it("does not add crawler dependencies", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    for (const name of ["puppeteer", "playwright", "crawlee", "cheerio"]) expect(dependencies).not.toHaveProperty(name);
  });
});
