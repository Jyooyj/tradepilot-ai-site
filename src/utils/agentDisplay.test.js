import { describe, expect, it } from "vitest";

import {
  BASE_SUPPLIER_QUESTIONS,
  buildControlledPauseNote,
  buildDecisionDisplay,
  buildTraceEmptyMessage,
  containsInternalKeyword,
  getAgentStatusDisplay,
  getMissingFieldLabel,
  isUnsafeAgentText,
  looksLikeEnglishParagraph,
  mapMissingFieldLabels,
  sanitizeAgentDisplayList,
  sanitizeAgentDisplayText,
} from "./agentDisplay.js";

const ENGLISH_PLANNER_RAW =
  "The user's goal is to determine whether this product is worth sampling. " +
  "Use the canonical result summary and generate_supplier_checklist, " +
  "generate_content_test_plan, retrieve_user_memory. Final JSON must reflect the plan.";

describe("sanitizeAgentDisplayText", () => {
  it("does not surface raw English planner text in the main UI", () => {
    const result = sanitizeAgentDisplayText(ENGLISH_PLANNER_RAW, "中文兜底摘要");
    expect(result).toBe("中文兜底摘要");
    expect(result).not.toContain("The user's goal");
    expect(result).not.toContain("generate_supplier_checklist");
  });

  it("falls back when text contains internal keywords like tool_calls / Final JSON", () => {
    expect(sanitizeAgentDisplayText("Please return tool_calls now", "安全摘要")).toBe("安全摘要");
    expect(sanitizeAgentDisplayText("Final JSON must reflect the plan", "安全摘要")).toBe("安全摘要");
    expect(sanitizeAgentDisplayText("retrieve_user_memory observation", "安全摘要")).toBe("安全摘要");
    expect(sanitizeAgentDisplayText("see canonical result above", "安全摘要")).toBe("安全摘要");
    expect(sanitizeAgentDisplayText("pendingApproval ready", "安全摘要")).toBe("安全摘要");
  });

  it("keeps safe Chinese text untouched", () => {
    expect(sanitizeAgentDisplayText("当前建议先小批量验证。", "兜底")).toBe("当前建议先小批量验证。");
  });

  it("drops raw JSON-like content", () => {
    expect(sanitizeAgentDisplayText('{"status":"completed"}', "兜底")).toBe("兜底");
  });

  it("returns fallback for empty / non-string input", () => {
    expect(sanitizeAgentDisplayText("", "兜底")).toBe("兜底");
    expect(sanitizeAgentDisplayText(null, "兜底")).toBe("兜底");
    expect(sanitizeAgentDisplayText(undefined)).toBe("");
  });
});

describe("internal keyword & english detection", () => {
  it("detects internal planner keywords", () => {
    expect(containsInternalKeyword("Final JSON")).toBe(true);
    expect(containsInternalKeyword("tool_calls")).toBe(true);
    expect(containsInternalKeyword("当前建议先小批量验证")).toBe(false);
  });

  it("detects english paragraphs", () => {
    expect(looksLikeEnglishParagraph(ENGLISH_PLANNER_RAW)).toBe(true);
    expect(looksLikeEnglishParagraph("当前建议先小批量验证。")).toBe(false);
    expect(looksLikeEnglishParagraph("MOQ 起订量 500")).toBe(false);
  });

  it("treats english planner text as unsafe", () => {
    expect(isUnsafeAgentText(ENGLISH_PLANNER_RAW)).toBe(true);
    expect(isUnsafeAgentText("当前建议先小批量验证。")).toBe(false);
  });
});

describe("sanitizeAgentDisplayList", () => {
  it("filters out unsafe items but keeps safe Chinese items", () => {
    const list = sanitizeAgentDisplayList([
      "先补充拿货成本",
      "The user's goal is unclear",
      "generate_content_test_plan",
      "再做小批量验证",
    ]);
    expect(list).toEqual(["先补充拿货成本", "再做小批量验证"]);
  });
});

describe("getAgentStatusDisplay", () => {
  it("shows awaiting_input as a controlled pause, not an error", () => {
    const display = getAgentStatusDisplay("awaiting_input");
    expect(display.label).toBe("等待补充关键信息");
    expect(display.tone).toBe("warn");
    expect(display.detail).toContain("Agent 已暂停");
    expect(display.label).not.toMatch(/错误|失败|error/i);
  });

  it("shows completed and awaiting_approval labels", () => {
    expect(getAgentStatusDisplay("completed").label).toBe("已完成受控决策");
    expect(getAgentStatusDisplay("awaiting_approval").label).toBe("等待人工确认");
  });
});

describe("missing field labels", () => {
  it("maps english field keys to chinese labels", () => {
    expect(getMissingFieldLabel("cost")).toBe("拿货成本");
    expect(getMissingFieldLabel("moq")).toBe("MOQ / 起订量");
    expect(getMissingFieldLabel("supplier")).toBe("供应商信息");
    expect(getMissingFieldLabel("wholesalePriceReference")).toBe("批发价参考");
    expect(getMissingFieldLabel("sellingPrice")).toBe("预计售价");
    expect(getMissingFieldLabel("channel")).toBe("目标销售渠道");
  });

  it("maps a list of fields", () => {
    expect(mapMissingFieldLabels(["cost", "moq"])).toEqual(["拿货成本", "MOQ / 起订量"]);
  });
});

describe("buildDecisionDisplay", () => {
  it("uses controlled chinese summary when procurement info missing, never raw english", () => {
    const display = buildDecisionDisplay({
      status: "awaiting_input",
      missingFields: ["cost", "moq"],
      recommendation: { summary: ENGLISH_PLANNER_RAW, decision: "Sampling decision", rationale: [ENGLISH_PLANNER_RAW] },
    });
    expect(display.title).toBe("暂不建议直接拿货");
    expect(display.body).not.toContain("The user's goal");
    expect(display.points.length).toBeGreaterThan(0);
    expect(display.points.join("")).not.toContain("generate_supplier_checklist");
  });

  it("sanitizes recommendation text when no procurement info missing", () => {
    const display = buildDecisionDisplay({
      status: "completed",
      missingFields: [],
      recommendation: { summary: ENGLISH_PLANNER_RAW, decision: "Final JSON decision", rationale: ["先小批量验证", "tool_calls"] },
    });
    expect(display.body).not.toContain("The user's goal");
    expect(display.title).toBe("谨慎小批量验证");
    expect(display.points).toEqual(["先小批量验证"]);
  });
});

describe("trace messaging", () => {
  it("explains zero tool calls as a controlled pause, not a failure", () => {
    const message = buildTraceEmptyMessage("awaiting_input");
    expect(message).toContain("缺少关键信息");
    expect(message).not.toMatch(/失败|错误/);
  });

  it("controlled pause note frames awaiting_input as a capability", () => {
    expect(buildControlledPauseNote()).toContain("Agent 主动暂停");
  });
});

describe("base supplier questions", () => {
  it("provides chinese base communication questions", () => {
    expect(BASE_SUPPLIER_QUESTIONS.length).toBeGreaterThan(0);
    expect(BASE_SUPPLIER_QUESTIONS).toContain("MOQ 是否支持小批量试单？");
  });
});
