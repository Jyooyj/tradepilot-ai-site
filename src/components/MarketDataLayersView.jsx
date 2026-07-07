import { Layers } from "lucide-react";
import {
  MARKET_DATA_LAYERS,
  MARKET_DATA_LAYER_NOTE,
  MARKET_DATA_PANEL_FOOTNOTE,
  MARKET_DATA_PITCH_NOTE,
} from "../utils/marketDataLayer";

const TIER_TONE = [
  "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  "border-amber-300/25 bg-amber-300/10 text-amber-100",
  "border-white/10 bg-white/[0.05] text-slate-300",
];

export default function MarketDataLayersView({ showPitch = false }) {
  return (
    <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-black text-emerald-200">
        <Layers className="h-4 w-4" aria-hidden="true" />
        Market Data Layer
      </p>
      <h2 className="mt-2 text-2xl font-black text-white">市场数据源分层</h2>
      <p className="mt-2 text-sm leading-7 text-slate-400">
        通过用户手动输入、供应链行情、自有测款数据和后续外部数据源预留，增强选品判断的市场依据。
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {MARKET_DATA_LAYERS.map((layer, index) => (
          <div key={layer.key} className={`rounded-2xl border p-4 ${TIER_TONE[index] || TIER_TONE[3]}`}>
            <p className="text-xs font-black uppercase tracking-wide opacity-80">第{["一", "二", "三", "四"][index]}层</p>
            <p className="mt-1 text-lg font-black text-white">{layer.name}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {layer.items.map((item) => (
                <span key={item} className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-slate-200">{item}</span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-400">{layer.note}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-slate-300">{MARKET_DATA_LAYER_NOTE}</p>
      <p className="mt-3 text-xs leading-6 text-slate-500">{MARKET_DATA_PANEL_FOOTNOTE}</p>
      {showPitch && (
        <p className="mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-sm leading-7 text-emerald-50">{MARKET_DATA_PITCH_NOTE}</p>
      )}
    </section>
  );
}
