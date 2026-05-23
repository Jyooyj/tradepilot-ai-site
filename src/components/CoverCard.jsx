export default function CoverCard({ title, desc, onClick, highlight }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[2rem] border p-6 text-left transition hover:-translate-y-1 hover:shadow-2xl ${
        highlight ? "border-emerald-300 bg-emerald-300 text-black shadow-emerald-300/20" : "border-white/10 bg-white/[0.06] text-white"
      }`}
    >
      <h3 className="text-2xl font-black">{title}</h3>
      <p className={`mt-3 text-sm leading-7 ${highlight ? "text-black/70" : "text-slate-400"}`}>{desc}</p>
      <p className="mt-6 font-black">进入 →</p>
    </button>
  );
}
