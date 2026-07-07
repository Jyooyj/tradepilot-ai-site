import { useEffect, useMemo, useState } from "react";
import { getRecordMetrics, getRecordReport } from "../../App.jsx";
import ProductBackupActions from "./ProductBackupActions";
import {
  CATEGORY_GROUPS,
  CHANNEL_GROUPS,
  STATUS_TABS,
  buildLibraryOverview,
  buildOverviewSentence,
  buildReplenishAdvice,
  buildStatusCounts,
  filterRecords,
  formatCategoryDisplay,
  formatMarginDisplay,
  formatPriceDisplay,
  getNextStepSuggestion,
  getProductStatus,
} from "../utils/productLibraryUtils";

const STATUS_PILL_TONE = {
  待补充信息: "bg-amber-300/15 text-amber-100 border-amber-300/30",
  建议拿样: "bg-emerald-300/15 text-emerald-100 border-emerald-300/30",
  已拿样: "bg-cyan-300/15 text-cyan-100 border-cyan-300/30",
  正在测款: "bg-sky-300/15 text-sky-100 border-sky-300/30",
  建议补货: "bg-teal-300/15 text-teal-100 border-teal-300/30",
  建议放弃: "bg-slate-300/10 text-slate-300 border-white/15",
};

const QUICK_STATUS_ACTIONS = [
  { label: "标记为已拿样", status: "已拿样" },
  { label: "标记为正在测款", status: "正在测款" },
  { label: "标记为建议补货", status: "建议补货" },
  { label: "标记为建议放弃", status: "建议放弃" },
];

const DEFAULT_VISIBLE = 6;

function OverviewStat({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-2 break-words text-xl font-black text-white">{value}</p>
    </div>
  );
}

function LibraryCard({ record, status, onDelete, onRestore, onGoReview, onAddToPk, onMarkStatus }) {
  const metrics = getRecordMetrics(record);
  const displayReport = getRecordReport(record);
  const nextStep = getNextStepSuggestion(status);
  const pillTone = STATUS_PILL_TONE[status] || STATUS_PILL_TONE["待补充信息"];
  const replenish = status === "建议补货" ? buildReplenishAdvice(record) : null;
  const createdAt = record.created_at ? new Date(record.created_at).toLocaleString() : "时间待补充";

  return (
    <article className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        {record.product?.imagePreview && (
          <img src={record.product.imagePreview} alt="" className="max-h-64 w-full rounded-2xl object-cover sm:h-24 sm:w-24" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-lg font-black text-white sm:text-xl sm:truncate">
            {metrics.displayName || record.product_name || "未命名产品"}
          </h3>
          <p className="mt-2 break-words text-sm text-slate-400">
            {formatCategoryDisplay(record)} · {createdAt}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-emerald-300/10 px-3 py-1 font-bold text-emerald-200">评分：{record.score ?? "待补充"}</span>
            <span className={`rounded-full border px-3 py-1 font-bold ${pillTone}`}>状态：{status}</span>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 font-bold text-slate-300">售价：{formatPriceDisplay(record)}</span>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 font-bold text-slate-300">毛利率：{formatMarginDisplay(record)}</span>
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/5 px-4 py-3 text-sm leading-7 text-emerald-50">
        下一步建议：{nextStep}
      </p>

      {replenish && (
        <div className="mt-3 rounded-2xl border border-teal-300/20 bg-teal-300/5 px-4 py-3 text-sm leading-7 text-teal-50">
          <p className="font-black text-teal-100">{replenish.title}</p>
          {replenish.quantity && <p className="mt-1">建议数量：{replenish.quantity}</p>}
          <p className="mt-1 text-teal-50/90">原因：{replenish.reason}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => onRestore(record)} className="min-h-11 rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-black text-black">查看报告</button>
        {onGoReview && (
          <button onClick={() => onGoReview(record)} className="min-h-11 rounded-2xl border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm font-bold text-sky-100">去测款复盘</button>
        )}
        {onAddToPk && (
          <button onClick={() => onAddToPk(record)} className="min-h-11 rounded-2xl border border-violet-300/30 bg-violet-300/10 px-4 py-2 text-sm font-bold text-violet-100">加入候选 PK</button>
        )}
        <button onClick={() => onDelete(record.id)} className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white">删除</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_STATUS_ACTIONS.map((action) => (
          <button
            key={action.status}
            onClick={() => onMarkStatus(record.id, action.status)}
            disabled={status === action.status}
            className={`min-h-9 rounded-full border px-3 py-1 text-xs font-bold transition ${
              status === action.status
                ? "cursor-default border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
                : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-emerald-300/30 hover:text-emerald-100"
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>

      {displayReport && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-bold text-emerald-300">展开报告</summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-white/[0.06] p-4 text-xs leading-6 text-slate-300">{displayReport}</pre>
        </details>
      )}
    </article>
  );
}

export default function HistoryView({ records, storageStatus, loading, message, onDelete, onRestore, onGoReview, onAddToPk, onRefresh, onLoadDemo, onExportBackup, onExportCsv, onExportDocument, onImportBackup, search, setSearch, sortMode, setSortMode }) {
  const safeRecords = Array.isArray(records) ? records : [];
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const effectiveMode = storageStatus?.effectiveMode || storageStatus?.mode || "local";
  const showLocalStorageRisk = effectiveMode !== "cloud";

  const [statusTab, setStatusTab] = useState("全部");
  const [categoryFilter, setCategoryFilter] = useState("全部类目");
  const [channelFilter, setChannelFilter] = useState("全部渠道");
  const [statusOverrides, setStatusOverrides] = useState({});
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE);

  function handleMarkStatus(recordId, nextStatus) {
    setStatusOverrides((current) => ({ ...current, [recordId]: nextStatus }));
  }

  const overview = useMemo(() => buildLibraryOverview(safeRecords, statusOverrides), [safeRecords, statusOverrides]);
  const statusCounts = useMemo(() => buildStatusCounts(safeRecords, statusOverrides), [safeRecords, statusOverrides]);

  const searchedRecords = useMemo(() => {
    if (!normalizedSearch) return safeRecords;
    return safeRecords.filter((record) => {
      const name = `${record.product_name || ""} ${record.product?.name || ""}`.toLowerCase();
      const category = `${record.category || ""} ${record.product?.category || ""}`.toLowerCase();
      return name.includes(normalizedSearch) || category.includes(normalizedSearch);
    });
  }, [safeRecords, normalizedSearch]);

  const filteredRecords = useMemo(() => {
    const filtered = filterRecords(searchedRecords, {
      statusTab,
      category: categoryFilter,
      channel: channelFilter,
      overrides: statusOverrides,
    });
    return [...filtered].sort((a, b) => {
      if (sortMode === "score_desc") return (b.score || 0) - (a.score || 0);
      if (sortMode === "score_asc") return (a.score || 0) - (b.score || 0);
      if (sortMode === "saved_asc") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [searchedRecords, statusTab, categoryFilter, channelFilter, statusOverrides, sortMode]);

  const visibleRecords = filteredRecords.slice(0, visibleCount);
  const hasMore = filteredRecords.length > visibleRecords.length;

  // 切换筛选时重置“查看更多”。
  const filterSignature = `${statusTab}|${categoryFilter}|${channelFilter}|${normalizedSearch}`;
  useEffect(() => {
    setVisibleCount(DEFAULT_VISIBLE);
  }, [filterSignature]);

  return (
    <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-emerald-300">My Product Library</p>
          <h2 className="break-words text-2xl font-black text-white sm:text-3xl">我的产品库</h2>
          <p className="mt-2 break-words text-sm leading-7 text-slate-400">保存进货判断、测款结论和完整报告，形成长期选品资产。</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
          <button onClick={onRefresh} className="min-h-11 w-full rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black sm:w-auto">刷新产品库</button>
          <button onClick={onExportDocument} className="min-h-11 w-full rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 font-black text-amber-100 sm:w-auto">导出产品库文档</button>
        </div>
      </div>

      {/* 一、产品库概览 */}
      {!loading && safeRecords.length > 0 && (
        <div className="mb-5 rounded-3xl border border-emerald-300/15 bg-emerald-300/5 p-5">
          <p className="text-sm font-black text-emerald-200">产品库概览</p>
          <p className="mt-2 text-sm leading-7 text-slate-200">{buildOverviewSentence(overview)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            <OverviewStat label="总产品数" value={overview.total} />
            <OverviewStat label="建议拿样" value={overview.suggestSample} />
            <OverviewStat label="正在测款" value={overview.testing} />
            <OverviewStat label="建议补货" value={overview.replenish} />
            <OverviewStat label="建议放弃" value={overview.reject} />
            <OverviewStat label="平均评分" value={overview.averageScore == null ? "待补充" : overview.averageScore} />
            <OverviewStat label="平均毛利率" value={overview.averageMargin == null ? "待补充" : `${Math.round(overview.averageMargin * 100)}%`} />
          </div>
        </div>
      )}

      <ProductBackupActions
        storageStatus={storageStatus}
        onExportJson={onExportBackup}
        onExportCsv={onExportCsv}
        onImportJson={onImportBackup}
      />

      {showLocalStorageRisk && (
        <div className="mb-5 break-words rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-100">
          备份提示：可用“导出产品库备份”保存 JSON 文件；更换浏览器、设备或清理缓存后，可通过“导入产品库备份”恢复记录。
        </div>
      )}

      {/* 二、状态分类 Tab */}
      {!loading && safeRecords.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-slate-400">状态分类</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => {
              const active = statusTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusTab(tab)}
                  className={`min-h-9 rounded-full border px-4 py-1.5 text-sm font-bold transition ${
                    active
                      ? "border-emerald-300/50 bg-emerald-300 text-black"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-emerald-300/30 hover:text-emerald-100"
                  }`}
                >
                  {tab} <span className={active ? "text-black/70" : "text-slate-500"}>{statusCounts[tab] || 0}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 三、类目分类 + 四、渠道筛选 + 搜索 / 排序 */}
      {!loading && safeRecords.length > 0 && (
        <div className="mb-5 grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <span className="text-xs font-semibold text-slate-400">类目分类</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
              {CATEGORY_GROUPS.map((group) => <option key={group} value={group} className="bg-[#08100d]">{group}</option>)}
            </select>
          </label>
          <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <span className="text-xs font-semibold text-slate-400">渠道筛选</span>
            <select value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
              {CHANNEL_GROUPS.map((group) => <option key={group} value={group} className="bg-[#08100d]">{group}</option>)}
            </select>
          </label>
          <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <span className="text-xs font-semibold text-slate-400">搜索产品名称 / 品类</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="如：珍珠、发饰、家居生活" className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
          </label>
          <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <span className="text-xs font-semibold text-slate-400">排序</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
              <option value="saved_desc" className="bg-[#08100d]">保存时间：最新</option>
              <option value="saved_asc" className="bg-[#08100d]">保存时间：最早</option>
              <option value="score_desc" className="bg-[#08100d]">评分：高到低</option>
              <option value="score_asc" className="bg-[#08100d]">评分：低到高</option>
            </select>
          </label>
        </div>
      )}

      {loading && <div className="rounded-3xl bg-black/25 p-6 text-slate-300">正在读取产品库...</div>}
      {message && <div className="mb-4 break-words rounded-3xl bg-amber-300/10 p-5 text-amber-100">{message}</div>}

      {!loading && safeRecords.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/20 bg-black/25 p-8 text-center">
          <h3 className="text-2xl font-black text-white">产品库还是空的</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            先生成一份进货报告，再点击“保存到我的产品库”。游客演示模式会把记录暂存在本浏览器中。
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={onRefresh} className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-bold text-white">重新读取</button>
            <button onClick={onLoadDemo} className="rounded-2xl bg-emerald-300 px-5 py-3 font-black text-black">加载示例产品</button>
          </div>
        </div>
      )}

      {/* 七、当前分类无商品的空状态 */}
      {!loading && safeRecords.length > 0 && filteredRecords.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/20 bg-black/25 p-8 text-center">
          <h3 className="text-xl font-black text-white">当前分类暂无产品</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            你可以从进货报告页保存候选产品，或切换其他分类查看。
          </p>
        </div>
      )}

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {visibleRecords.map((record) => (
          <LibraryCard
            key={record.id}
            record={record}
            status={getProductStatus(record, statusOverrides[record.id])}
            onDelete={onDelete}
            onRestore={onRestore}
            onGoReview={onGoReview}
            onAddToPk={onAddToPk}
            onMarkStatus={handleMarkStatus}
          />
        ))}
      </div>

      {/* 七、查看更多 */}
      {hasMore && (
        <div className="mt-5 flex justify-center">
          <button
            onClick={() => setVisibleCount((count) => count + DEFAULT_VISIBLE)}
            className="min-h-11 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-6 py-3 font-black text-emerald-100"
          >
            查看更多（剩余 {filteredRecords.length - visibleRecords.length} 个）
          </button>
        </div>
      )}
    </section>
  );
}
