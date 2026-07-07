import { buildInitialMessages, getAgentModelConfig, planNextAgentStep } from "./agentPlanner.js";
import { buildAgentHistorySummary, buildAgentMemoryContext } from "./agentMemoryService.js";
import { summarizeContentTestPlan, summarizeSupplierChecklist } from "./agentSupplierContentService.js";
import { executeAgentTool } from "./agentToolRegistry.js";
import {
  MAX_TOOL_ROUNDS,
  isAllowedTool,
  normalizeAgentStatus,
  publicTraceEntry,
  removeForbiddenActions,
  sanitizePendingApproval,
  sanitizeVisibleList,
  sanitizeVisibleText,
  assertAllowedApprovalAction,
} from "./agentGuardrails.js";
import {
  AGENT_STATUS,
  asArray,
  asObject,
  normalizeAgentInput,
  pickNumber,
  text,
} from "./agentSchemas.js";
import {
  buildPublicSessionResponse,
  buildSnapshotRequiredResponse,
  createAgentSession,
  getAgentSession,
  mergeSessionPatch,
  restoreAgentSession,
  saveAgentSession,
  serializeAgentSession,
} from "./agentStateStore.js";

const BLOCKING_MISSING_FIELDS = new Set(["name", "price", "cost", "moq"]);

function parseToolArguments(rawArguments) {
  if (!rawArguments) return {};
  if (typeof rawArguments === "object") return rawArguments;
  try {
    return JSON.parse(rawArguments);
  } catch (error) {
    return {};
  }
}

function sanitizeToolCallForMessage(toolCall = {}) {
  const source = asObject(toolCall);
  const func = asObject(source.function);
  return {
    ...source,
    function: {
      ...func,
      arguments: JSON.stringify(parseToolArguments(func.arguments)),
    },
  };
}

function parseFinalJson(content) {
  const cleaned = String(content || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  if (!cleaned) return {};

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    return {
      status: AGENT_STATUS.COMPLETED,
      missingFields: [],
      pendingApproval: null,
      recommendation: {
        decision: "谨慎小批量验证",
        summary: cleaned,
        confidence: "medium",
        rationale: [],
      },
      nextActions: [],
    };
  }
}

function withComputedHistorySummary(rawInput = {}, existingSummary = {}) {
  const source = asObject(rawInput);
  const shouldCompute =
    Object.prototype.hasOwnProperty.call(source, "historyRecords") ||
    Object.prototype.hasOwnProperty.call(source, "historySummary") ||
    Object.prototype.hasOwnProperty.call(source, "review") ||
    Object.prototype.hasOwnProperty.call(source, "currentReview");

  if (!shouldCompute) {
    return {
      ...source,
      historySummary: asObject(existingSummary),
    };
  }

  return {
    ...source,
    historySummary: {
      ...asObject(existingSummary),
      ...buildAgentHistorySummary(source),
    },
  };
}

function getSessionContext(session, runtimeContext = {}) {
  return {
    goal: text(session.goal),
    product: asObject(session.product),
    result: asObject(session.result),
    marketEvidence: asObject(session.marketEvidence),
    historySummary: asObject(session.historySummary),
    historyRecords: asArray(runtimeContext.historyRecords),
    currentReview: asObject(runtimeContext.currentReview),
  };
}

function getInputMissingFields(context) {
  const product = asObject(context.product);
  const result = asObject(context.result);
  const missing = [];

  if (!text(product.name)) missing.push("name");
  if (!pickNumber(product.price, result.effectivePrice?.price, result.price)) missing.push("price");
  if (!pickNumber(product.cost, result.unitCost, result.effectivePrice?.cost)) missing.push("cost");
  if (!pickNumber(product.moq, result.moq)) missing.push("moq");

  return missing;
}

function collectTraceMissingFields(trace = []) {
  return [...new Set(trace.flatMap((entry) => asArray(entry.missingFields)))];
}

function blockingMissingFields(fields = []) {
  return asArray(fields).filter((field) => BLOCKING_MISSING_FIELDS.has(field));
}

function goalIncludesAny(goal, keywords = []) {
  const normalizedGoal = text(goal).toLowerCase();
  return keywords.some((keyword) => normalizedGoal.includes(keyword));
}

function traceHasTool(session, toolName) {
  return asArray(session.trace).some((entry) => entry?.toolName === toolName);
}

function getExplicitToolReminder(session, context) {
  const blockingFields = blockingMissingFields(getInputMissingFields(context));
  if (blockingFields.length) return "";

  const reminders = [];
  const supplierContactNegated = goalIncludesAny(context.goal, [
    "\u4e0d\u8981\u8054\u7cfb\u4f9b\u5e94\u5546",
    "\u4e0d\u8054\u7cfb\u4f9b\u5e94\u5546",
    "\u65e0\u9700\u8054\u7cfb\u4f9b\u5e94\u5546",
  ]);
  const supplierPlanningRequested =
    goalIncludesAny(context.goal, [
      "checklist",
      "negotiation",
      "moq",
      "sampling",
      "package",
      "shipping",
      "delivery",
      "after-sales",
      "after sales",
      "\u6e05\u5355",
      "\u6c9f\u901a",
      "\u8c08\u5224",
      "\u8d77\u8ba2",
      "\u62ff\u6837",
      "\u5305\u88c5",
      "\u7269\u6d41",
      "\u4ea4\u671f",
      "\u552e\u540e",
    ]) ||
    (!supplierContactNegated && goalIncludesAny(context.goal, ["supplier", "\u4f9b\u5e94\u5546"]));
  const contentPlanningRequested = goalIncludesAny(context.goal, [
    "content",
    "test plan",
    "xiahongshu",
    "xiaohongshu",
    "douyin",
    "video",
    "hook",
    "shooting",
    "metric",
    "\u5185\u5bb9",
    "\u6d4b\u6b3e",
    "\u5c0f\u7ea2\u4e66",
    "\u6296\u97f3",
    "\u77ed\u89c6\u9891",
    "\u79cd\u8349",
    "\u811a\u672c",
    "\u62cd\u6444",
    "\u6307\u6807",
  ]);

  if (!traceHasTool(session, "generate_supplier_checklist") && supplierPlanningRequested) {
    reminders.push("generate_supplier_checklist");
  }

  if (!traceHasTool(session, "generate_content_test_plan") && contentPlanningRequested) {
    reminders.push("generate_content_test_plan");
  }

  if (
    !traceHasTool(session, "generate_supplier_checklist") &&
    goalIncludesAny(context.goal, [
      "supplier",
      "checklist",
      "negotiation",
      "moq",
      "sampling",
      "package",
      "shipping",
      "delivery",
      "after-sales",
      "after sales",
      "供应商",
      "清单",
      "沟通",
      "谈判",
      "起订",
      "拿样",
      "包装",
      "物流",
      "交期",
      "售后",
    ])
  ) {
    reminders.push("generate_supplier_checklist");
  }

  if (
    !traceHasTool(session, "generate_content_test_plan") &&
    goalIncludesAny(context.goal, [
      "content",
      "test plan",
      "xiahongshu",
      "xiaohongshu",
      "douyin",
      "video",
      "hook",
      "shooting",
      "metric",
      "内容",
      "测款",
      "小红书",
      "抖音",
      "短视频",
      "种草",
      "脚本",
      "拍摄",
      "指标",
    ])
  ) {
    reminders.push("generate_content_test_plan");
  }

  const uniqueReminders = [...new Set(reminders)];
  if (!uniqueReminders.length) return "";

  return [
    "The user's explicit goal requires these planning tools before final JSON:",
    uniqueReminders.join(", "),
    "Return real tool_calls for the missing tools now if they are still safe and useful. Do not invent observations.",
  ].join(" ");
}

function normalizeRecommendation(value = {}, status) {
  const source = asObject(value);
  const rationale = sanitizeVisibleList(source.rationale, [
    "建议以当前规则报告、利润测算和风险提示为主，先做小范围验证。",
  ]);

  return {
    decision: sanitizeVisibleText(
      source.decision,
      status === AGENT_STATUS.AWAITING_INPUT ? "需要补充关键信息" : "谨慎小批量验证"
    ),
    summary: sanitizeVisibleText(
      source.summary,
      status === AGENT_STATUS.AWAITING_INPUT
        ? "当前仍缺少关键字段，补齐后再继续判断是否适合拿样。"
        : "当前可以先按小批量、可复盘的方式验证，不建议直接扩大进货。"
    ),
    confidence: ["low", "medium", "high"].includes(source.confidence) ? source.confidence : "medium",
    rationale,
  };
}

function normalizeNextActions(items, status) {
  const cleaned = removeForbiddenActions(items);
  if (cleaned.length) return cleaned;
  if (status === AGENT_STATUS.AWAITING_INPUT) {
    return ["补充缺失字段后继续 Agent 分析。"];
  }
  if (status === AGENT_STATUS.AWAITING_APPROVAL) {
    return ["确认后由前端调用原有保存逻辑，不由 Agent 自动写入产品库。"];
  }
  return ["先拿样或小批量验证，再根据真实反馈决定是否补货。"];
}

function buildResponseFromSession(session) {
  const saved = saveAgentSession(session);
  return {
    ok: true,
    status: saved.status,
    sessionId: saved.sessionId,
    trace: saved.trace.map(publicTraceEntry),
    missingFields: saved.missingFields,
    pendingApproval: saved.pendingApproval,
    recommendation: saved.recommendation,
    nextActions: saved.nextActions,
    sessionSnapshot: saved,
  };
}

function applyFinalPayloadToSession(session, finalPayload, basicMissingFields = []) {
  const traceMissingFields = collectTraceMissingFields(session.trace);
  const currentBlockingMissing = new Set(blockingMissingFields(basicMissingFields));
  const missingFields = [...new Set([
    ...asArray(finalPayload.missingFields),
    ...traceMissingFields,
    ...basicMissingFields,
  ].filter((field) => {
    return !BLOCKING_MISSING_FIELDS.has(field) || currentBlockingMissing.has(field);
  }))];
  const pendingApproval = sanitizePendingApproval(finalPayload.pendingApproval);
  const blockingFields = blockingMissingFields(missingFields);
  const normalizedStatusInput =
    finalPayload.status === AGENT_STATUS.AWAITING_INPUT && !blockingFields.length
      ? AGENT_STATUS.COMPLETED
      : finalPayload.status;
  const status = normalizeAgentStatus(
    normalizedStatusInput,
    blockingFields,
    pendingApproval
  );

  return {
    ...session,
    status,
    missingFields,
    pendingApproval: status === AGENT_STATUS.AWAITING_APPROVAL ? pendingApproval : null,
    recommendation: normalizeRecommendation(finalPayload.recommendation, status),
    nextActions: normalizeNextActions(finalPayload.nextActions, status),
  };
}

function buildBasicAdviceSession(session, reason = "", runtimeContext = {}) {
  const context = getSessionContext(session, runtimeContext);
  const missingFields = getInputMissingFields(context);
  const hasMoq = !missingFields.includes("moq");
  const result = asObject(context.result);
  const profitText = Number.isFinite(Number(result.profit)) && Number(result.profit) > 0
    ? `当前单件利润约 ¥${Number(result.profit).toFixed(2)}。`
    : "当前利润信息仍需结合售价和成本确认。";
  const summary = hasMoq
    ? `${profitText} 建议继续按小批量拿样、人工核实市场证据和供应商条件推进。`
    : "当前缺少 MOQ，暂不判断首批压货资金；请先补充 MOQ 后再继续。";

  if (reason) console.warn("[agent-runtime] using basic advice:", reason);

  return {
    ...session,
    status: hasMoq ? AGENT_STATUS.BASIC_ADVICE : AGENT_STATUS.AWAITING_INPUT,
    missingFields,
    pendingApproval: null,
    recommendation: {
      decision: hasMoq ? "谨慎小批量验证" : "需要补充 MOQ",
      summary,
      confidence: "low",
      rationale: [
        "基础报告仍然可用，Agent 建议不覆盖原评分结论。",
        "没有完整字段时，不推断压货资金或扩大进货建议。",
      ],
    },
    nextActions: hasMoq
      ? ["人工核实竞品价格、供应商补货条件和物流包装成本。"]
      : ["补充 MOQ 后继续 Agent 分析。"],
  };
}

function buildToolTraceEntry(toolCall, toolResult) {
  return {
    id: toolCall.id || `${toolResult.toolName}-${Date.now()}`,
    toolName: toolResult.toolName,
    toolLabel: toolResult.toolLabel,
    status: toolResult.status || "completed",
    summary: toolResult.summary || "",
    missingFields: toolResult.missingFields || [],
    observation: toolResult.observation || {},
    createdAt: new Date().toISOString(),
  };
}

function applyToolSummaryToSession(session, toolResult) {
  if (toolResult.toolName === "generate_supplier_checklist") {
    return {
      ...session,
      supplierChecklistSummary: summarizeSupplierChecklist(toolResult.observation),
    };
  }

  if (toolResult.toolName === "generate_content_test_plan") {
    return {
      ...session,
      contentTestPlanSummary: summarizeContentTestPlan(toolResult.observation),
    };
  }

  return session;
}

async function continueAgentLoop(rawSession, runtimeContext = {}) {
  const config = getAgentModelConfig();
  let session = serializeAgentSession(rawSession);

  if (!config.apiKey) {
    return buildResponseFromSession(buildBasicAdviceSession(session, "missing_api_key", runtimeContext));
  }

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const context = getSessionContext(session, runtimeContext);
      const assistantMessage = await planNextAgentStep(session.messages, config);
      const toolCalls = asArray(assistantMessage.tool_calls).map(sanitizeToolCallForMessage);

      if (!toolCalls.length) {
        const explicitToolReminder = getExplicitToolReminder(session, context);
        if (explicitToolReminder && round < MAX_TOOL_ROUNDS) {
          session = {
            ...session,
            messages: [
              ...asArray(session.messages),
              {
                role: "assistant",
                content: assistantMessage.content || "",
              },
              {
                role: "user",
                content: JSON.stringify({
                  event: "explicit_tool_required_before_final",
                  instruction: explicitToolReminder,
                }),
              },
            ],
          };
          continue;
        }

        const finalPayload = parseFinalJson(assistantMessage.content);
        session = {
          ...session,
          messages: [
            ...asArray(session.messages),
            {
              role: "assistant",
              content: assistantMessage.content || JSON.stringify(finalPayload),
            },
          ],
        };
        session = applyFinalPayloadToSession(session, finalPayload, getInputMissingFields(context));
        return buildResponseFromSession(session);
      }

      if (round >= MAX_TOOL_ROUNDS) {
        return buildResponseFromSession(buildBasicAdviceSession(session, "max_tool_rounds", runtimeContext));
      }

      session = {
        ...session,
        messages: [
          ...asArray(session.messages),
          {
            role: "assistant",
            content: assistantMessage.content || "",
            tool_calls: toolCalls,
          },
        ],
      };

      for (const toolCall of toolCalls) {
        const toolName = toolCall?.function?.name || "";
        const toolCallId = toolCall?.id || `${toolName}-${Date.now()}`;

        if (!isAllowedTool(toolName)) {
          const blockedResult = {
            ok: false,
            toolName,
            toolLabel: toolName || "未授权工具",
            status: "blocked",
            missingFields: [],
            summary: "该动作不在本轮允许范围内，已停止执行。",
            observation: { reason: "tool_not_allowed" },
          };
          session.trace = [
            ...asArray(session.trace),
            buildToolTraceEntry({ id: toolCallId }, blockedResult),
          ];
          session.messages = [
            ...asArray(session.messages),
            {
              role: "tool",
              tool_call_id: toolCallId,
              content: JSON.stringify(blockedResult),
            },
          ];
          continue;
        }

        const args = parseToolArguments(toolCall?.function?.arguments);
        const toolResult = executeAgentTool(toolName, args, context);
        session = applyToolSummaryToSession(session, toolResult);
        session.trace = [
          ...asArray(session.trace),
          buildToolTraceEntry({ id: toolCallId }, toolResult),
        ];
        session.messages = [
          ...asArray(session.messages),
          {
            role: "tool",
            tool_call_id: toolCallId,
            content: JSON.stringify(toolResult),
          },
        ];
      }
    }
  } catch (error) {
    console.warn("[agent-runtime] planner failed:", error?.message || error);
    return buildResponseFromSession(buildBasicAdviceSession(session, "planner_failed", runtimeContext));
  }

  return buildResponseFromSession(buildBasicAdviceSession(session, "loop_exited", runtimeContext));
}

export async function runAgent(rawInput = {}) {
  const runtimeContext = buildAgentMemoryContext(rawInput);
  const inputWithHistory = withComputedHistorySummary(rawInput);
  const context = normalizeAgentInput(inputWithHistory);
  const messages = buildInitialMessages(context);
  const session = createAgentSession(inputWithHistory, messages);
  return continueAgentLoop(session, runtimeContext);
}

export async function resumeAgent(rawInput = {}) {
  const body = asObject(rawInput);
  const restored = restoreAgentSession({
    sessionId: body.sessionId,
    sessionSnapshot: body.sessionSnapshot,
  });

  if (!restored.session) {
    return buildSnapshotRequiredResponse(body.sessionId);
  }

  const runtimeContext = buildAgentMemoryContext(body);
  const patchWithHistory = withComputedHistorySummary(body, restored.session.historySummary);
  const patchedSession = mergeSessionPatch(restored.session, {
    ...asObject(body.patch),
    historySummary: patchWithHistory.historySummary,
  });
  const resumeMessage = {
    role: "user",
    content: JSON.stringify({
      event: "user_supplied_missing_fields",
      instruction: "Continue the same Agent session. Do not restart. Preserve existing trace and only append real new tool observations.",
      patch: asObject(body.patch),
    }),
  };

  const session = saveAgentSession({
    ...patchedSession,
    status: AGENT_STATUS.COMPLETED,
    missingFields: [],
    pendingApproval: null,
    messages: [
      ...asArray(patchedSession.messages),
      resumeMessage,
    ],
  });

  const response = await continueAgentLoop(session, runtimeContext);
  return {
    ...response,
    restoredFrom: restored.source,
  };
}

export async function approveAgent(rawInput = {}) {
  const body = asObject(rawInput);
  const action = text(body.action || asObject(body.pendingApproval).action);
  assertAllowedApprovalAction(action);

  const restored = restoreAgentSession({
    sessionId: body.sessionId,
    sessionSnapshot: body.sessionSnapshot,
  });

  if (!restored.session) {
    return buildSnapshotRequiredResponse(body.sessionId);
  }

  const pendingApproval = sanitizePendingApproval(restored.session.pendingApproval || body.pendingApproval);
  if (!pendingApproval || pendingApproval.action !== action) {
    return {
      ok: false,
      status: "approval_not_ready",
      sessionId: restored.session.sessionId,
      message: "当前没有可确认的候选保存动作。",
      sessionSnapshot: restored.session,
    };
  }

  const session = saveAgentSession({
    ...restored.session,
    status: AGENT_STATUS.COMPLETED,
    pendingApproval: null,
    nextActions: ["用户已确认，前端现在可以调用原有保存逻辑。"],
    messages: [
      ...asArray(restored.session.messages),
      {
        role: "user",
        content: JSON.stringify({
          event: "approval_confirmed",
          action,
          note: "Server recorded confirmation only. Product library write must be performed by the existing frontend save flow.",
        }),
      },
    ],
  });

  return {
    ok: true,
    status: "approved",
    sessionId: session.sessionId,
    approvedAction: pendingApproval,
    shouldSaveCandidateDraft: action === "save_candidate_draft",
    message: "已确认，前端现在可以调用原有保存逻辑。",
    sessionSnapshot: session,
    restoredFrom: restored.source,
  };
}

export function getAgentSessionResponse(sessionId) {
  const session = getAgentSession(sessionId);
  if (!session) {
    return buildSnapshotRequiredResponse(sessionId);
  }

  return buildPublicSessionResponse(session, {
    status: session.status,
    sessionId: session.sessionId,
  });
}
