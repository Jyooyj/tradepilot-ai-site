import { feedbackFormUrl } from "../constants/uiContent";

export default function FloatingFeedback({ open, setOpen }) {
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-emerald-300/40 bg-[#0d2017] px-4 py-3 text-sm font-black text-emerald-200 shadow-2xl shadow-black/40 transition hover:-translate-y-0.5 hover:bg-emerald-300 hover:text-black"
      >
        反馈建议
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 py-5 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-xl rounded-[2rem] border border-emerald-300/20 bg-[#08100d] p-5 text-white shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">Feedback</p>
                <h2 className="mt-2 text-2xl font-black leading-tight">帮助 TradePilot AI 变得更懂进货场景</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-black text-slate-200 hover:bg-white/10"
              >
                关闭
              </button>
            </div>

            <p className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-100">
              如果你觉得报告不够准确，或希望增加功能，请通过问卷星反馈表提交建议。反馈会直接汇总到项目团队，方便后续优化。
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-6 text-slate-400">
                问卷约 1 分钟完成，感谢你帮助我们优化进货决策智能体。
              </p>
              <a
                href={feedbackFormUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-emerald-300 px-5 py-3 text-center font-black text-black shadow-lg shadow-emerald-300/10"
              >
                填写反馈表
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// component extracted from App.jsx
