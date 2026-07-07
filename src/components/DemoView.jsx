import { demoProducts } from "../constants/demoData";
import MarketDataLayersView from "./MarketDataLayersView";
import InternalTestDataBoard from "./InternalTestDataBoard";

export default function DemoView({ applyDemo, records }) {
  const hasRecords = Array.isArray(records) && records.length > 0;
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
        <p className="text-sm text-emerald-300">Judge Demo</p>
        <h2 className="text-3xl font-black">评委快速演示</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">不用依赖实时识图接口，直接查看多个不同品类的完整判断结果，保证现场展示稳定。</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {demoProducts.map((demo) => (
            <button key={demo.name} onClick={() => applyDemo(demo)} className="rounded-[2rem] border border-white/10 bg-black/30 p-6 text-left transition hover:-translate-y-1 hover:bg-white/[0.08]">
              <p className="text-sm text-emerald-300">{demo.category}</p>
              <h3 className="mt-2 text-2xl font-black text-white">{demo.name}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">{demo.note}</p>
              <p className="mt-5 font-black text-emerald-300">查看完整案例 →</p>
            </button>
          ))}
        </div>
      </section>

      <MarketDataLayersView showPitch />

      <InternalTestDataBoard records={records} demo={!hasRecords} />
    </div>
  );
}
