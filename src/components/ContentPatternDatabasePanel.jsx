import React, { useEffect, useMemo, useState } from "react";

import { extractContentPattern, generateXiaohongshuCopywriting } from "../utils/contentPatternClient";
import { MAX_CONTENT_PATTERN_IMPORT_ITEMS, parseContentPatternCsv } from "../utils/contentPatternUtils";
import {
  buildDatasetPatternFromExtracted,
  CONTENT_PATTERN_HOOK_LABELS,
  cleanupExpiredContentRawStaging,
  clearAllContentRawStaging,
  clearContentRawStagingBatch,
  deleteContentPatternDatasetItem,
  exportContentPatternDatasetCsv,
  exportContentPatternDatasetJson,
  exportContentPatternSeedJson,
  getContentPatternHookLabel,
  getContentPatternPlatformLabel,
  getContentPatternDatabaseStats,
  importContentRawStaging,
  loadContentPatternDataset,
  loadContentRawStaging,
  loadPublicContentPatternSeed,
  markContentPatternReviewed,
  saveContentPatternDataset,
  saveContentPatternCopywriting,
  updateContentPatternDataset,
  updateContentRawStagingStatus,
} from "../services/contentPatternDatabase";

const STATUS_LABELS = {
  pending: "待提取",
  extracted: "已提取",
  duplicate: "重复",
  rejected_raw_leak: "原文泄漏拦截",
  saved: "已保存",
  failed: "失败",
};

const EDITABLE_FIELDS = [
  ["platform", "平台"],
  ["category_key", "类目"],
  ["hook_type", "Hook 类型"],
  ["title_structure", "标题结构"],
  ["opening_structure", "开头结构"],
  ["reusable_template", "可复用模板"],
  ["suitable_audience", "适用人群"],
  ["selling_points", "卖点（每行一项）"],
  ["content_angle", "内容角度（每行一项）"],
  ["suitable_channel", "适用渠道"],
  ["avoid_claims", "禁用声明（每行一项）"],
  ["example_generated_title", "原创示例标题"],
  ["source_type", "来源类型"],
];

const LIST_FIELDS = new Set(["selling_points", "content_angle", "avoid_claims"]);

function formatTime(value) {
  if (!value) return "暂无";
  try {
    return new Date(value).toLocaleString("zh-CN", { hour12: false });
  } catch (error) {
    return value;
  }
}

function relabelDistribution(values = {}, labeler) {
  return Object.entries(values).reduce((result, [key, count]) => {
    const label = labeler(key);
    result[label] = (result[label] || 0) + count;
    return result;
  }, {});
}

function downloadFile(artifact) {
  const blob = new Blob([artifact.content], { type: artifact.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = artifact.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Distribution({ title, values }) {
  const entries = Object.entries(values || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {entries.length ? entries.map(([label, count]) => (
          <span key={label} className="rounded-full bg-white/[0.07] px-3 py-1 text-xs text-slate-200">{label} · {count}</span>
        )) : <span className="text-xs text-slate-600">暂无数据</span>}
      </div>
    </div>
  );
}

function PatternEditor({ item, rawInput, onDone, onCancel }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(EDITABLE_FIELDS.map(([field]) => [
    field,
    LIST_FIELDS.has(field) ? (item[field] || []).join("\n") : item[field] || "",
  ])));
  const [message, setMessage] = useState("");

  function save() {
    const changes = Object.fromEntries(EDITABLE_FIELDS.map(([field]) => [
      field,
      LIST_FIELDS.has(field) ? String(draft[field] || "").split(/\n/).map((value) => value.trim()).filter(Boolean) : draft[field],
    ]));
    const result = updateContentPatternDataset(item.pattern_id, changes, rawInput);
    setMessage(result.message);
    if (result.ok) onDone(result.dataset);
  }

  return (
    <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
      <div className="grid gap-3 md:grid-cols-2">
        {EDITABLE_FIELDS.map(([field, label]) => (
          <label key={field} className={field.includes("structure") || field === "reusable_template" ? "md:col-span-2" : ""}>
            <span className="text-xs font-bold text-slate-400">{label}</span>
            {field === "hook_type" ? (
              <select value={draft[field]} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/60">
                {Object.entries(CONTENT_PATTERN_HOOK_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            ) : (
              <textarea
                rows={field.includes("structure") || field === "reusable_template" ? 3 : 2}
                value={draft[field]}
                onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}
                className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/60"
              />
            )}
          </label>
        ))}
      </div>
      {message && <p className="mt-3 text-sm text-amber-200">{message}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={save} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-black">保存修改</button>
        <button onClick={onCancel} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300">取消</button>
      </div>
    </div>
  );
}

function CopywritingPackagePreview({ copy }) {
  if (!copy?.xiaohongshu) return null;
  const xhs = copy.xiaohongshu;
  return (
    <div className="mt-4 rounded-2xl border border-pink-300/20 bg-pink-300/[0.05] p-4">
      <p className="text-xs font-bold text-pink-200">小红书图文发布文案包</p>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div><p className="text-xs text-slate-500">标题备选</p><ol className="mt-2 space-y-1 text-sm text-slate-200">{xhs.titles.map((value, index) => <li key={`${value}-${index}`}>{index + 1}. {value}</li>)}</ol></div>
        <div><p className="text-xs text-slate-500">封面字</p><div className="mt-2 flex flex-wrap gap-2">{xhs.cover_texts.map((value) => <span key={value} className="rounded-full bg-white/[0.07] px-2 py-1 text-xs text-slate-200">{value}</span>)}</div></div>
        <div className="lg:col-span-2"><p className="text-xs text-slate-500">完整正文</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">{xhs.body}</p></div>
        <div><p className="text-xs text-slate-500">配图建议</p><ul className="mt-2 space-y-1 text-sm text-slate-300">{xhs.image_suggestions.map((value) => <li key={value}>• {value}</li>)}</ul></div>
        <div><p className="text-xs text-slate-500">图文排版建议</p><ul className="mt-2 space-y-1 text-sm text-slate-300">{xhs.layout_suggestions.map((value) => <li key={value}>• {value}</li>)}</ul></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{xhs.hashtags.map((value) => <span key={value} className="text-xs text-cyan-200">#{value.replace(/^#/, "")}</span>)}</div>
    </div>
  );
}

function CopywritingGenerator({ item, rawInput, onDone, onCancel }) {
  const [brief, setBrief] = useState({
    topic: "",
    audience: item.suitable_audience || "",
    scene: (item.content_angle || []).join("、"),
    keyPoints: (item.selling_points || []).join("、"),
    goal: "种草、测款、收集评论/收藏反馈",
    price: "",
    material: "",
    avoid: (item.avoid_claims || []).join("、"),
    channel: "小红书图文",
  });
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    if (!brief.topic.trim()) {
      setMessage("请先填写商品名称；未核实的价格和材质请留空。");
      return;
    }
    setGenerating(true);
    setMessage("正在生成小红书图文文案包……");
    const result = await generateXiaohongshuCopywriting({ pattern: item, brief });
    const saved = saveContentPatternCopywriting(item.pattern_id, result.copywritingPackage, result.source, rawInput);
    setGenerating(false);
    setMessage(saved.ok ? result.message : saved.message);
    if (saved.ok) onDone(saved.dataset, result.message);
  }

  const fields = [
    ["topic", "商品名称 *", "如：轻量通勤耳夹"],
    ["audience", "目标人群", "如：无耳洞通勤人群"],
    ["scene", "使用场景", "如：上课、通勤、日常拍照"],
    ["goal", "内容目标", "种草、测款、收集评论/收藏反馈"],
    ["keyPoints", "已核实卖点", "只填写确认过的商品事实"],
    ["price", "已核实价格（可空）", "没有可靠价格就留空"],
    ["material", "已核实材质（可空）", "没有可靠材质就留空"],
    ["avoid", "禁用表达", "如：不写绝对功效、虚假销量"],
  ];

  return (
    <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
      <p className="text-sm font-black text-white">生成小红书图文发布文案</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">只会把抽象结构和你填写的已核实商品简报发送给文本服务，不会再次发送 staging 原文。</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {fields.map(([field, label, placeholder]) => (
          <label key={field}><span className="text-xs font-bold text-slate-400">{label}</span><textarea rows={field === "keyPoints" || field === "avoid" ? 3 : 2} value={brief[field]} onChange={(event) => setBrief((current) => ({ ...current, [field]: event.target.value }))} placeholder={placeholder} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60" /></label>
        ))}
      </div>
      {message && <p className="mt-3 text-sm text-amber-100">{message}</p>}
      <div className="mt-4 flex flex-wrap gap-2"><button disabled={generating} onClick={generate} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-black disabled:opacity-50">{generating ? "正在生成……" : "生成并保存小红书文案包"}</button><button onClick={onCancel} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300">取消</button></div>
    </div>
  );
}

export default function ContentPatternDatabasePanel() {
  const [staging, setStaging] = useState(() => loadContentRawStaging());
  const [dataset, setDataset] = useState(() => loadContentPatternDataset());
  const [activeBatchId, setActiveBatchId] = useState(() => loadContentRawStaging()[0]?.batch_id || "");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [generatingId, setGeneratingId] = useState("");

  const batchIds = useMemo(() => [...new Set(staging.map((item) => item.batch_id))], [staging]);
  const stats = useMemo(() => getContentPatternDatabaseStats(dataset, staging), [dataset, staging]);
  const activeItems = useMemo(() => staging.filter((item) => !activeBatchId || item.batch_id === activeBatchId), [staging, activeBatchId]);

  useEffect(() => {
    let active = true;
    loadPublicContentPatternSeed().then((result) => {
      if (!active || !result.ok) return;
      setDataset(result.dataset);
      if (result.added) setMessage(`已自动加载 ${result.added} 条小红书公共基础结构；不会覆盖本地编辑。`);
    });
    return () => { active = false; };
  }, []);

  function refresh(nextStaging = loadContentRawStaging(), nextDataset = loadContentPatternDataset()) {
    setStaging(nextStaging);
    setDataset(nextDataset);
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage("CSV 文件请控制在 5MB 以内。");
      return;
    }
    try {
      const parsed = parseContentPatternCsv(await file.text());
      if (!parsed.items.length) {
        setMessage("没有识别到有效样本。请至少提供 title_raw 或 opening_raw。");
        return;
      }
      const result = importContentRawStaging(parsed.items);
      setActiveBatchId(result.batch_id);
      refresh(result.staging, dataset);
      setMessage(`批次 ${result.batch_id} 已进入 content_raw_staging：${result.imported} 条。正式结构库尚未写入。${parsed.truncated ? ` 单次最多导入 ${MAX_CONTENT_PATTERN_IMPORT_ITEMS} 条。` : ""}`);
    } catch (error) {
      setMessage("CSV 读取失败，请确认文件为 UTF-8 编码和标准逗号分隔格式。");
    }
  }

  async function extractBatch() {
    const candidates = activeItems.filter((item) => ["pending", "failed", "extracted"].includes(item.extraction_status));
    if (!candidates.length) {
      setMessage("当前批次没有待提取样本。");
      return;
    }
    setProcessing(true);
    let saved = 0;
    let duplicate = 0;
    let rejected = 0;
    let failed = 0;

    for (const item of candidates) {
      try {
        const result = await extractContentPattern({
          references: [{ title: item.title_raw, body: item.opening_raw }],
          name: `${item.category_key || item.product_name || "通用"}内容结构`,
          targetScene: "小红书图文笔记",
        });
        setStaging(updateContentRawStagingStatus(item.raw_id, "extracted"));
        const pattern = buildDatasetPatternFromExtracted(result.pattern, item);
        const savedResult = saveContentPatternDataset(pattern, item);
        setDataset(savedResult.dataset);
        setStaging(updateContentRawStagingStatus(item.raw_id, savedResult.status));
        if (savedResult.status === "saved") saved += 1;
        else if (savedResult.status === "duplicate") duplicate += 1;
        else if (savedResult.status === "rejected_raw_leak") rejected += 1;
        else failed += 1;
      } catch (error) {
        failed += 1;
        setStaging(updateContentRawStagingStatus(item.raw_id, "failed"));
      }
    }
    refresh();
    setProcessing(false);
    setMessage(`批量处理完成：保存 ${saved}，重复 ${duplicate}，原文泄漏拦截 ${rejected}，失败 ${failed}。原文仍只存在 staging。`);
  }

  function clearBatch() {
    if (!activeBatchId) return;
    const next = clearContentRawStagingBatch(activeBatchId);
    setActiveBatchId(next[0]?.batch_id || "");
    refresh(next, dataset);
    setMessage("当前批次 staging 原文已清空，正式结构库未受影响。");
  }

  function clearAll() {
    const next = clearAllContentRawStaging();
    setActiveBatchId("");
    refresh(next, dataset);
    setMessage("全部 staging 原文已清空，正式结构库未受影响。");
  }

  function cleanupExpired() {
    const result = cleanupExpiredContentRawStaging();
    refresh(result.staging, dataset);
    setMessage(`已清理 ${result.removed} 条过期 staging 样本。`);
  }

  function toggleReviewed(item) {
    const result = markContentPatternReviewed(item.pattern_id, !item.human_reviewed);
    refresh(staging, result.dataset);
    setMessage(result.ok ? (result.pattern.human_reviewed ? "已标记为人工审核。" : "已取消人工审核标记。") : result.message);
  }

  function removeDatasetItem(item) {
    const next = deleteContentPatternDatasetItem(item.pattern_id);
    refresh(staging, next);
    setMessage("结构已从正式结构库删除，staging 未受影响。");
  }

  function rawInputForPattern(item) {
    const sources = staging.filter((raw) => raw.batch_id === item.source_batch_id);
    return {
      title_raw: sources.map((raw) => raw.title_raw).filter(Boolean).join("\n"),
      opening_raw: sources.map((raw) => raw.opening_raw).filter(Boolean).join("\n"),
    };
  }

  return (
    <section className="space-y-6 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.04] p-4 sm:p-6">
      <div>
        <p className="text-sm font-bold text-emerald-300">小红书图文帖子结构库</p>
        <h2 className="mt-1 text-2xl font-black text-white">临时原文 staging → 小红书结构提取 → 图文发布文案</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">正式库采用字段白名单，固定 raw_text_stored=false；结构、文案包和公共 seed 都不保存原始标题、正文或平台用户资料。</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["正式结构", stats.dataset_count], ["Staging", stats.staging_count], ["已审核", stats.reviewed_count],
          ["未审核", stats.unreviewed_count], ["原文不存储比例", `${Math.round(stats.raw_text_stored_false_ratio * 100)}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Distribution title="平台分布" values={relabelDistribution(stats.platform_distribution, getContentPatternPlatformLabel)} />
        <Distribution title="类目分布" values={stats.category_distribution} />
        <Distribution title="Hook 类型分布" values={relabelDistribution(stats.hook_type_distribution, getContentPatternHookLabel)} />
      </div>
      <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
        <p>重复结构：{stats.duplicate_count}</p><p>最近导入：{formatTime(stats.last_import_at)}</p><p>最近保存：{formatTime(stats.last_saved_at)}</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-white">1. 导入 content_raw_staging</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">推荐 platform=xiaohongshu、content_type=图文笔记。旧平台值仍可导入，但统一转为小红书图文结构。单次最多 {MAX_CONTENT_PATTERN_IMPORT_ITEMS} 条。</p>
          </div>
          <label className="cursor-pointer rounded-2xl bg-emerald-300 px-4 py-3 text-center text-sm font-black text-black">
            导入 UTF-8 CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv} />
          </label>
        </div>
        {message && <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-200">{message}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select value={activeBatchId} onChange={(event) => setActiveBatchId(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
            <option value="">全部批次</option>
            {batchIds.map((batchId) => <option key={batchId} value={batchId}>{batchId}</option>)}
          </select>
          <button disabled={processing} onClick={extractBatch} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-black disabled:opacity-50">{processing ? "正在批量提取……" : "批量提取并安全保存"}</button>
          <button disabled={!activeBatchId} onClick={clearBatch} className="rounded-xl border border-amber-300/30 px-4 py-2 text-sm font-bold text-amber-200 disabled:opacity-40">清空当前批次</button>
          <button onClick={cleanupExpired} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300">清理过期 staging</button>
          <button onClick={clearAll} className="rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-bold text-rose-200">清空全部 staging</button>
        </div>
        <div className="mt-4 max-h-80 overflow-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-950 text-slate-500"><tr><th className="p-3">状态</th><th className="p-3">平台</th><th className="p-3">类目</th><th className="p-3">临时标题</th><th className="p-3">批次</th><th className="p-3">到期</th></tr></thead>
            <tbody>{activeItems.map((item) => (
              <tr key={item.raw_id} className="border-t border-white/5 text-slate-300"><td className="p-3 font-bold text-cyan-200">{STATUS_LABELS[item.extraction_status] || item.extraction_status}</td><td className="p-3">{getContentPatternPlatformLabel(item.platform)}</td><td className="p-3">{item.category_key || "-"}</td><td className="max-w-xs truncate p-3">{item.title_raw || item.opening_raw || "-"}</td><td className="max-w-xs truncate p-3">{item.batch_id}</td><td className="p-3">{formatTime(item.delete_after)}</td></tr>
            ))}</tbody>
          </table>
          {!activeItems.length && <p className="p-5 text-center text-sm text-slate-600">当前没有 staging 样本。</p>}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h3 className="text-lg font-black text-white">2. 小红书 content_pattern_dataset</h3><p className="mt-2 text-sm text-slate-400">正式结构与小红书文案包均经过白名单和原文泄漏检查。</p></div>
          <div className="flex flex-wrap gap-2">
            <button disabled={!dataset.length} onClick={() => downloadFile(exportContentPatternDatasetJson(dataset))} className="rounded-xl border border-cyan-300/30 px-4 py-2 text-sm font-bold text-cyan-100 disabled:opacity-40">导出 JSON</button>
            <button disabled={!dataset.length} onClick={() => downloadFile(exportContentPatternDatasetCsv(dataset))} className="rounded-xl border border-cyan-300/30 px-4 py-2 text-sm font-bold text-cyan-100 disabled:opacity-40">导出 CSV</button>
            <button disabled={!dataset.length} onClick={() => downloadFile(exportContentPatternSeedJson(dataset))} className="rounded-xl border border-pink-300/30 px-4 py-2 text-sm font-bold text-pink-100 disabled:opacity-40">导出为公共种子数据集 JSON</button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {dataset.slice(0, 100).map((item) => (
            <article key={item.pattern_id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-cyan-300/10 px-2 py-1 text-cyan-100">{getContentPatternPlatformLabel(item.platform)}</span><span className="rounded-full bg-white/[0.07] px-2 py-1 text-slate-300">{item.category_key || "未分类"}</span><span className="rounded-full bg-white/[0.07] px-2 py-1 text-slate-300">{getContentPatternHookLabel(item.hook_type)}</span><span className={`rounded-full px-2 py-1 ${item.human_reviewed ? "bg-emerald-300/15 text-emerald-200" : "bg-amber-300/10 text-amber-200"}`}>{item.human_reviewed ? "已审核" : "未审核"}</span>{item.copywriting_generated && <span className="rounded-full bg-pink-300/10 px-2 py-1 text-pink-200">已生成小红书文案</span>}</div>
                  <p className="mt-3 text-sm font-bold leading-6 text-white">{item.title_structure || "未填写标题结构"}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.opening_structure || "未填写开头结构"}</p>
                  <p className="mt-2 break-all text-[11px] text-slate-600">{item.structure_fingerprint} · raw_text_stored=false</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button onClick={() => setEditingId(editingId === item.pattern_id ? "" : item.pattern_id)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-200">展开并编辑</button>
                  <button onClick={() => setGeneratingId(generatingId === item.pattern_id ? "" : item.pattern_id)} className="rounded-xl border border-cyan-300/30 px-3 py-2 text-xs font-bold text-cyan-100">生成小红书文案</button>
                  <button onClick={() => toggleReviewed(item)} className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-black text-black">{item.human_reviewed ? "取消审核" : "标记已审核"}</button>
                  <button onClick={() => removeDatasetItem(item)} className="rounded-xl border border-rose-300/20 px-3 py-2 text-xs font-bold text-rose-200">删除</button>
                </div>
              </div>
              {editingId === item.pattern_id && <PatternEditor item={item} rawInput={rawInputForPattern(item)} onDone={(next) => { refresh(staging, next); setEditingId(""); setMessage("结构修改已保存，指纹已重新计算。"); }} onCancel={() => setEditingId("")} />}
              {generatingId === item.pattern_id && <CopywritingGenerator item={item} rawInput={rawInputForPattern(item)} onDone={(next, text) => { refresh(staging, next); setGeneratingId(""); setMessage(text); }} onCancel={() => setGeneratingId("")} />}
              {item.copywriting_generated && <CopywritingPackagePreview copy={item.copywriting_package} />}
            </article>
          ))}
          {!dataset.length && <p className="py-8 text-center text-sm text-slate-600">正式结构库为空。先导入 CSV 到 staging，再执行批量提取。</p>}
          {dataset.length > 100 && <p className="text-center text-xs text-slate-500">界面仅展示最近 100 条，导出包含全部 {dataset.length} 条。</p>}
        </div>
      </div>
    </section>
  );
}
