import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Bot, Check, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Copy, Film, Loader2, PauseCircle, PlayCircle, RefreshCw, Save } from "lucide-react";
import {
  approveAgentAction,
  buildAgentProductKey,
  getServerAgentSession,
  loadLatestAgentSessionSnapshot,
  resumeTradePilotAgent,
  runTradePilotAgent,
  toAgentResultFromSnapshot,
} from "../utils/agentClient";
import {
  BASE_SUPPLIER_QUESTIONS,
  CONTENT_PENDING_HINT,
  CONTENT_PENDING_TEXT,
  SUPPLIER_PENDING_TEXT,
  buildControlledPauseNote,
  buildDecisionDisplay,
  buildTraceEmptyMessage,
  getAgentStatusDisplay,
  getMissingFieldLabel,
  sanitizeAgentDisplayList,
  sanitizeAgentDisplayText,
} from "../utils/agentDisplay";

const confidenceText = {
  low: "低",
  medium: "中",
  high: "高",
};

const evidenceLevelText = {
  none: "暂无",
  limited: "有限",
  moderate: "中等",
  strong: "较强",
};

const fieldInputType = {
  price: "number",
  sellingPrice: "number",
  cost: "number",
  costPrice: "number",
  moq: "number",
  competitorPrice: "number",
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function formatPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  return `${parsed.toFixed(1)}%`;
}

function fallbackCopyText(text) {
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function joinSection(title, items = []) {
  const safeItems = asArray(items).filter(Boolean);
  if (!safeItems.length) return "";
  return `${title}\n${safeItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}`;
}

function buildSupplierCopyText(observation = {}) {
  const source = asObject(observation);
  return [
    source.summary,
    joinSection("沟通清单", source.inquiryChecklist),
    joinSection("风险提醒", source.riskReminders),
    ...asArray(source.copyBlocks).map((block) => `${block.title}\n${block.content}`),
  ].filter(Boolean).join("\n\n");
}

function buildContentCopyText(observation = {}) {
  const source = asObject(observation);
  const xhs = asObject(source.xiaohongshu);
  const douyin = asObject(source.douyin);
  return [
    source.summary,
    joinSection("小红书内容角度", xhs.contentAngles),
    joinSection("小红书封面方向", xhs.coverIdeas),
    joinSection("小红书标题方向", xhs.titleIdeas),
    joinSection("抖音前三秒钩子", douyin.openingAngles),
    joinSection("抖音脚本方向", douyin.scriptDirections),
    joinSection("拍摄建议", douyin.shootingTips),
    joinSection("首轮观察指标", xhs.testMetrics || douyin.testMetrics),
    joinSection("下一步", source.nextActions),
  ].filter(Boolean).join("\n\n");
}

function normalizePatchValue(field, value) {
  if (fieldInputType[field] === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : value;
  }
  return value;
}

function buildHistorySummary(records = [], reviewRecords = []) {
  return {
    recordCount: asArray(records).length,
    reviewRecordCount: asArray(reviewRecords).length,
    latestRecords: asArray(records)
      .slice(0, 5)
      .map((record) => ({
        productName: record?.product?.name || record?.product_name || "",
        category: record?.product?.category || record?.category || "",
        score: record?.score || record?.result?.totalScore || 0,
        status: record?.advice || record?.result?.status || "",
      })),
  };
}

export default function AgentDecisionPanel({
  product,
  result,
  marketEvidence,
  records,
  reviewRecords,
  reviewData,
  analyzed,
  onConfirmCandidateSave,
}) {
  const [agentResult, setAgentResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedAgentBlock, setCopiedAgentBlock] = useState("");
  const [resumeValues, setResumeValues] = useState({});
  const [traceOpen, setTraceOpen] = useState(false);
  const historySummary = useMemo(
    () => buildHistorySummary(records, reviewRecords),
    [records, reviewRecords]
  );
  const productSessionKey = useMemo(
    () => buildAgentProductKey({ product, result }),
    [product, result]
  );
  const recommendation = asObject(agentResult?.recommendation);
  const trace = asArray(agentResult?.trace);
  const missingFields = asArray(agentResult?.missingFields);
  const nextActions = asArray(agentResult?.nextActions);
  const pendingApproval = asObject(agentResult?.pendingApproval);
  const sessionSnapshot = asObject(agentResult?.sessionSnapshot);
  const memoryTrace = trace.find((entry) => entry?.toolName === "retrieve_user_memory");
  const supplierTrace = trace.find((entry) => entry?.toolName === "generate_supplier_checklist");
  const contentTrace = trace.find((entry) => entry?.toolName === "generate_content_test_plan");
  const memoryObservation = asObject(memoryTrace?.observation);
  const supplierObservation = asObject(supplierTrace?.observation);
  const contentObservation = asObject(contentTrace?.observation);
  const memoryNotes = sanitizeAgentDisplayList(memoryObservation.recommendationNotes);
  const memoryPatterns = sanitizeAgentDisplayList(memoryObservation.successfulPatterns);
  const memoryChannels = asArray(memoryObservation.preferredChannels);
  const memoryRisks = sanitizeAgentDisplayList(memoryObservation.commonRisks);
  const reviewMetricsSummary = asObject(memoryObservation.reviewMetricsSummary);
  const canRun = analyzed && result && typeof result === "object";
  const canResume = canRun && agentResult?.status === "awaiting_input" && agentResult?.sessionId;
  const canApprove = canRun && agentResult?.status === "awaiting_approval" && pendingApproval.action;

  const status = agentResult?.status || "";
  const statusDisplay = getAgentStatusDisplay(status);
  const decisionDisplay = useMemo(
    () => buildDecisionDisplay({ status, missingFields, recommendation }),
    [status, missingFields.join("|"), recommendation]
  );

  useEffect(() => {
    if (!canRun || !productSessionKey) return undefined;

    let cancelled = false;
    const snapshot = loadLatestAgentSessionSnapshot({ product, result });
    const restoredResult = toAgentResultFromSnapshot(snapshot);

    if (restoredResult) {
      setAgentResult(restoredResult);
      setMessage("已从本浏览器恢复上一次 Agent session，可继续补充信息。");

      getServerAgentSession(restoredResult.sessionId).then((serverSession) => {
        if (cancelled) return;
        const latest = serverSession?.ok
          ? toAgentResultFromSnapshot(serverSession.sessionSnapshot)
          : null;
        if (latest) {
          setAgentResult(latest);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [canRun, productSessionKey, product, result]);

  useEffect(() => {
    if (!missingFields.length) return;
    setResumeValues((current) => {
      const next = { ...current };
      missingFields.forEach((field) => {
        if (!(field in next)) next[field] = "";
      });
      return next;
    });
  }, [missingFields.join("|")]);

  async function handleRunAgent() {
    if (!canRun) {
      setMessage("请先生成正式进货报告，再运行 Agent 分析。");
      return;
    }

    setLoading(true);
    setMessage("");
    const data = await runTradePilotAgent({
      product,
      result,
      marketEvidence,
      historySummary,
      historyRecords: records,
      review: reviewData,
    });
    setAgentResult(data);
    setLoading(false);
  }

  async function handleResumeAgent() {
    if (!canResume) return;

    const productPatch = {};
    missingFields.forEach((field) => {
      const value = resumeValues[field];
      if (String(value ?? "").trim()) {
        productPatch[field] = normalizePatchValue(field, value);
      }
    });

    if (!Object.keys(productPatch).length) {
      setMessage("请先补充缺失信息，再继续分析。");
      return;
    }

    setLoading(true);
    setMessage("");
    const data = await resumeTradePilotAgent({
      sessionId: agentResult.sessionId,
      sessionSnapshot,
      patch: {
        product: productPatch,
      },
      product,
      result,
      historyRecords: records,
      review: reviewData,
    });
    setAgentResult(data);
    setLoading(false);
  }

  async function handleApproveCandidate() {
    if (!canApprove) return;

    setApprovalLoading(true);
    setMessage("");
    const approval = await approveAgentAction({
      sessionId: agentResult.sessionId,
      sessionSnapshot,
      pendingApproval,
    });

    if (!approval?.ok || !approval.shouldSaveCandidateDraft) {
      setApprovalLoading(false);
      setMessage(approval?.message || "当前没有可确认的候选保存动作。");
      return;
    }

    const approvedSnapshot = toAgentResultFromSnapshot(approval.sessionSnapshot);
    if (approvedSnapshot) {
      setAgentResult(approvedSnapshot);
    }

    try {
      await onConfirmCandidateSave?.();
      setMessage("已确认，并通过原有保存逻辑保存为候选记录。");
    } catch (error) {
      setMessage("已确认，但保存时遇到问题，请使用下方原有保存按钮重试。");
    } finally {
      setApprovalLoading(false);
    }
  }

  async function handleCopyAgentBlock(label, content) {
    if (!content) return;
    let ok = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        ok = true;
      } else {
        ok = fallbackCopyText(content);
      }
    } catch (error) {
      ok = fallbackCopyText(content);
    }

    setCopiedAgentBlock(ok ? label : "");
    setMessage(ok ? `已复制：${label}` : "复制失败，请手动选择文本复制。");
    const timer = typeof window !== "undefined" ? window.setTimeout : setTimeout;
    timer(() => {
      setCopiedAgentBlock("");
      setMessage("");
    }, 1500);
  }

  const isAwaitingInput = status === "awaiting_input";
  const showControlledPause = isAwaitingInput && trace.length === 0;

  return (
    <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-cyan-200">
            <Bot className="h-4 w-4" aria-hidden="true" />
            受控决策助手
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">TradePilot Agent 受控决策</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Agent 会基于当前商品信息、利润测算、风险规则和测款目标给出下一步建议；如关键信息不足，会先请求人工补充，而不是直接替用户下结论。
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunAgent}
          disabled={loading || !canRun}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : agentResult ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : <PlayCircle className="h-4 w-4" aria-hidden="true" />}
          {loading ? "Agent 分析中" : agentResult ? "重新运行 Agent" : "运行受控 Agent"}
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm font-bold text-amber-100">
          {message}
        </p>
      )}

      {agentResult && (
        <div className="mt-5 space-y-4">
          {/* 1. 顶部状态卡 */}
          <div
            className={`rounded-3xl border p-5 ${
              statusDisplay.tone === "warn"
                ? "border-amber-300/25 bg-amber-300/10"
                : "border-emerald-300/20 bg-emerald-300/10"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-black ${
                  statusDisplay.tone === "warn"
                    ? "bg-amber-300/20 text-amber-100"
                    : "bg-emerald-300/20 text-emerald-100"
                }`}
              >
                {statusDisplay.tone === "warn" ? (
                  <PauseCircle className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                状态：{statusDisplay.label}
              </span>
              <span className="text-xs font-bold text-slate-300">
                可信度：{confidenceText[recommendation.confidence] || "中"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-200">{statusDisplay.detail}</p>
            {showControlledPause && (
              <p className="mt-3 rounded-2xl border border-amber-200/20 bg-black/20 p-3 text-sm leading-7 text-amber-100">
                {buildControlledPauseNote()}
              </p>
            )}
          </div>

          {/* 2. 决策摘要卡 */}
          <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <p className="text-sm font-black text-cyan-100">{decisionDisplay.title}</p>
            <p className="mt-2 text-sm leading-7 text-slate-200">{decisionDisplay.body}</p>
            {decisionDisplay.points.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {decisionDisplay.points.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            )}
          </div>

          {/* 3. 待补充信息卡 */}
          {missingFields.length > 0 && (
            <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
              <p className="flex items-center gap-2 text-sm font-black text-amber-100">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                待补充信息
              </p>
              <p className="mt-2 text-xs leading-6 text-amber-50/80">
                补齐以下信息后，Agent 才会继续判断利润空间与压货风险。
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {missingFields.map((field) => (
                  <label key={field} className="block">
                    <span className="text-xs font-bold text-amber-50">{getMissingFieldLabel(field)}</span>
                    <input
                      type={fieldInputType[field] || "text"}
                      min={fieldInputType[field] === "number" ? "0" : undefined}
                      step={fieldInputType[field] === "number" ? "1" : undefined}
                      value={resumeValues[field] || ""}
                      onChange={(event) => setResumeValues((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))}
                      className="mt-2 min-h-11 w-full rounded-2xl border border-amber-200/20 bg-black/25 px-4 py-2 text-sm font-bold text-white outline-none focus:border-amber-200/60"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={handleResumeAgent}
                disabled={loading || !canResume}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                继续分析
              </button>
            </div>
          )}

          {/* 历史记忆参考（结构化中文，可选） */}
          {memoryTrace && (
            <div className="rounded-3xl border border-sky-300/20 bg-sky-300/10 p-5">
              <p className="flex items-center gap-2 text-sm font-black text-sky-100">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                历史记忆参考
              </p>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-200">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold text-slate-400">相似记录</p>
                    <p className="mt-1 font-black text-white">{memoryObservation.similarRecordCount || 0} 条</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold text-slate-400">证据等级</p>
                    <p className="mt-1 font-black text-white">{evidenceLevelText[memoryObservation.evidenceLevel] || "有限"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold text-slate-400">历史价格带</p>
                    <p className="mt-1 font-black text-white">{memoryObservation.commonPriceRange || "待积累"}</p>
                  </div>
                </div>

                {memoryChannels.length > 0 && (
                  <p className="text-sky-50">常见渠道：{memoryChannels.slice(0, 3).join("、")}</p>
                )}
                {reviewMetricsSummary.reviewRecordCount > 0 && (
                  <p className="text-sky-50">
                    复盘样本：{reviewMetricsSummary.reviewRecordCount} 条；平均互动率 {formatPercent(reviewMetricsSummary.averageInteractionRate) || "待积累"}，
                    询单率 {formatPercent(reviewMetricsSummary.averageInquiryRate) || "待积累"}，
                    成交转化率 {formatPercent(reviewMetricsSummary.averageConversionRate) || "待积累"}。
                  </p>
                )}
                {memoryPatterns.length > 0 && (
                  <ul className="space-y-2 text-slate-200">
                    {memoryPatterns.slice(0, 4).map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                )}
                {memoryRisks.length > 0 && (
                  <p className="text-amber-100">常见风险：{memoryRisks.slice(0, 3).join("；")}</p>
                )}
                {memoryNotes.length > 0 && (
                  <div className="rounded-2xl border border-sky-200/20 bg-black/20 p-4 text-sky-50">
                    {memoryNotes.slice(0, 3).map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. 供应商沟通建议 */}
          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <p className="flex items-center gap-2 text-sm font-black text-emerald-100">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                供应商沟通建议
              </p>
              {supplierTrace && (
                <button
                  type="button"
                  onClick={() => handleCopyAgentBlock("供应商沟通建议", buildSupplierCopyText(supplierObservation))}
                  className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-200/25 bg-black/20 px-4 py-2 text-xs font-black text-emerald-100"
                >
                  {copiedAgentBlock === "供应商沟通建议" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {copiedAgentBlock === "供应商沟通建议" ? "已复制" : "复制"}
                </button>
              )}
            </div>
            {supplierTrace ? (
              <div className="mt-3 space-y-4 text-sm leading-7 text-emerald-50">
                <p>{sanitizeAgentDisplayText(supplierObservation.summary || supplierTrace.summary, "")}</p>
                {asArray(supplierObservation.inquiryChecklist).length > 0 && (
                  <div>
                    <p className="font-black text-emerald-100">沟通清单</p>
                    <ul className="mt-2 space-y-2">
                      {asArray(supplierObservation.inquiryChecklist).slice(0, 6).map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {asArray(supplierObservation.copyBlocks).length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {asArray(supplierObservation.copyBlocks).slice(0, 2).map((block) => (
                      <div key={block.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="font-black text-white">{block.title}</p>
                        <p className="mt-2 line-clamp-6 whitespace-pre-line text-slate-200">{block.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                {asArray(supplierObservation.riskReminders).length > 0 && (
                  <p className="rounded-2xl border border-amber-200/20 bg-black/20 p-4 text-amber-100">
                    风险提醒：{asArray(supplierObservation.riskReminders).slice(0, 3).join("；")}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-200">
                <p>{SUPPLIER_PENDING_TEXT}</p>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-black text-emerald-100">基础沟通问题</p>
                  <ul className="mt-2 space-y-2 text-slate-200">
                    {BASE_SUPPLIER_QUESTIONS.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* 5. 内容测款计划 */}
          <div className="rounded-3xl border border-violet-300/20 bg-violet-300/10 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <p className="flex items-center gap-2 text-sm font-black text-violet-100">
                <Film className="h-4 w-4" aria-hidden="true" />
                内容测款计划
              </p>
              {contentTrace && (
                <button
                  type="button"
                  onClick={() => handleCopyAgentBlock("内容测款计划", buildContentCopyText(contentObservation))}
                  className="inline-flex w-fit items-center gap-2 rounded-2xl border border-violet-200/25 bg-black/20 px-4 py-2 text-xs font-black text-violet-100"
                >
                  {copiedAgentBlock === "内容测款计划" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {copiedAgentBlock === "内容测款计划" ? "已复制" : "复制"}
                </button>
              )}
            </div>
            {contentTrace ? (
              <div className="mt-3 space-y-4 text-sm leading-7 text-violet-50">
                <p>{sanitizeAgentDisplayText(contentObservation.summary || contentTrace.summary, "")}</p>
                <p className="text-violet-100">{CONTENT_PENDING_HINT}</p>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="font-black text-white">小红书方向</p>
                    <ul className="mt-2 space-y-2 text-slate-200">
                      {asArray(asObject(contentObservation.xiaohongshu).contentAngles).slice(0, 3).map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="font-black text-white">抖音前三秒</p>
                    <ul className="mt-2 space-y-2 text-slate-200">
                      {asArray(asObject(contentObservation.douyin).openingAngles).slice(0, 3).map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {asArray(asObject(contentObservation.xiaohongshu).testMetrics).length > 0 && (
                  <p className="rounded-2xl border border-violet-200/20 bg-black/20 p-4">
                    首轮指标：{asArray(asObject(contentObservation.xiaohongshu).testMetrics).slice(0, 4).join("；")}
                  </p>
                )}
                {asArray(contentObservation.nextActions).length > 0 && (
                  <ul className="space-y-2 text-slate-200">
                    {asArray(contentObservation.nextActions).slice(0, 5).map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-2 text-sm leading-7 text-slate-200">
                <p>{CONTENT_PENDING_TEXT}</p>
                <p className="text-violet-100">{CONTENT_PENDING_HINT}</p>
              </div>
            )}
          </div>

          {canApprove && (
            <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
              <p className="text-sm font-black text-emerald-100">{sanitizeAgentDisplayText(pendingApproval.label, "保存为待拿样候选")}</p>
              <p className="mt-2 text-sm leading-7 text-emerald-50">
                {sanitizeAgentDisplayText(pendingApproval.reason, "当前利润空间尚可，建议进入候选池进一步比较。")}
              </p>
              <p className="mt-2 text-xs leading-6 text-emerald-100/80">
                未点击确认前不会写入产品库；确认后才调用原有保存逻辑。
              </p>
              <button
                type="button"
                onClick={handleApproveCandidate}
                disabled={approvalLoading}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {approvalLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                确认保存为待拿样候选
              </button>
            </div>
          )}

          {nextActions.length > 0 && sanitizeAgentDisplayList(nextActions).length > 0 && (
            <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
              <p className="text-sm font-black text-emerald-100">下一步</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-emerald-50">
                {sanitizeAgentDisplayList(nextActions).map((action) => (
                  <li key={action}>- {action}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 6. 服务端真实 trace（调试用），默认折叠 */}
          <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <button
              type="button"
              onClick={() => setTraceOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-2 text-left"
              aria-expanded={traceOpen}
            >
              <span className="text-sm font-black text-cyan-100">
                服务端真实 trace（调试用）
                <span className="ml-2 text-xs font-bold text-slate-400">{trace.length} 次工具调用</span>
              </span>
              {traceOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-300" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-300" aria-hidden="true" />
              )}
            </button>
            {traceOpen && (
              <div className="mt-4">
                {trace.length > 0 ? (
                  <div className="grid gap-3">
                    {trace.map((entry, index) => (
                      <div key={entry.id || `${entry.toolName}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                        <p className="flex items-center gap-2 text-sm font-black text-white">
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                          {entry.toolLabel || entry.toolName}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">状态：{entry.status || "completed"}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-300">{sanitizeAgentDisplayText(entry.summary, "已完成本步工具调用。")}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-slate-300">{buildTraceEmptyMessage(status)}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
