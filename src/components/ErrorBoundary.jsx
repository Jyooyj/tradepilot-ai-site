import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("TradePilot runtime error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#06110d] px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
          <section className="w-full rounded-[2rem] border border-cyan-300/20 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/30 sm:p-8">
            <p className="text-sm font-black text-cyan-200">TradePilot AI</p>
            <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">页面暂时出现异常</h1>
            <p className="mt-4 break-words text-sm leading-7 text-slate-300 sm:text-base">
              TradePilot AI 已捕获本次运行错误，可能是图片数据、图表渲染或旧记录字段缺失导致。你可以刷新页面后重试，或返回首页重新生成报告。已保存的本地产品库记录不会因为本次页面异常自动删除。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={this.handleReload}
                className="min-h-12 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-black text-black"
              >
                刷新页面
              </button>
              <button
                type="button"
                onClick={this.handleHome}
                className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white"
              >
                返回首页
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }
}
