import React, { useEffect, useState } from "react";
import { hasSupabaseConfig, supabase } from "./supabaseClient";

export default function LoginGate({ children }) {
    const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem("tradepilot_demo_mode") === "1";
  });

  function enterDemoMode() {
    localStorage.setItem("tradepilot_demo_mode", "1");
    setDemoMode(true);
  }

  function exitDemoMode() {
    localStorage.removeItem("tradepilot_demo_mode");
    setDemoMode(false);
  }
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }

  if (!hasSupabaseConfig) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#08100d] px-6 text-white">
        <div className="max-w-xl rounded-[2rem] border border-red-300/20 bg-red-300/10 p-8">
          <h1 className="text-2xl font-black text-red-200">
            Supabase 环境变量未配置
          </h1>
          <p className="mt-4 leading-7 text-slate-300">
            请在 Vercel 环境变量里添加 VITE_SUPABASE_URL 和
            VITE_SUPABASE_ANON_KEY，然后重新部署。
          </p>
        </div>
      </div>
    );
  }

    if (demoMode) {
    return (
      <>
        <div className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-emerald-300/30 bg-black/80 px-4 py-2 text-sm text-white shadow-xl backdrop-blur">
          <span className="text-emerald-200 font-bold">评委演示模式</span>
          <button
            onClick={exitDemoMode}
            className="rounded-full bg-emerald-300 px-3 py-1 font-black text-black"
          >
            退出演示
          </button>
        </div>
        {children}
      </>
    );
  }
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#08100d] text-white">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center">
          <p className="text-xl font-black text-emerald-300">正在加载账户...</p>
          <p className="mt-2 text-sm text-slate-400">
            TradePilot AI 正在确认登录状态
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
     return <AuthPage onDemo={enterDemoMode} />;
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-sm text-white shadow-xl backdrop-blur">
        <span className="max-w-[180px] truncate text-slate-300">
          {session.user?.email}
        </span>
        <button
          onClick={logout}
          className="rounded-full bg-emerald-300 px-3 py-1 font-black text-black"
        >
          退出
        </button>
      </div>
      {children}
    </>
  );
}

function AuthPage({ onDemo }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    if (!supabase) {
      setMessage("Supabase 未配置，暂时无法注册登录。");
      return;
    }

    if (!email || !password) {
      setMessage("请填写邮箱和密码。");
      return;
    }

    if (password.length < 6) {
      setMessage("密码至少需要 6 位。");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nickname,
            },
          },
        });

        if (error) throw error;

        setMessage("注册成功。现在可以登录使用。");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage("登录成功，正在进入系统...");
      }
    } catch (error) {
      setMessage(error.message || "操作失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#08100d] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <main className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1fr_0.85fr]">
        <section>
          <div className="mb-6 inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-200">
            TradePilot AI 账户系统
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
         拍张照片
<span className="block text-emerald-300">AI 判断值不值得进货</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
  TradePilot AI｜拿货搭子 面向小商品进货、内容电商测款和大学生创业场景，帮助你完成图片识别、利润测算、爆款评分、内容测款和复盘决策。
</p>

<p className="mt-4 text-sm font-bold text-emerald-200">
  先算清楚，再决定进不进货；别让第一次进货，变成第一次压货。
</p>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 flex rounded-2xl bg-black/30 p-1">
            <button
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={`flex-1 rounded-xl px-4 py-3 font-black ${
                mode === "login"
                  ? "bg-emerald-300 text-black"
                  : "text-slate-300"
              }`}
            >
              登录
            </button>

            <button
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
              className={`flex-1 rounded-xl px-4 py-3 font-black ${
                mode === "register"
                  ? "bg-emerald-300 text-black"
                  : "text-slate-300"
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <label className="block rounded-2xl border border-white/10 bg-black/25 p-4">
                <span className="text-xs font-semibold text-slate-400">
                  昵称
                </span>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="如：乔伊"
                  className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
              </label>
            )}

            <label className="block rounded-2xl border border-white/10 bg-black/25 p-4">
              <span className="text-xs font-semibold text-slate-400">
                邮箱
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <label className="block rounded-2xl border border-white/10 bg-black/25 p-4">
              <span className="text-xs font-semibold text-slate-400">
                密码
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              />
            </label>

            {message && (
              <p className="rounded-2xl bg-white/[0.06] p-4 text-sm leading-7 text-amber-200">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-300 px-5 py-4 text-lg font-black text-black disabled:opacity-60"
            >
              {loading ? "处理中..." : mode === "register" ? "注册账号" : "登录并进入"}
            </button>
            <button
  type="button"
  onClick={onDemo}
  className="w-full rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-5 py-4 text-lg font-black text-emerald-200"
>
  评委快速体验 Demo
</button>

<p className="text-center text-xs leading-6 text-slate-500">
  无需注册，可直接查看项目介绍、评委演示、样例报告和核心工作流。
</p>
          </form>

          <p className="mt-5 text-xs leading-6 text-slate-500">
            账号由 Supabase Auth 托管，密码不会存储在前端代码里。
          </p>
        </section>
      </main>
    </div>
  );
}
