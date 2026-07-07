import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { generateSupplierCommunicationPack } from "../utils/supplierCommunicationUtils";

function asArray(value) {
  return Array.isArray(value) ? value : [];
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

function MessageCard({ block, copiedTitle, onCopy }) {
  const isCopied = copiedTitle === block.title;

  return (
    <article className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-black text-emerald-100">{block.title}</h3>
        <button
          type="button"
          onClick={() => onCopy(block)}
          className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-black text-emerald-100 transition hover:border-emerald-200/60 hover:bg-emerald-300/20"
          title={`复制${block.title}`}
        >
          {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {isCopied ? "已复制" : "复制"}
        </button>
      </div>
      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-300">
        {block.content || "暂无供应商沟通建议"}
      </p>
    </article>
  );
}

export default function SupplierCommunicationPanel({ product, result }) {
  const [copiedTitle, setCopiedTitle] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const communicationPack = useMemo(
    () => generateSupplierCommunicationPack(product || {}, result || {}),
    [product, result]
  );

  const copyBlocks = asArray(communicationPack.copyBlocks).length
    ? asArray(communicationPack.copyBlocks)
    : [{ title: "供应商沟通建议", content: "暂无供应商沟通建议" }];
  const riskQuestions = asArray(communicationPack.riskCheckQuestions).length
    ? asArray(communicationPack.riskCheckQuestions)
    : ["暂无供应商沟通建议"];

  async function handleCopy(block) {
    const content = block?.content || "";
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

    setCopiedTitle(block.title);
    setCopyNotice(ok ? `已复制：${block.title}` : "复制失败，请手动选择文本复制");
    const timer = typeof window !== "undefined" ? window.setTimeout : setTimeout;
    timer(() => {
      setCopiedTitle("");
      setCopyNotice("");
    }, 1500);
  }

  return (
    <section className="rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold text-emerald-200">Supplier Communication Skill</p>
          <h2 className="mt-2 text-2xl font-black text-white">供应商沟通助手</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            基于当前商品信息、利润空间、MOQ 和风险提示生成可复制话术，用户可复制后自行与供应商确认价格、起订量、发货周期和售后规则。
          </p>
        </div>
        {copyNotice && (
          <span className="w-fit rounded-full border border-emerald-200/30 bg-black/25 px-4 py-2 text-xs font-black text-emerald-100">
            {copyNotice}
          </span>
        )}
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
        <h3 className="font-black text-emerald-100">沟通重点摘要</h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {communicationPack.summary || "暂无供应商沟通建议"}
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {copyBlocks.map((block) => (
          <MessageCard
            key={block.title}
            block={block}
            copiedTitle={copiedTitle}
            onCopy={handleCopy}
          />
        ))}
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
        <h3 className="font-black text-emerald-100">风险确认清单</h3>
        <ul className="mt-3 grid gap-2 text-sm leading-7 text-slate-300 md:grid-cols-2">
          {riskQuestions.map((question) => (
            <li key={question} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              {question}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
