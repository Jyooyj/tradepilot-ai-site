import { describe, expect, it } from "vitest";

import {
  buildLocalContentPattern,
  buildLocalOriginalCopy,
  parseContentPatternCsv,
  parseReferenceCsv,
  sanitizeReferenceItems,
} from "./contentPatternUtils.js";
import { safePatternForStorage } from "../services/contentPatternStorage.js";

describe("parseReferenceCsv", () => {
  it("reads Chinese headers and quoted multiline cells", () => {
    const csv = '标题,正文\n"通勤怎么选？","第一行\n第二行，含逗号"';
    const result = parseReferenceCsv(csv);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({ title: "通勤怎么选？", body: "第一行\n第二行，含逗号" });
  });

  it("limits reference count and field length", () => {
    const rows = Array.from({ length: 40 }, (_, index) => `标题${index},正文${index}`).join("\n");
    const result = parseReferenceCsv(rows);

    expect(result.items).toHaveLength(30);
    expect(result.truncated).toBe(true);
  });
});

describe("parseContentPatternCsv Xiaohongshu defaults", () => {
  it("defaults missing platform and content type to Xiaohongshu graphic posts", () => {
    const result = parseContentPatternCsv("title_raw,opening_raw\n测试标题,测试开头");
    expect(result.items[0]).toMatchObject({ platform: "xiaohongshu", content_type: "图文笔记" });
  });
});

describe("content pattern privacy boundary", () => {
  it("stores only abstract structure fields, never reference titles or bodies", () => {
    const originalTitle = "这是不应长期保存的原始标题";
    const originalBody = "这是不应长期保存的原始正文";
    const pattern = buildLocalContentPattern({
      references: [{ title: originalTitle, body: originalBody }],
      name: "测试结构",
    });
    const stored = safePatternForStorage({
      ...pattern,
      references: [{ title: originalTitle, body: originalBody }],
      rawTitle: originalTitle,
      rawBody: originalBody,
    });

    const serialized = JSON.stringify(stored);
    expect(stored).not.toHaveProperty("references");
    expect(stored).not.toHaveProperty("rawTitle");
    expect(stored).not.toHaveProperty("rawBody");
    expect(serialized).not.toContain(originalTitle);
    expect(serialized).not.toContain(originalBody);
  });

  it("sanitizes reference input without adding platform user fields", () => {
    const items = sanitizeReferenceItems([{ title: "标题", body: "正文", nickname: "不应保留" }]);
    expect(items).toEqual([{ title: "标题", body: "正文" }]);
  });
});

describe("local original generation", () => {
  it("uses the user's brief when AI is unavailable", () => {
    const copy = buildLocalOriginalCopy({ brief: { topic: "通勤耳夹", audience: "无耳洞女生", keyPoints: "轻量，合金材质" } });

    expect(copy.titles.join(" ")).toContain("通勤耳夹");
    expect(copy.body).toContain("轻量，合金材质");
    expect(copy.source).toBe("fallback");
  });
});
