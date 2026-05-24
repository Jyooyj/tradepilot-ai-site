import { statusOptions } from "../constants/uiContent";
import { getRecordStatus, HistoryCard } from "../../App.jsx";
import ProductBackupActions from "./ProductBackupActions";

export default function HistoryView({ records, storageStatus, loading, message, onDelete, onRestore, onRefresh, onLoadDemo, onExportBackup, onExportCsv, onExportDocument, onImportBackup, search, setSearch, statusFilter, setStatusFilter, sortMode, setSortMode }) {
  const safeRecords = Array.isArray(records) ? records : [];
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const effectiveMode = storageStatus?.effectiveMode || storageStatus?.mode || "local";
  const showLocalStorageRisk = effectiveMode !== "cloud";
  const filteredRecords = safeRecords
    .filter((record) => {
      const status = getRecordStatus(record);
      const name = `${record.product_name || ""} ${record.product?.name || ""}`.toLowerCase();
      const category = `${record.category || ""} ${record.product?.category || ""}`.toLowerCase();
      const matchSearch = !normalizedSearch || name.includes(normalizedSearch) || category.includes(normalizedSearch);
      const matchStatus = statusFilter === "全部" || status.includes(statusFilter);
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortMode === "score_desc") return (b.score || 0) - (a.score || 0);
      if (sortMode === "score_asc") return (a.score || 0) - (b.score || 0);
      if (sortMode === "saved_asc") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

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

      <div className="mb-5 grid min-w-0 gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <span className="text-xs font-semibold text-slate-400">搜索产品名称 / 品类</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="如：珍珠、发饰、家居生活" className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
        </label>
        <label className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <span className="text-xs font-semibold text-slate-400">状态筛选</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold text-white outline-none">
            {statusOptions.map((status) => <option key={status} value={status} className="bg-[#08100d]">{status}</option>)}
          </select>
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

      {!loading && safeRecords.length > 0 && filteredRecords.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/20 bg-black/25 p-8 text-center text-slate-400">
          没有匹配的产品记录。可以调整搜索词或状态筛选。
        </div>
      )}

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {filteredRecords.map((record) => (
          <HistoryCard key={record.id} record={record} onDelete={onDelete} onRestore={onRestore} />
        ))}
      </div>
    </section>
  );
}
