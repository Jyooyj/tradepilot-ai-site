import React, { useMemo, useState } from "react";
import {
  MAX_REFERENCE_ITEMS,
  parseReferenceCsv,
  sanitizeReferenceItems,
} from "../utils/contentPatternUtils";
import { extractContentPattern, generateXiaohongshuCopywriting } from "../utils/contentPatternClient";
import {
  deleteContentPattern,
  loadContentPatterns,
  saveContentPattern,
} from "../services/contentPatternStorage";
import ContentPatternDatabasePanel from "./ContentPatternDatabasePanel";
import PolicyRiskPanel from "./PolicyRiskPanel";
import { analyzePolicyRisk } from "../utils/policyRiskEngine";

const blankReference = () => ({ title: "", body: "" });

function Field({ label, value, onChange, placeholder, textarea = false, rows = 4 }) {
  const common = "mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/60";
  return (
    <label className="block min-w-0">
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      {textarea ? (
        <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${common} resize-y`} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={common} />
      )}
    </label>
  );
}

function PatternList({ title, items }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-200">
        {(items || []).map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
      </ul>
    </div>
  );
}

function PatternPreview({ pattern }) {
  if (!pattern) return null;
  return (
    <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.07] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-emerald-300">{pattern.source === "ai" ? "AI 提取" : "本地规则提取"}</p>
          <h3 className="mt-1 text-xl font-black text-white">{pattern.name}</h3>
          <p className="mt-1 text-sm text-slate-400">{pattern.targetScene} · 基于 {pattern.sourceCount} 条参考输入</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(pattern.styleTags || []).map((tag) => <span key={tag} className="rounded-full bg-white/[0.07] px-3 py-1 text-xs text-slate-200">{tag}</span>)}
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-black/20 p-4">
          <p className="text-xs font-bold text-slate-500">标题公式</p>
          <p className="mt-2 text-sm leading-6 text-white">{pattern.headlineFormula}</p>
        </div>
        <div className="rounded-2xl bg-black/20 p-4">
          <p className="text-xs font-bold text-slate-500">开头钩子</p>
          <p className="mt-2 text-sm leading-6 text-white">{pattern.openingHook}</p>
        </div>
        <PatternList title="叙事顺序" items={pattern.narrativeFlow} />
        <PatternList title="说服元素" items={pattern.persuasionElements} />
        <PatternList title="原创规则" items={pattern.originalityRules} />
        <PatternList title="合规提醒" items={pattern.complianceNotes} />
      </div>
    </div>
  );
}

function XiaohongshuCopyPreview({ copy, source }) {
  if (!copy?.xiaohongshu) return null;
  const xhs = copy.xiaohongshu;
  return (
    <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.07] p-5">
      <p className="text-xs font-bold text-cyan-300">{source === "ai" ? "AI 原创小红书文案" : "本地原创小红书文案"}</p>
      <h3 className="mt-3 text-lg font-black text-white">标题备选</h3>
      <ol className="mt-2 space-y-2 text-sm leading-6 text-slate-200">
        {xhs.titles.map((title, index) => <li key={`${title}-${index}`}>{index + 1}. {title}</li>)}
      </ol>
      <PatternList title="封面字" items={xhs.cover_texts} />
      <PatternList title="正文开头备选" items={xhs.openings} />
      <h3 className="mt-5 font-black text-white">完整图文正文</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">{xhs.body}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <PatternList title="正文结构 / 排版建议" items={xhs.layout_suggestions} />
        <PatternList title="结尾互动引导" items={xhs.ending_guides} />
        <PatternList title="配图建议" items={xhs.image_suggestions} />
        <PatternList title="商品卖点短句" items={copy.selling_points?.core_lines} />
        <PatternList title="内容生成依据" items={[
          `结构类型：${copy.generation_basis?.pattern_type || "通用种草型"}`,
          `平台风格：${copy.generation_basis?.platform_style || "小红书图文"}`,
          `目标人群：${copy.generation_basis?.target_audience || "待补充"}`,
        ]} />
        <PatternList title="安全提醒" items={copy.generation_basis?.safety_notes} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {xhs.hashtags.map((tag) => <span key={tag} className="rounded-full bg-black/25 px-3 py-1 text-xs text-cyan-100">#{tag.replace(/^#/, "")}</span>)}
      </div>
      <div className="mt-5">
        <PolicyRiskPanel
          report={analyzePolicyRisk({
            title: xhs.titles,
            body: xhs.body,
            hashtags: xhs.hashtags,
            sellingPoints: [...(xhs.cover_texts || []), ...(copy.selling_points?.core_lines || [])],
            channel: "小红书",
          })}
          title="文案包政策风险提示"
        />
      </div>
    </div>
  );
}

export default function ContentPatternView() {
  const [references, setReferences] = useState([blankReference()]);
  const [patternName, setPatternName] = useState("通用种草内容结构");
  const [targetScene, setTargetScene] = useState("小红书图文笔记");
  const [pattern, setPattern] = useState(null);
  const [patterns, setPatterns] = useState(() => loadContentPatterns());
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [brief, setBrief] = useState({
    topic: "",
    audience: "",
    channel: "小红书图文",
    goal: "",
    keyPoints: "",
    tone: "真实、克制、自然",
    avoid: "不夸大功效，不编造销量与用户反馈",
  });
  const [originalCopy, setOriginalCopy] = useState(null);
  const [copySource, setCopySource] = useState("fallback");

  const validReferences = useMemo(() => sanitizeReferenceItems(references), [references]);

  function updateReference(index, field, value) {
    setReferences((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function removeReference(index) {
    setReferences((current) => current.length === 1 ? [blankReference()] : current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage("CSV 文件请控制在 2MB 以内；建议只导入用于提炼结构的必要文本。");
      return;
    }
    try {
      const parsed = parseReferenceCsv(await file.text());
      if (!parsed.items.length) {
        setMessage("没有识别到参考内容。CSV 建议使用 title、body 两列，文件编码为 UTF-8。");
        return;
      }
      const existing = sanitizeReferenceItems(references);
      const importedCount = Math.max(0, Math.min(parsed.items.length, MAX_REFERENCE_ITEMS - existing.length));
      setReferences([...existing, ...parsed.items].slice(0, MAX_REFERENCE_ITEMS));
      setMessage(`已导入 ${importedCount} 条参考内容${parsed.truncated || importedCount < parsed.items.length ? "，超出上限的行已忽略" : ""}。内容仅保留在当前页面内存。`);
    } catch (error) {
      setMessage("CSV 读取失败，请检查文件是否为 UTF-8 编码及逗号分隔格式。");
    }
  }

  async function extractPattern() {
    if (!validReferences.length) {
      setMessage("请至少填写一条参考标题或正文，再提取结构。");
      return;
    }
    setExtracting(true);
    setMessage("正在提取抽象结构；不会抓取外部平台，也不会保存原始参考内容。");
    const result = await extractContentPattern({ references: validReferences, name: patternName, targetScene });
    setPattern(result.pattern);
    setMessage(result.message);
    setExtracting(false);
  }

  function savePattern() {
    if (!pattern) {
      setMessage("请先提取一个内容结构。");
      return;
    }
    const result = saveContentPattern(pattern);
    setPatterns(result.patterns);
    setPattern(result.pattern || pattern);
    setMessage(result.message);
  }

  function usePattern(item) {
    setPattern(item);
    setPatternName(item.name);
    setTargetScene(item.targetScene);
    setMessage("已选用这个结构。结构库中不含原始参考标题或正文。");
  }

  function removePattern(id) {
    setPatterns(deleteContentPattern(id));
    if (pattern?.id === id) setPattern(null);
    setMessage("结构已从当前浏览器删除。");
  }

  async function generateCopy() {
    if (!pattern) {
      setCopyMessage("请先提取或选择一个内容结构。");
      return;
    }
    if (!brief.topic.trim()) {
      setCopyMessage("请填写商品 / 主题名称。");
      return;
    }
    setGenerating(true);
    setCopyMessage("正在按抽象结构生成小红书图文文案……");
    const result = await generateXiaohongshuCopywriting({ pattern, brief });
    setOriginalCopy(result.copywritingPackage);
    setCopySource(result.source);
    setCopyMessage(result.message);
    setGenerating(false);
  }

  async function copyOriginalContent() {
    if (!originalCopy) return;
    const content = [
      "标题备选：",
      ...originalCopy.xiaohongshu.titles.map((title, index) => `${index + 1}. ${title}`),
      "",
      "封面字：",
      ...originalCopy.xiaohongshu.cover_texts.map((text, index) => `${index + 1}. ${text}`),
      "",
      "正文开头备选：",
      ...originalCopy.xiaohongshu.openings.map((text, index) => `${index + 1}. ${text}`),
      "",
      originalCopy.xiaohongshu.body,
      "",
      "结尾互动：",
      ...originalCopy.xiaohongshu.ending_guides,
      "",
      originalCopy.xiaohongshu.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" "),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(content);
      setCopyMessage("小红书图文文案已复制，请在发布前核对事实与平台规则。");
    } catch (error) {
      setCopyMessage("浏览器未允许复制，请手动选择文本复制。");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
        <p className="text-sm font-bold text-emerald-300">小红书图文帖子结构库</p>
        <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">参考内容 → 抽象结构 → 小红书图文文案</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
          仅处理你主动输入或导入的文本，不连接、不爬取任何内容平台。下方正式数据库流程会把原文短期放入独立 staging；content_pattern_dataset 只保存抽象写作结构，不保存原文。
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100">CSV 仅支持 title / body（或 标题 / 正文）文本列，不需要账号与用户数据。</div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">参考内容不会写入结构库；刷新页面或离开本页后不保证保留。</div>
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100">生成结果是原创小红书图文文案，发布前仍需人工核对事实、价格与平台规则。</div>
        </div>
      </section>

      <ContentPatternDatabasePanel />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="min-w-0 rounded-[2rem] border border-white/10 bg-black/25 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-white">1. 输入参考内容</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">最多 {MAX_REFERENCE_ITEMS} 条。无需填写平台、作者、账号、评论或粉丝信息。</p>
            </div>
            <label className="cursor-pointer rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-center text-sm font-black text-cyan-100">
              导入 UTF-8 CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv} />
            </label>
          </div>

          <div className="mt-5 space-y-4">
            {references.map((item, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white">参考内容 {index + 1}</p>
                  <button onClick={() => removeReference(index)} className="text-xs font-bold text-slate-500 hover:text-rose-300">移除</button>
                </div>
                <div className="mt-3 space-y-3">
                  <Field label="参考标题（可选）" value={item.title} onChange={(value) => updateReference(index, "title", value)} placeholder="粘贴你有权使用的参考标题" />
                  <Field label="参考正文（可选）" value={item.body} onChange={(value) => updateReference(index, "body", value)} placeholder="只粘贴提炼结构所需的正文，不要加入用户资料" textarea rows={5} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button disabled={references.length >= MAX_REFERENCE_ITEMS} onClick={() => setReferences((items) => [...items, blankReference()])} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white disabled:opacity-40">新增一条</button>
            <button onClick={() => { setReferences([blankReference()]); setMessage("参考内容已从当前页面清空。"); }} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-400">清空参考内容</button>
          </div>
        </section>

        <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
          <h3 className="text-xl font-black text-white">2. AI 提取结构</h3>
          <div className="mt-4 space-y-3">
            <Field label="结构名称" value={patternName} onChange={setPatternName} placeholder="如：通勤饰品种草结构" />
            <Field label="适用场景" value={targetScene} onChange={setTargetScene} placeholder="如：小红书图文笔记" />
          </div>
          <button disabled={extracting} onClick={extractPattern} className="mt-5 w-full rounded-2xl bg-emerald-300 px-5 py-4 font-black text-black disabled:opacity-60">
            {extracting ? "正在提取结构……" : `提取结构（当前 ${validReferences.length} 条）`}
          </button>
          {message && <p className="mt-4 rounded-2xl bg-black/20 p-4 text-sm leading-6 text-slate-300">{message}</p>}
          {pattern && (
            <button onClick={savePattern} className="mt-3 w-full rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 font-black text-emerald-100">保存抽象结构到本地结构库</button>
          )}

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-white">我的结构库</h3>
              <span className="text-xs text-slate-500">当前浏览器 · {patterns.length}/50</span>
            </div>
            {!patterns.length && <p className="mt-3 text-sm leading-6 text-slate-500">还没有保存结构。提取后可只保存抽象结构，不保存参考原文。</p>}
            <div className="mt-3 space-y-3">
              {patterns.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-black text-white">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.targetScene} · {item.sourceCount} 条参考</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => usePattern(item)} className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-black">使用</button>
                    <button onClick={() => removePattern(item.id)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-400">删除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <PatternPreview pattern={pattern} />

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
        <h3 className="text-xl font-black text-white">3. 基于结构生成小红书图文文案</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">生成标题、封面字、正文开头、完整正文、互动引导、标签、配图和排版建议；不会再次发送参考原文。</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="商品 / 主题名称 *" value={brief.topic} onChange={(value) => setBrief((item) => ({ ...item, topic: value }))} placeholder="如：轻量通勤珍珠耳夹" />
          <Field label="目标人群" value={brief.audience} onChange={(value) => setBrief((item) => ({ ...item, audience: value }))} placeholder="如：需要无耳洞配饰的通勤女生" />
          <Field label="发布渠道" value={brief.channel} onChange={(value) => setBrief((item) => ({ ...item, channel: value }))} placeholder="小红书图文" />
          <Field label="内容目标" value={brief.goal} onChange={(value) => setBrief((item) => ({ ...item, goal: value }))} placeholder="种草、测款、收集评论/收藏反馈" />
          <Field label="已核实卖点 / 事实" value={brief.keyPoints} onChange={(value) => setBrief((item) => ({ ...item, keyPoints: value }))} placeholder="只填写已确认的信息、材质、场景与使用细节" textarea rows={4} />
          <div className="space-y-3">
            <Field label="语气" value={brief.tone} onChange={(value) => setBrief((item) => ({ ...item, tone: value }))} placeholder="如：真实、克制、自然" />
            <Field label="禁用表达" value={brief.avoid} onChange={(value) => setBrief((item) => ({ ...item, avoid: value }))} placeholder="如：不写绝对功效与虚假稀缺" />
          </div>
        </div>
        <button disabled={generating} onClick={generateCopy} className="mt-5 w-full rounded-2xl bg-cyan-300 px-5 py-4 font-black text-black disabled:opacity-60">
          {generating ? "正在生成小红书图文文案……" : "生成原创小红书文案"}
        </button>
        {copyMessage && <p className="mt-4 rounded-2xl bg-black/20 p-4 text-sm leading-6 text-slate-300">{copyMessage}</p>}
        {originalCopy && <div className="mt-5"><XiaohongshuCopyPreview copy={originalCopy} source={copySource} /><button onClick={copyOriginalContent} className="mt-3 w-full rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 font-black text-cyan-100">复制小红书图文文案</button></div>}
      </section>
    </div>
  );
}
