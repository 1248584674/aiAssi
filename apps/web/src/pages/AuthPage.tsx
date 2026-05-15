// ── 登录/注册页面 — Zapier 风格 ──
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "请求失败");
        setLoading(false);
        return;
      }

      // 保存 token
      localStorage.setItem("token", json.data.token);
      localStorage.setItem("user", JSON.stringify(json.data.user));
      navigate("/chat");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 7l8 5 8-5M4 7v10l8 5 8-5V7M4 7l8-5 8 5" stroke="#fffefb" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-ink">AI 企业效率助手</h1>
          <p className="mt-1 text-sm text-body-mid">{mode === "login" ? "登录你的账号" : "创建新账号"}</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <input
              type="text"
              placeholder="姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-ink/20 bg-canvas px-4 py-2.5 text-sm text-ink placeholder-mute outline-none transition focus:border-primary"
            />
          )}
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-ink/20 bg-canvas px-4 py-2.5 text-sm text-ink placeholder-mute outline-none transition focus:border-primary"
          />
          <input
            type="password"
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-ink/20 bg-canvas px-4 py-2.5 text-sm text-ink placeholder-mute outline-none transition focus:border-primary"
          />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        {/* 切换 */}
        <p className="mt-6 text-center text-xs text-body-mid">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="ml-1 font-medium text-primary hover:underline"
          >
            {mode === "login" ? "注册" : "登录"}
          </button>
        </p>

        {/* 提示 */}
        <p className="mt-4 text-center text-[10px] text-mute">
          测试账号：zhangsan@example.com / 123456
        </p>
      </div>
    </div>
  );
}