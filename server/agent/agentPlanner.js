import { agentTools } from "./agentToolRegistry.js";
import { summarizeCanonicalResult } from "./agentSchemas.js";

const DEFAULT_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const DEFAULT_MODEL = "qwen-plus";
const REQUEST_TIMEOUT_MS = 25000;

export function getAgentModelConfig() {
  return {
    apiKey:
      process.env.DASHSCOPE_API_KEY ||
      process.env.DASH_SCOPE_API_KEY ||
      process.env.ALIYUN_DASHSCOPE_API_KEY ||
      "",
    endpoint: process.env.DASHSCOPE_TEXT_ENDPOINT || DEFAULT_ENDPOINT,
    model:
      process.env.DASHSCOPE_AGENT_MODEL ||
      process.env.DASHSCOPE_TEXT_MODEL ||
      process.env.QWEN_TEXT_MODEL ||
      DEFAULT_MODEL,
  };
}

export function buildInitialMessages(context) {
  return [
    {
      role: "system",
      content: [
        "You are TradePilot Agent, a controlled semi-autonomous purchase decision assistant.",
        "You must decide which allowed tool to call next, then use the returned observations to continue reasoning.",
        "Allowed tools only: calculate_profit, assess_purchase_risk, inspect_market_evidence, retrieve_user_memory, generate_supplier_checklist, generate_content_test_plan.",
        "For profit and risk questions, prefer deterministic tools: calculate_profit and assess_purchase_risk.",
        "Call inspect_market_evidence when market evidence is present or missing evidence must be checked.",
        "When historySummary.recordCount or historySummary.reviewRecordCount is greater than 0, consider calling retrieve_user_memory to read real user history before final advice.",
        "When the user's goal explicitly asks about sampling, supplier negotiation, MOQ, packaging, shipping, delivery, or after-sales confirmation, call generate_supplier_checklist before the final JSON unless critical input is missing.",
        "When the user's goal explicitly asks about first-round content validation, Xiaohongshu angles, Douyin hooks, shooting guidance, or content test metrics, call generate_content_test_plan before the final JSON unless critical input is missing.",
        "When those topics are only indirect or minor, decide whether the supplier/content tools are useful instead of calling every tool.",
        "Do not call every tool automatically. Call a tool only when it helps the current goal.",
        "If retrieve_user_memory reports none or limited evidence, explicitly say the history sample is only an auxiliary reference.",
        "Never claim that a tool was called unless the server returned a tool observation.",
        "Never browse or access Taobao, 1688, Xiaohongshu, Douyin, or any external platform.",
        "Never place orders, pay, contact suppliers, send messages, publish content, save products, delete records, overwrite records, or modify the original score.",
        "Never invent supplier names, phone numbers, shops, certifications, delivery guarantees, platform plays, likes, saves, comments, inquiries, orders, sales, or heat metrics.",
        "If a product is worth keeping as a sample candidate, do not save it. Instead return status awaiting_approval with pendingApproval.action exactly save_candidate_draft.",
        "The only approval action allowed in this round is save_candidate_draft. High-risk actions are forbidden.",
        "Use the canonical result as the source of truth for score and report values. Do not recalculate the overall score.",
        "If critical fields are missing, return status awaiting_input with missingFields.",
        "Final answer must be strict JSON only, with keys: status, missingFields, pendingApproval, recommendation, nextActions.",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        goal: context.goal,
        product: context.product,
        canonicalResultSummary: summarizeCanonicalResult(context.result),
        marketEvidence: context.marketEvidence,
        historySummary: context.historySummary,
        requiredFinalJsonShape: {
          status: "completed | awaiting_input | awaiting_approval",
          missingFields: [],
          pendingApproval: {
            action: "save_candidate_draft",
            label: "保存为待拿样候选",
            reason: "当前利润空间尚可，建议进入候选池进一步比较。",
          },
          recommendation: {
            decision: "",
            summary: "",
            confidence: "low | medium | high",
            rationale: [],
          },
          nextActions: [],
        },
      }),
    },
  ];
}

async function postChatCompletion(messages, config) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages,
        tools: agentTools,
        tool_choice: "auto",
        temperature: 0.2,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error?.message || `agent_model_${response.status}`);
      error.statusCode = response.status;
      throw error;
    }

    return data?.choices?.[0]?.message || {};
  } finally {
    clearTimeout(timer);
  }
}

export async function planNextAgentStep(messages, config = getAgentModelConfig()) {
  if (!config.apiKey) {
    const error = new Error("agent_model_unavailable");
    error.statusCode = 200;
    throw error;
  }
  return postChatCompletion(messages, config);
}
