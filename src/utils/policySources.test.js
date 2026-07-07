import { describe, expect, it } from "vitest";

import {
  POLICY_CONNECTION_STATUS,
  POLICY_REGISTRY_NOTE,
  POLICY_UPDATE_FLOW,
  POLICY_UPDATE_FLOW_NOTE,
  POLICY_REGISTRY_TITLE,
  POLICY_REGISTRY_INTRO,
  POLICY_REGISTRY_FLOW,
  POLICY_REGISTRY_COVERAGE_NOTE,
  POLICY_REGISTRY_DISCLAIMER,
  POLICY_SOURCE_GROUPS,
  getPolicySourceRegistryMeta,
  getPolicySourcesByIds,
  policySources,
} from "../data/policySources.js";
import {
  POLICY_RISK_CATEGORY_LIST,
  POLICY_RISK_CATEGORY_DISPLAY,
  POLICY_RULES_VERSION,
  getPolicyRulesMeta,
  policyRiskRules,
} from "../data/policyRiskRules.js";

describe("policy sources registry", () => {
  it("includes the key registered sources", () => {
    const ids = policySources.map((s) => s.sourceId);
    expect(ids).toContain("samr_law_database");
    expect(ids).toContain("samr_absolute_terms_2023");
    expect(ids).toContain("douyin_product_info_rules");
    expect(ids).toContain("douyin_forbidden_goods_rules");
    expect(ids).toContain("tradepilot_general_compliance_seed");
  });

  it("does not fabricate a URL for the xiaohongshu source still pending", () => {
    const xhs = policySources.find((s) => s.sourceId === "xiaohongshu_community_rules");
    expect(xhs).toBeTruthy();
    expect(xhs.url).toBe("");
    expect(xhs.status).toBe("待补充来源");
  });

  it("resolves sources by ids", () => {
    const resolved = getPolicySourcesByIds(["samr_absolute_terms_2023", "tradepilot_general_compliance_seed"]);
    expect(resolved.length).toBe(2);
  });

  it("exposes registry meta", () => {
    const meta = getPolicySourceRegistryMeta();
    expect(meta.total).toBe(policySources.length);
    expect(meta.officialCount).toBeGreaterThan(0);
  });
});

describe("policy rule -> source mapping", () => {
  it("every rule has a non-empty sourceIds array", () => {
    expect(policyRiskRules.length).toBeGreaterThan(0);
    policyRiskRules.forEach((rule) => {
      expect(Array.isArray(rule.sourceIds)).toBe(true);
      expect(rule.sourceIds.length).toBeGreaterThan(0);
    });
  });

  it("every referenced sourceId exists in the registry", () => {
    const known = new Set(policySources.map((s) => s.sourceId));
    policyRiskRules.forEach((rule) => {
      rule.sourceIds.forEach((id) => expect(known.has(id)).toBe(true));
    });
  });

  it("absolute-claim rules map to the SAMR absolute terms guide", () => {
    const rule = policyRiskRules.find((r) => r.ruleId === "absolute_claim_high_001");
    expect(rule.sourceIds).toContain("samr_absolute_terms_2023");
  });

  it("restricted goods rule maps to douyin forbidden goods rules", () => {
    const rule = policyRiskRules.find((r) => r.ruleId === "restricted_goods_001");
    expect(rule.sourceIds).toContain("douyin_forbidden_goods_rules");
  });
});

describe("registry version & flow", () => {
  it("exposes rules version v1.1 in meta", () => {
    expect(POLICY_RULES_VERSION).toBe("policy-risk-rules-v1.1");
    expect(getPolicyRulesMeta().version).toBe("policy-risk-rules-v1.1");
  });

  it("covers exactly the 10 risk categories", () => {
    expect(POLICY_RISK_CATEGORY_LIST.length).toBe(10);
  });

  it("connection status marks official api & platform realtime audit as not connected", () => {
    const find = (key) => POLICY_CONNECTION_STATUS.find((s) => s.key === key);
    expect(find("registered_sources").value).toContain("已登记");
    expect(find("official_api").value).toContain("未接入");
    expect(find("platform_realtime_audit").value).toContain("未接入");
  });

  it("provides the new-policy update flow steps", () => {
    expect(POLICY_UPDATE_FLOW.length).toBeGreaterThanOrEqual(6);
    expect(POLICY_UPDATE_FLOW[0]).toContain("新法规");
  });
});

describe("registry wording guardrails", () => {
  it("does not over-promise or claim realtime official access", () => {
    const blob = [
      POLICY_REGISTRY_NOTE,
      POLICY_UPDATE_FLOW_NOTE,
      JSON.stringify(policySources),
      JSON.stringify(POLICY_CONNECTION_STATUS),
    ].join(" ");
    expect(blob).not.toContain("保证过审");
    expect(blob).not.toContain("已接入官方实时政策接口");
    expect(blob).not.toContain("绕过审核");
    expect(blob).not.toContain("平台官方审核规则库");
  });
});

describe("front-facing productized copy", () => {
  // 实际渲染到前台的内容（PolicyRiskPanel 只引用这些产品化常量）
  const frontFacing = [
    POLICY_REGISTRY_TITLE,
    POLICY_REGISTRY_INTRO,
    POLICY_REGISTRY_FLOW,
    POLICY_REGISTRY_COVERAGE_NOTE,
    POLICY_REGISTRY_DISCLAIMER,
    JSON.stringify(POLICY_SOURCE_GROUPS),
    JSON.stringify(POLICY_RISK_CATEGORY_DISPLAY),
  ].join(" ");

  it("does not expose the rule library version number", () => {
    expect(frontFacing).not.toContain("policy-risk-rules-v1.1");
    expect(frontFacing).not.toContain(POLICY_RULES_VERSION);
  });

  it("does not expose the concrete update date", () => {
    expect(frontFacing).not.toContain("2026-06-27");
  });

  it("does not expose rule / keyword counts", () => {
    expect(frontFacing).not.toContain("11 条规则");
    expect(frontFacing).not.toContain("条规则");
    expect(frontFacing).not.toContain("风险关键词");
    expect(frontFacing).not.toContain("个关键词");
  });

  it("does not show crawler / not-connected negative technical phrasing", () => {
    expect(frontFacing).not.toContain("不做爬虫");
    expect(frontFacing).not.toContain("官方实时接口：未接入");
    expect(frontFacing).not.toContain("平台实时审核数据：未接入");
    expect(frontFacing).not.toContain("未接入");
  });

  it("shows the productized title and self-check / manual review wording", () => {
    expect(POLICY_REGISTRY_TITLE).toBe("政策来源与合规规则说明");
    expect(POLICY_REGISTRY_DISCLAIMER).toContain("发布前合规自检");
    expect(POLICY_REGISTRY_DISCLAIMER).toContain("人工复核");
    expect(POLICY_REGISTRY_FLOW).toContain("人工复核");
  });

  it("shows the 10 productized risk categories", () => {
    expect(POLICY_RISK_CATEGORY_DISPLAY.length).toBe(10);
    expect(POLICY_RISK_CATEGORY_DISPLAY).toContain("绝对化宣传风险");
    expect(POLICY_RISK_CATEGORY_DISPLAY).toContain("金融收益承诺风险");
    expect(POLICY_RISK_CATEGORY_DISPLAY).toContain("品牌侵权 / 仿冒风险");
  });

  it("shows productized source groups with name/type/coverage/status only", () => {
    expect(POLICY_SOURCE_GROUPS.length).toBe(4);
    POLICY_SOURCE_GROUPS.forEach((group) => {
      expect(group.name).toBeTruthy();
      expect(group.type).toBeTruthy();
      expect(group.coverage).toBeTruthy();
      expect(group.status).toBeTruthy();
      expect(group).not.toHaveProperty("url");
      expect(group).not.toHaveProperty("sourceId");
      expect(group).not.toHaveProperty("lastCheckedAt");
    });
  });
});
