import { useState } from "react";
import { hasSupabaseConfig, supabase } from "../../supabaseClient";

function readableAuthError(error) {
  if (!error) return "";
  const message = error.message || String(error);
  if (/invalid login credentials/i.test(message)) return "邮箱或密码不正确，请检查后重试。";
  if (/email not confirmed/i.test(message)) return "邮箱尚未确认，请先完成邮箱验证。";
  return message;
}

export default function SupabaseLoginPanel({ onAuthChange, onUseLocal }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!hasSupabaseConfig || !supabase) {
    return (
      <section className="mb-4 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm text-amber-100">
        <p className="font-black">当前未配置 Supabase，无法启用云端同步。</p>
        <p className="mt-2 leading-6">你仍可使用本地模式体验完整产品库、报告、候选 PK 和测款复盘流程。</p>
        {onUseLocal && (
          <button
            type="button"
            onClick={onUseLocal}
            className="mt-4 rounded-2xl bg-amber-300 px-4 py-2 text-xs font-black text-black"
          >
            切换到仅本地保存
          </button>
        )}
      </section>
    );
  }

  async function submitAuth(type) {
    if (!email.trim() || !password) {
      setMessage("请填写邮箱和密码。");
      return;
    }

    setLoading(true);
    setMessage(type === "signup" ? "正在创建账号..." : "正在登录...");

    try {
      const payload = {
        email: email.trim(),
        password,
      };
      const { data, error } = type === "signup"
        ? await supabase.auth.signUp(payload)
        : await supabase.auth.signInWithPassword(payload);

      if (error) throw error;

      if (data?.session || data?.user) {
        setMessage(type === "signup" ? "账号已创建，正在启用云端同步。" : "登录成功，正在读取云端产品库。");
        onAuthChange?.(data);
      } else {
        setMessage("注册请求已提交。如项目开启邮箱验证，请确认邮箱后再登录。");
      }
    } catch (error) {
      setMessage(readableAuthError(error) || "登录失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-black text-cyan-100">登录 Supabase 启用云端同步</p>
        <p className="text-xs leading-6 text-cyan-100/70">只有选择“云端同步”时才需要登录；游客和本地模式不受影响。</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <span className="text-xs font-bold text-slate-400">邮箱</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
        </label>
        <label className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <span className="text-xs font-bold text-slate-400">密码</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="至少 6 位"
            className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
        </label>
      </div>

      {message && (
        <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-cyan-50">{message}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => submitAuth("signin")}
          className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-black text-black disabled:opacity-60"
        >
          登录
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => submitAuth("signup")}
          className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 disabled:opacity-60"
        >
          注册并登录
        </button>
      </div>
    </section>
  );
}
