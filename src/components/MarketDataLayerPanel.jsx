import { useMemo, useState } from "react";
import { Boxes, ChevronDown, ChevronUp, Database, Globe, Layers, Plug, RefreshCw, Sparkles, Users } from "lucide-react";
import {
  CONTENT_MENTION_OPTIONS,
  CONTENT_MENTION_HELP,
  HIGH_HEAT_COMPETITION_NOTE,
  LOW_FOLLOWER_VIRAL_HELP,
  MARKET_INPUT_STANDARD_NOTE,
  EXTERNAL_DATA_INTERFACES,
  EXTERNAL_DATA_NOTE,
  MARKET_DATA_EVIDENCE_NOTE,
  MARKET_DATA_SOURCE_LABELS,
  PUBLIC_TREND_NOTE,
  TREND_LEVEL_HELP,
  TREND_LEVEL_OPTIONS,
  TREND_SAMPLE,
  TREND_SOURCE_OPTIONS,
  USER_INPUT_CHANNEL_OPTIONS,
  USER_INPUT_SAMPLE,
  buildMarketDataSourceStatus,
  buildPublicTrendSummary,
  buildUserInputSummary,
  computeMarketHeatScore,
  getEvidenceText,
  getMarketEvidenceLevel,
  getStatusText,
  getStatusTone,
  hasPublicTrendData,
  hasUserInputData,
  validatePriceRange,
} from "../utils/marketDataLayer";
import {
  SUPPLY_CHAIN_SAMPLE,
  analyzeSupplyChainInsight,
  getMoqRiskText,
  getPriceAdvantageText,
  getStabilityText,
  getSupplyChainInputStatus,
  hasSupplyChainInput,
  validateSupplyChainInput,
} from "../utils/supplyChainInsightEngine";
import { DEMO_INTERNAL_TEST_RECORDS, analyzeInternalTestData, getMaturityText } from "../utils/internalTestDataEngine";

const TONE_BADGE = {
  green: "bg-emerald-300/15 text-emerald-100 border-emerald-300/30",
  yellow: "bg-amber-300/15 text-amber-100 border-amber-300/30",
  gray: "bg-white/[0.06] text-slate-400 border-white/10",
};

const EVIDENCE_TONE = { low: "text-amber-100", medium: "text-cyan-100", high: "text-emerald-100" };

const SOURCE_ICON = {
  userInput: Users,
  supplyChain: Boxes,
  internalTest: Database,
  publicTrend: Globe,
  external: Plug,
};

const inputClass = "mt-1 min-h-10 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-300/60 placeholder:font-normal placeholder:text-slate-600";

const USER_BLANK = {
  keywords: "",
  targetAudience: "",
  targetChannel: "",
  competitorCount: "",
  competitorPriceMin: "",
  competitorPriceMax: "",
  contentMentionLevel: "unknown",
  lowFollowerViralCount: "",
  userMarketNote: "",
};

const SUPPLY_BLANK = {
  supplierCount: "",
  minWholesalePrice: "",
  maxWholesalePrice: "",
  commonMoq: "",
  supportsDropshipping: "unknown",
  supportsSmallBatchTrial: "unknown",
  shippingLocation: "",
  samplePrice: "",
  bulkPrice: "",
  shippingFee: "",
  leadTimeDays: "",
  supplierStabilityNote: "",
};

const TREND_BLANK = {
  trendSource: "",
  trendKeywords: "",
  trendLevel: "unknown",
  trendDate: "",
  trendNote: "",
  trendReferenceUrl: "",
};

const SUPPLY_NUMBER_FIELDS = [
  { key: "supplierCount", label: "同类供应商数量", placeholder: "例如：12", helper: "可在 1688、义乌档口或批发平台搜索同类商品后估算数量。" },
  { key: "minWholesalePrice", label: "最低拿货价（元）", placeholder: "例如：6.8", helper: "同类商品中较低的批发价，不含运费。" },
  { key: "maxWholesalePrice", label: "最高拿货价（元）", placeholder: "例如：12.5", helper: "同类商品中较高的批发价，用于判断价格区间。" },
  { key: "commonMoq", label: "常见 MOQ / 起订量（件）", placeholder: "例如：100", helper: "多数供应商要求的最低起订量。" },
  { key: "samplePrice", label: "样品价（元）", placeholder: "例如：15", helper: "" },
  { key: "bulkPrice", label: "大货价（元）", placeholder: "例如：8.5", helper: "" },
  { key: "shippingFee", label: "预估运费（元）", placeholder: "例如：8", helper: "" },
  { key: "leadTimeDays", label: "发货周期（天）", placeholder: "例如：3", helper: "" },
];

const SUPPLY_BOOL_OPTIONS = [
  { value: "unknown", label: "不确定" },
  { value: "yes", label: "支持" },
  { value: "no", label: "不支持" },
];

function StatusBadge({ status }) {
  const tone = getStatusTone(status);
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${TONE_BADGE[tone] || TONE_BADGE.yellow}`}>{getStatusText(status)}</span>;
}

function FieldLabel({ children }) {
  return <span className="text-xs font-bold text-slate-200">{children}</span>;
}

function HelperText({ children }) {
  if (!children) return null;
  return <span className="mt-1 block text-[11px] leading-5 text-slate-500">{children}</span>;
}

function ValidationLists({ errors = [], warnings = [] }) {
  return (
    <>
      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm leading-6 text-rose-100">
          {errors.map((msg) => <li key={msg}>· {msg}</li>)}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
          {warnings.map((msg) => <li key={msg}>· {msg}</li>)}
        </ul>
      )}
    </>
  );
}

function PrimaryButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-300 px-5 py-2.5 text-sm font-black text-black hover:bg-emerald-200">
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}

function SampleButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-100 hover:bg-emerald-300/20">
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}

function formatPercent(value) {
  return value == null ? "待补充" : `${value.toFixed(1)}%`;
}
function formatMargin(value) {
  return value == null ? "待补充" : `${Math.round(value * 100)}%`;
}

export default function MarketDataLayerPanel({ result, product, records, onGoReview, onGoLibrary }) {
  const [expandedKey, setExpandedKey] = useState("");
  const [notice, setNotice] = useState({ key: "", text: "" });

  const [userForm, setUserForm] = useState(USER_BLANK);
  const [appliedUserForm, setAppliedUserForm] = useState(null);

  const [supplyForm, setSupplyForm] = useState(SUPPLY_BLANK);
  const [appliedSupplyForm, setAppliedSupplyForm] = useState(null);

  const [trendForm, setTrendForm] = useState(TREND_BLANK);
  const [appliedTrendForm, setAppliedTrendForm] = useState(null);

  const [demoRecords, setDemoRecords] = useState(null);

  function toggle(key) {
    setExpandedKey((current) => (current === key ? "" : key));
  }

  // ---------------- derived state ----------------
  const internalRecords = useMemo(
    () => [...(Array.isArray(records) ? records : []), ...(demoRecords || [])],
    [records, demoRecords]
  );
  const internalData = useMemo(() => analyzeInternalTestData(internalRecords), [internalRecords]);

  const userApplied = hasUserInputData(appliedUserForm || {}) || Boolean(product?.competitorPrice || product?.keywords);
  const supplyApplied = hasSupplyChainInput(appliedSupplyForm || {});
  const trendApplied = hasPublicTrendData(appliedTrendForm || {});

  const supplyInsight = useMemo(
    () => (supplyApplied ? analyzeSupplyChainInsight(appliedSupplyForm) : null),
    [appliedSupplyForm, supplyApplied]
  );
  const liveSupplyFilled = hasSupplyChainInput(supplyForm);
  const liveSupplyInsight = useMemo(
    () => (liveSupplyFilled ? analyzeSupplyChainInsight(supplyForm) : null),
    [supplyForm, liveSupplyFilled]
  );

  const sourceStatus = buildMarketDataSourceStatus({
    hasUserInput: userApplied,
    hasSupplyChain: supplyApplied,
    hasPublicTrend: trendApplied,
    internalCount: internalData.totalTestedProducts,
  });
  if (supplyApplied) sourceStatus.supplyChain = getSupplyChainInputStatus(appliedSupplyForm);

  const evidenceLevel = getMarketEvidenceLevel({
    hasUserInput: userApplied,
    hasSupplyChain: supplyApplied,
    hasPublicTrend: trendApplied,
    internalCount: internalData.totalTestedProducts,
  });
  const heatScore = computeMarketHeatScore({
    result,
    supplyChainInsight: supplyInsight,
    internalData,
    hasUserInput: userApplied,
    hasPublicTrend: trendApplied,
  });

  // ---------------- validation ----------------
  const userValidation = useMemo(() => {
    const range = validatePriceRange({
      min: userForm.competitorPriceMin,
      max: userForm.competitorPriceMax,
      labelMin: "竞品最低售价",
      labelMax: "竞品最高售价",
    });
    const errors = [...range.errors];
    [["competitorCount", "同类竞品数量"], ["lowFollowerViralCount", "低粉爆文数量"]].forEach(([key, label]) => {
      const value = userForm[key];
      if (value !== "" && Number(value) < 0) errors.push(`${label}不能为负数。`);
    });
    return { errors, warnings: range.warnings, valid: errors.length === 0 };
  }, [userForm]);

  const supplyValidation = useMemo(() => validateSupplyChainInput(supplyForm), [supplyForm]);

  // ---------------- save handlers ----------------
  function saveUser() {
    if (!userValidation.valid) {
      setNotice({ key: "userInput", text: "请先修正存在错误的字段（数值不能为负数）后再保存。" });
      return;
    }
    setAppliedUserForm({ ...userForm });
    setNotice({ key: "userInput", text: "已根据用户输入重新评估。" });
  }
  function saveSupply() {
    if (!supplyValidation.valid) {
      setNotice({ key: "supplyChain", text: "请先修正存在错误的字段（数值不能为负数）后再保存。" });
      return;
    }
    setAppliedSupplyForm({ ...supplyForm });
    setNotice({ key: "supplyChain", text: "已根据供应链行情重新评估。" });
  }
  function saveTrend() {
    setAppliedTrendForm({ ...trendForm });
    setNotice({ key: "publicTrend", text: "已根据公开趋势参考重新评估。" });
  }
  function loadDemoRecords() {
    setDemoRecords(DEMO_INTERNAL_TEST_RECORDS);
    setNotice({ key: "internalTest", text: "已填入示例演示数据并重新评估。" });
  }

  const noticeFor = (key) => (notice.key === key && notice.text ? notice.text : "");

  return (
    <section className="min-w-0 rounded-[2rem] border border-emerald-300/15 bg-emerald-300/[0.06] p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-emerald-200">
            <Layers className="h-4 w-4" aria-hidden="true" />
            Market Data Layer
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">市场数据源分层</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            通过用户手动输入、供应链行情、自有测款数据和后续外部数据源预留，增强选品判断的市场依据。点击任意数据源卡片可展开补充或查看说明。
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-emerald-300/20 bg-black/25 p-4 text-center">
          <p className="text-xs font-bold text-slate-400">市场热度评分</p>
          <p className="mt-1 text-3xl font-black text-emerald-200">{heatScore}<span className="text-base text-slate-400"> / 100</span></p>
          <p className={`mt-1 text-xs font-bold ${EVIDENCE_TONE[evidenceLevel]}`}>证据等级：{getEvidenceText(evidenceLevel)}</p>
        </div>
      </div>

      {/* 5 个可点击数据源卡片 */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MARKET_DATA_SOURCE_LABELS.map((source) => {
          const Icon = SOURCE_ICON[source.key] || Layers;
          const active = expandedKey === source.key;
          return (
            <button
              key={source.key}
              type="button"
              onClick={() => toggle(source.key)}
              aria-expanded={active}
              className={`flex w-full items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50 ${
                active ? "border-emerald-300/50 bg-emerald-300/10" : "border-white/10 bg-black/25 hover:bg-white/[0.04]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-emerald-200" aria-hidden="true" />
                <span className="truncate text-sm font-bold text-slate-200">{source.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <StatusBadge status={sourceStatus[source.key]} />
                {active ? <ChevronUp className="h-4 w-4 text-emerald-200" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-6 text-slate-500">{MARKET_DATA_EVIDENCE_NOTE}</p>

      {/* 展开面板区域（一次只展开一个） */}
      {expandedKey === "userInput" && (
        <PanelShell>
          <PanelHead title="用户输入，可选补充" desc="这些信息来自用户对竞品、关键词和内容平台的观察，用于提升市场热度评估的可解释性。" />
          <StandardNote>{MARKET_INPUT_STANDARD_NOTE}</StandardNote>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <FieldLabel>核心关键词</FieldLabel>
              <input className={inputClass} placeholder="例如：企鹅挂件、毛绒钥匙扣、学生礼物" value={userForm.keywords} onChange={(e) => setUserForm((c) => ({ ...c, keywords: e.target.value }))} />
              <HelperText>用于判断商品是否有清晰搜索和内容表达方向。</HelperText>
            </label>
            <label className="block">
              <FieldLabel>目标人群</FieldLabel>
              <input className={inputClass} placeholder="例如：学生、女生、宿舍党、礼物需求人群" value={userForm.targetAudience} onChange={(e) => setUserForm((c) => ({ ...c, targetAudience: e.target.value }))} />
            </label>
            <label className="block">
              <FieldLabel>目标渠道</FieldLabel>
              <select className={inputClass} value={userForm.targetChannel} onChange={(e) => setUserForm((c) => ({ ...c, targetChannel: e.target.value }))}>
                <option value="" className="bg-[#08100d]">请选择</option>
                {USER_INPUT_CHANNEL_OPTIONS.map((o) => <option key={o} value={o} className="bg-[#08100d]">{o}</option>)}
              </select>
            </label>
            <label className="block">
              <FieldLabel>同类竞品数量</FieldLabel>
              <input type="number" min="0" className={inputClass} placeholder="例如：30" value={userForm.competitorCount} onChange={(e) => setUserForm((c) => ({ ...c, competitorCount: e.target.value }))} />
              <HelperText>可根据 1688、淘宝、小红书或抖音搜索结果做估算，不代表全网真实数据。</HelperText>
            </label>
            <label className="block">
              <FieldLabel>内容平台出现频率</FieldLabel>
              <select className={inputClass} value={userForm.contentMentionLevel} onChange={(e) => setUserForm((c) => ({ ...c, contentMentionLevel: e.target.value }))}>
                {CONTENT_MENTION_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-[#08100d]">{o.label}</option>)}
              </select>
              <HelpCard>{CONTENT_MENTION_HELP}</HelpCard>
            </label>
            <label className="block">
              <FieldLabel>竞品最低售价（元）</FieldLabel>
              <input type="number" min="0" className={inputClass} placeholder="例如：9.9" value={userForm.competitorPriceMin} onChange={(e) => setUserForm((c) => ({ ...c, competitorPriceMin: e.target.value }))} />
            </label>
            <label className="block">
              <FieldLabel>竞品最高售价（元）</FieldLabel>
              <input type="number" min="0" className={inputClass} placeholder="例如：29.9" value={userForm.competitorPriceMax} onChange={(e) => setUserForm((c) => ({ ...c, competitorPriceMax: e.target.value }))} />
            </label>
            <label className="block">
              <FieldLabel>低粉爆文数量，可选</FieldLabel>
              <input type="number" min="0" className={inputClass} placeholder="例如：3" value={userForm.lowFollowerViralCount} onChange={(e) => setUserForm((c) => ({ ...c, lowFollowerViralCount: e.target.value }))} />
              <HelpCard>{LOW_FOLLOWER_VIRAL_HELP}</HelpCard>
            </label>
            <label className="block md:col-span-2">
              <FieldLabel>用户观察备注</FieldLabel>
              <textarea rows={3} className={`${inputClass} min-h-[72px] resize-y`} placeholder="例如：小红书上同款较多，但评论区有人问链接，价格集中在 15–25 元。" value={userForm.userMarketNote} onChange={(e) => setUserForm((c) => ({ ...c, userMarketNote: e.target.value }))} />
            </label>
          </div>
          <ValidationLists errors={userValidation.errors} warnings={userValidation.warnings} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SampleButton onClick={() => setUserForm({ ...USER_BLANK, ...USER_INPUT_SAMPLE })}>填入示例数据</SampleButton>
            <PrimaryButton onClick={saveUser}>保存用户输入并重新评估</PrimaryButton>
            {noticeFor("userInput") && <span className="text-sm font-bold text-emerald-200">{noticeFor("userInput")}</span>}
          </div>
          {appliedUserForm && hasUserInputData(appliedUserForm) && (
            <SummaryCard title="用户输入摘要" summary={buildUserInputSummary(appliedUserForm)} />
          )}
          <p className="mt-3 text-xs leading-6 text-slate-500">{HIGH_HEAT_COMPETITION_NOTE}</p>
        </PanelShell>
      )}

      {expandedKey === "supplyChain" && (
        <PanelShell>
          <PanelHead title="供应链行情，可选填写" desc="补充同类供应商数量、价格区间和 MOQ，可提升市场热度评分证据等级。你不需要精确到官方数据，只需根据 1688、批发市场或供应商报价做一个可解释的估算。" />
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <SampleButton onClick={() => setSupplyForm({ ...SUPPLY_BLANK, ...SUPPLY_CHAIN_SAMPLE })}>填入示例数据</SampleButton>
            <span className="text-xs text-slate-500">仅用于演示，正式使用时请替换为真实询价或市场观察结果。</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {SUPPLY_NUMBER_FIELDS.map((field) => (
              <label key={field.key} className="block">
                <FieldLabel>{field.label}</FieldLabel>
                <input type="number" min="0" inputMode="decimal" placeholder={field.placeholder} value={supplyForm[field.key]} onChange={(e) => setSupplyForm((c) => ({ ...c, [field.key]: e.target.value }))} className={inputClass} />
                <HelperText>{field.helper}</HelperText>
              </label>
            ))}
            <label className="block">
              <FieldLabel>是否支持一件代发</FieldLabel>
              <select value={supplyForm.supportsDropshipping} onChange={(e) => setSupplyForm((c) => ({ ...c, supportsDropshipping: e.target.value }))} className={inputClass}>
                {SUPPLY_BOOL_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-[#08100d]">{o.label}</option>)}
              </select>
            </label>
            <label className="block">
              <FieldLabel>是否支持 20–50 件小批量试单</FieldLabel>
              <select value={supplyForm.supportsSmallBatchTrial} onChange={(e) => setSupplyForm((c) => ({ ...c, supportsSmallBatchTrial: e.target.value }))} className={inputClass}>
                {SUPPLY_BOOL_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-[#08100d]">{o.label}</option>)}
              </select>
            </label>
            <label className="block">
              <FieldLabel>发货地</FieldLabel>
              <input type="text" placeholder="例如：义乌 / 广州 / 深圳" value={supplyForm.shippingLocation} onChange={(e) => setSupplyForm((c) => ({ ...c, shippingLocation: e.target.value }))} className={inputClass} />
              <HelperText>用于判断物流时效和供应链集中度。</HelperText>
            </label>
            <label className="block md:col-span-2">
              <FieldLabel>供应商备注</FieldLabel>
              <textarea rows={3} placeholder="例如：支持混批，但颜色随机；样品和大货需要确认是否一致。" value={supplyForm.supplierStabilityNote} onChange={(e) => setSupplyForm((c) => ({ ...c, supplierStabilityNote: e.target.value }))} className={`${inputClass} min-h-[72px] resize-y`} />
            </label>
          </div>
          <ValidationLists errors={supplyValidation.errors} warnings={supplyValidation.warnings} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={saveSupply}>保存供应链行情并重新评估</PrimaryButton>
            {noticeFor("supplyChain") && <span className="text-sm font-bold text-emerald-200">{noticeFor("supplyChain")}</span>}
          </div>
          <div className="mt-4">
            {liveSupplyInsight ? (
              <div className="space-y-3">
                <p className="text-sm font-black text-white">供应链分析结果</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <ResultStat label="供应链稳定度" value={getStabilityText(liveSupplyInsight.supplyChainStability)} />
                  <ResultStat label="价格优势" value={getPriceAdvantageText(liveSupplyInsight.priceAdvantage)} />
                  <ResultStat label="MOQ 风险" value={getMoqRiskText(liveSupplyInsight.moqRisk)} />
                </div>
                <p className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm leading-7 text-emerald-50">建议：{liveSupplyInsight.trialOrderSuggestion}</p>
                <p className={`text-xs font-bold ${EVIDENCE_TONE[liveSupplyInsight.evidenceLevel]}`}>证据等级：{getEvidenceText(liveSupplyInsight.evidenceLevel)}</p>
              </div>
            ) : (
              <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-7 text-amber-100">供应链行情待补充：建议至少填写同类供应商数量、价格区间和常见 MOQ。</p>
            )}
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">数据来源说明：当前供应链行情来自用户手动填写或演示数据，不代表实时平台官方数据。建议以真实询价、样品测试和供应商沟通结果为准。</p>
        </PanelShell>
      )}

      {expandedKey === "internalTest" && (
        <PanelShell>
          <PanelHead title="自有测款数据，持续沉淀" desc="这部分数据来自用户在 TradePilot 中保存的产品、测款复盘和补货/放弃动作。它不是全网数据，而是 TradePilot 自己沉淀的低客单小商品测款数据。" />
          {internalData.totalTestedProducts > 0 ? (
            <div className="space-y-4">
              {demoRecords && (
                <span className="inline-flex rounded-full bg-amber-300/15 px-3 py-1 text-xs font-bold text-amber-100">示例演示数据</span>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${TONE_BADGE.green}`}>数据成熟度：{getMaturityText(internalData.dataMaturityLevel)}</span>
                <span className="text-sm text-slate-300">已沉淀测款记录：{internalData.totalTestedProducts} 条</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <ResultStat label="平均毛利率" value={formatMargin(internalData.averageGrossMargin)} />
                <ResultStat label="平均询价率" value={formatPercent(internalData.averageInquiryRate)} />
                <ResultStat label="平均成交率" value={formatPercent(internalData.averageConversionRate)} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm leading-7 text-emerald-50">
                  表现较好的类目：{internalData.bestPerformingCategories.length ? internalData.bestPerformingCategories.join("、") : "样本不足，待积累"}
                </div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-7 text-amber-100">
                  表现较弱的类目：{internalData.weakCategories.length ? internalData.weakCategories.join("、") : "样本不足，待积累"}
                </div>
              </div>
              {internalData.channelStats.length > 0 && (
                <p className="text-sm leading-7 text-slate-300">
                  表现较好的渠道：{[...internalData.channelStats].sort((a, b) => (b.averageConversionRate || 0) - (a.averageConversionRate || 0))[0]?.channel || "待积累"}
                </p>
              )}
              {internalData.recommendedActions.length > 0 && (
                <ul className="space-y-1 text-sm leading-7 text-slate-300">
                  {internalData.recommendedActions.map((a) => <li key={a}>· {a}</li>)}
                </ul>
              )}
              <div className="flex flex-wrap gap-3">
                <NavButton onClick={onGoReview}>查看测款复盘</NavButton>
                <NavButton onClick={onGoLibrary}>查看产品库</NavButton>
                {!onGoReview && !onGoLibrary && (
                  <span className="text-xs text-slate-500">请在左侧导航进入「测款复盘」或「我的产品库」查看。</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-7 text-amber-100">
                当前自有测款数据较少。随着你持续保存产品、填写测款复盘和记录最终动作，TradePilot 会逐步形成自己的小商品测款知识库。
              </p>
              <SampleButton onClick={loadDemoRecords}>填入演示测款数据</SampleButton>
              <p className="text-xs text-slate-500">演示数据仅用于评委演示，会标注「示例演示数据」，不代表真实用户数据。</p>
            </div>
          )}
          {noticeFor("internalTest") && <p className="mt-3 text-sm font-bold text-emerald-200">{noticeFor("internalTest")}</p>}
        </PanelShell>
      )}

      {expandedKey === "publicTrend" && (
        <PanelShell>
          <PanelHead title="公开趋势参考，可选记录" desc="这里用于记录用户从平台公开榜单、趋势工具、关键词指数或人工观察中看到的趋势信号。当前版本不自动抓取平台数据，只支持人工记录。" />
          <StandardNote>{MARKET_INPUT_STANDARD_NOTE}</StandardNote>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <FieldLabel>趋势来源</FieldLabel>
              <select className={inputClass} value={trendForm.trendSource} onChange={(e) => setTrendForm((c) => ({ ...c, trendSource: e.target.value }))}>
                <option value="" className="bg-[#08100d]">请选择</option>
                {TREND_SOURCE_OPTIONS.map((o) => <option key={o} value={o} className="bg-[#08100d]">{o}</option>)}
              </select>
            </label>
            <label className="block">
              <FieldLabel>趋势热度等级</FieldLabel>
              <select className={inputClass} value={trendForm.trendLevel} onChange={(e) => setTrendForm((c) => ({ ...c, trendLevel: e.target.value }))}>
                {TREND_LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-[#08100d]">{o.label}</option>)}
              </select>
              <HelpCard>{TREND_LEVEL_HELP}</HelpCard>
            </label>
            <label className="block">
              <FieldLabel>趋势关键词</FieldLabel>
              <input className={inputClass} placeholder="例如：毛绒挂件、开学季礼物、宿舍好物" value={trendForm.trendKeywords} onChange={(e) => setTrendForm((c) => ({ ...c, trendKeywords: e.target.value }))} />
            </label>
            <label className="block">
              <FieldLabel>趋势记录日期</FieldLabel>
              <input type="date" className={inputClass} value={trendForm.trendDate} onChange={(e) => setTrendForm((c) => ({ ...c, trendDate: e.target.value }))} />
            </label>
            <label className="block md:col-span-2">
              <FieldLabel>趋势备注</FieldLabel>
              <textarea rows={3} className={`${inputClass} min-h-[72px] resize-y`} placeholder="例如：近期“开学季礼物”相关内容较多，但同质化也明显。" value={trendForm.trendNote} onChange={(e) => setTrendForm((c) => ({ ...c, trendNote: e.target.value }))} />
            </label>
            <label className="block md:col-span-2">
              <FieldLabel>参考链接，可选</FieldLabel>
              <input className={inputClass} placeholder="例如：公开榜单或趋势页面链接" value={trendForm.trendReferenceUrl} onChange={(e) => setTrendForm((c) => ({ ...c, trendReferenceUrl: e.target.value }))} />
              <HelperText>仅作为用户备注，不自动抓取网页内容。</HelperText>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SampleButton onClick={() => setTrendForm({ ...TREND_BLANK, ...TREND_SAMPLE })}>填入示例趋势</SampleButton>
            <PrimaryButton onClick={saveTrend}>保存趋势参考并重新评估</PrimaryButton>
            {noticeFor("publicTrend") && <span className="text-sm font-bold text-emerald-200">{noticeFor("publicTrend")}</span>}
          </div>
          {appliedTrendForm && hasPublicTrendData(appliedTrendForm) && (
            <SummaryCard title="公开趋势摘要" summary={buildPublicTrendSummary(appliedTrendForm)} />
          )}
          <p className="mt-4 text-xs leading-6 text-slate-500">{PUBLIC_TREND_NOTE}</p>
        </PanelShell>
      )}

      {expandedKey === "external" && (
        <PanelShell>
          <PanelHead title="外部数据源，后续扩展" desc="这里展示后续可扩展的数据来源方向，例如电商数据服务、关键词指数工具和供应链行情服务。当前评分优先基于用户手动填写、供应链行情、自有测款数据和公开趋势参考。" />
          <div className="grid gap-3 md:grid-cols-2">
            {EXTERNAL_DATA_INTERFACES.map((item) => (
              <div key={item.name} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-white">{item.name}</p>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${TONE_BADGE.gray}`}>{item.status}</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-slate-400">用途：{item.usage}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm leading-7 text-slate-300">{EXTERNAL_DATA_NOTE}</p>
        </PanelShell>
      )}
    </section>
  );
}

function PanelShell({ children }) {
  return <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-black/20 p-4">{children}</div>;
}

function PanelHead({ title, desc }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-black text-emerald-100">{title}</p>
      <p className="mt-1 text-xs leading-6 text-slate-400">{desc}</p>
    </div>
  );
}

function StandardNote({ children }) {
  return (
    <p className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-3 text-xs leading-6 text-cyan-50">
      {children}
    </p>
  );
}

function HelpCard({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1 block rounded-xl border border-white/10 bg-black/20 p-2.5 text-[11px] leading-5 text-slate-400">
      {children}
    </p>
  );
}

function SummaryCard({ title, summary }) {
  if (!summary || !Array.isArray(summary.lines)) return null;
  return (
    <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-7 text-emerald-50">
      <p className="font-black text-emerald-100">{title}</p>
      {summary.lines.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {summary.lines.map((line) => (
            <li key={line.label}>· {line.label}：{line.value}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-emerald-50/80">已保存，可继续补充更多字段以提升证据等级。</p>
      )}
      <p className="mt-2 text-emerald-50/90">判断说明：{summary.note}</p>
    </div>
  );
}

function ResultStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function NavButton({ onClick, children }) {
  if (!onClick) return null;
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-300/20">
      {children}
    </button>
  );
}
