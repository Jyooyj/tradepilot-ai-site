import { useState } from "react";
import { hasSupabaseConfig, supabase } from "../../supabaseClient";

const SUPABASE_CONNECTION_ERROR =
  "Supabase 连接失败，可能是网络不可达、Vercel 环境变量未配置，或 Supabase 项目 URL / anon key 不正确。你仍可切换到本地模式继续使用。";

function readableAuthError(error) {
  if (!error) return "";
  const message = error.message || error.error_description || String(error);
  if (/failed to fetch|network|fetch/i.test(message)) return SUPABASE_CONNECTION_ERROR;
  if (/invalid login credentials/i.test(message)) return "邮箱或密码不正确。";
  if (/email not confirmed/i.test(message)) return "邮箱尚未确认，请先完成邮件验证，或在 Supabase 后台关闭测试阶段邮箱确认。";
  return message;
}

export default function SupabaseLoginPanel({ onAuthChange, onUseLocal }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function testSupabaseConnection() {
    if (!hasSupabaseConfig || !supabase) {
      setMessage("Supabase 环境变量未配置");
      return;
    }

    setLoading(true);
    setMessage("正在测试 Supabase 连接...");

    try {
      const { error } = await supabase.auth.getSession();
      if (error) throw error;
      setMessage("Supabase 连接正常。未登录时仍需输入邮箱和密码启用云端同步。");
    } catch (error) {
      console.error("Supabase 连接测试失败：", error);
      setMessage("Supabase 当前不可达，建议检查网络或环境变量。你仍可切换到本地模式继续使用。");
    } finally {
      setLoading(false);
    }
  }

  if (!hasSupabaseConfig || !supabase) {
    return (
      <section className="mb-4 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm text-amber-100">
        <p className="font-black">当前未配置 Supabase，无法启用云端同步。</p>
        <p className="mt-2 leading-6">你仍可使用本地模式体验完整产品库、报告、候选 PK 和测款复盘流程。</p>
        {message && (
          <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-amber-50">{message}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={testSupabaseConnection}
            className="rounded-2xl border border-amber-300/30 bg-black/20 px-4 py-2 text-xs font-black text-amber-100"
          >
            测试 Supabase 连接
          </button>
          {onUseLocal && (
            <button
              type="button"
              onClick={onUseLocal}
              className="rounded-2xl bg-amber-300 px-4 py-2 text-xs font-black text-black"
            >
              切换到本地模式继续体验
            </button>
          )}
        </div>
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
      console.error("Supabase 登录失败：", error);
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
        <p className="text-xs leading-6 text-cyan-100/70">无需注册：当前没有云端会话时，可直接点击“同步本地记录到云端”按钮，系统会自动创建匿名云端会话；若需要长期账号再用下方邮箱注册登录。</p>
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
        <button
          type="button"
          disabled={loading}
          onClick={testSupabaseConnection}
          className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          测试 Supabase 连接
        </button>
        {onUseLocal && (
          <button
            type="button"
            onClick={onUseLocal}
            className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-black text-amber-100"
          >
            切换到本地模式继续体验
          </button>
        )}
      </div>
    </section>
  );
}
