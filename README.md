import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      info: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error("页面运行错误：", error, info);
    this.setState({
      error,
      info,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#08100d] px-6 py-16 text-white">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-red-300/30 bg-red-300/10 p-8">
            <h1 className="text-3xl font-black text-red-200">
              页面运行出错
            </h1>

            <p className="mt-4 text-slate-300">
              这不是服务器坏了，是前端某个变量或组件渲染时报错。
            </p>

            <div className="mt-6 rounded-2xl bg-black/40 p-5">
              <p className="font-black text-red-200">错误信息：</p>
              <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-red-100">
                {String(this.state.error?.message || this.state.error)}
              </pre>
            </div>

            {this.state.info?.componentStack && (
              <div className="mt-6 rounded-2xl bg-black/40 p-5">
                <p className="font-black text-amber-200">组件位置：</p>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-6 text-slate-300">
                  {this.state.info.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
