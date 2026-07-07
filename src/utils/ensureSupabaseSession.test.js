import { describe, it, expect } from "vitest";
import {
  ensureSupabaseSession,
  NO_CLOUD_SESSION_MESSAGE,
  ANONYMOUS_SIGN_IN_FAILED_MESSAGE,
} from "../services/productStorage";

// ensureSupabaseSession 在“已配置 / 未配置 Supabase”两种环境下都应安全返回，
// 不抛错、不破坏本地模式。这里只校验契约（返回结构 + 文案），不依赖具体网络结果。
describe("ensureSupabaseSession（匿名会话兜底）", () => {
  it("始终安全返回结构化结果，不抛错", async () => {
    const result = await ensureSupabaseSession();
    expect(result).toBeTypeOf("object");
    expect(result).toHaveProperty("session");
    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("warning");
    // 有会话时 user 为对象；无会话/未配置时 user 为 null，但都不应抛错。
    expect(result.user === null || typeof result.user === "object").toBe(true);
    if (!result.user) {
      expect(typeof result.warning).toBe("string");
      expect(result.warning.length).toBeGreaterThan(0);
    }
  });

  it("导出了中文文案常量，且不含英文 Auth session missing", () => {
    expect(NO_CLOUD_SESSION_MESSAGE).toContain("匿名云端会话");
    expect(NO_CLOUD_SESSION_MESSAGE).not.toContain("Auth session missing");
    expect(ANONYMOUS_SIGN_IN_FAILED_MESSAGE).toContain("Anonymous Sign-ins");
  });
});
