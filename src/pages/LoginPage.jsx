import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";

export default function LoginPage() {
  const { t } = useI18n();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const session = await signIn(form);
      const targetRoute =
        session.user.role === "PERSONAL" ? "/admin" : "/cliente";
      navigate(targetRoute, { replace: true });
    } catch (loginError) {
      setError(
        loginError?.message ||
          t("LOGIN_ERROR_GENERIC_THIAGOIAZZETTI", "Nao foi possivel entrar"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden text-[#f2f2f2]">
      {/* Background image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/Gemini_Generated_Image_g258log258log258 (1).png')",
        }}
      />
      {/* Dark gradient overlay — covers the bottom-right Gemini watermark naturally */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/80 via-black/65 to-black/90" />
      {/* Extra bottom-right cover to fully hide watermark */}
      <div className="absolute bottom-0 right-0 z-0 h-20 w-40 bg-black/90" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        {/* LEFT PANEL */}
        <section className="rounded-[2rem] border border-[#b5f03c]/20 bg-black/50 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img
              src="/image.png"
              alt="Thiago Iazzetti Personal Premium"
              className="h-12 w-12 rounded-2xl bg-white object-cover p-1"
            />
            <div>
              <p className="font-title text-xl text-[#b5f03c]">
                Thiago Iazzetti
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                {t("LOGIN_BADGE_ROLE_THIAGOIAZZETTI", "Personal admin & aluno")}
              </p>
            </div>
          </div>

          <h1 className="mt-8 font-title text-5xl leading-tight text-white">
            {t("LOGIN_TITLE_THIAGOIAZZETTI", "Entrar na plataforma real.")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-white/65">
            {t(
              "LOGIN_SUBTITLE_THIAGOIAZZETTI",
              "Use sua conta para acessar seus treinos, o painel do personal ou a area do aluno.",
            )}
          </p>

          <div className="mt-8 space-y-4 text-sm text-white/70">
            <div className="rounded-2xl border border-[#b5f03c]/20 bg-[#b5f03c]/5 p-4">
              <p className="font-semibold text-[#b5f03c]">
                {t("LOGIN_CARD_PERSONAL_TITLE_THIAGOIAZZETTI", "Personal")}
              </p>
              <p className="mt-1">
                {t(
                  "LOGIN_CARD_PERSONAL_TEXT_THIAGOIAZZETTI",
                  "Acesso ao painel, alunos, planos e treinos.",
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-[#b5f03c]/20 bg-[#b5f03c]/5 p-4">
              <p className="font-semibold text-[#b5f03c]">
                {t("LOGIN_CARD_STUDENT_TITLE_THIAGOIAZZETTI", "Aluno")}
              </p>
              <p className="mt-1">
                {t(
                  "LOGIN_CARD_STUDENT_TEXT_THIAGOIAZZETTI",
                  "Acesso ao perfil, plano contratado e treinos.",
                )}
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="rounded-[2rem] border border-white/10 bg-black/55 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">
            {t("LOGIN_ACCESS_LABEL_THIAGOIAZZETTI", "Acesso")}
          </p>
          <h2 className="mt-3 font-title text-3xl text-white">
            {t("LOGIN_HEADING_THIAGOIAZZETTI", "Login")}
          </h2>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm text-white/70">
              {t("LOGIN_EMAIL_LABEL_THIAGOIAZZETTI", "Email")}
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-[#b5f03c]/60">
                <Mail size={18} className="text-[#b5f03c]" />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                  placeholder={t(
                    "LOGIN_EMAIL_PLACEHOLDER_THIAGOIAZZETTI",
                    "voce@exemplo.com",
                  )}
                  required
                />
              </div>
            </label>

            <label className="block text-sm text-white/70">
              {t("LOGIN_PASSWORD_LABEL_THIAGOIAZZETTI", "Senha")}
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-[#b5f03c]/60">
                <Lock size={18} className="text-[#b5f03c]" />
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                  placeholder="••••••••"
                  required
                />
              </div>
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#b5f03c] px-4 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading
                ? t("LOGIN_BUTTON_LOADING_THIAGOIAZZETTI", "Entrando...")
                : t("LOGIN_BUTTON_SUBMIT_THIAGOIAZZETTI", "Entrar agora")}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/cadastro"
              className="text-[#b5f03c] transition hover:text-white"
            >
              {t(
                "LOGIN_LINK_CREATE_ACCOUNT_THIAGOIAZZETTI",
                "Criar conta de aluno",
              )}
            </Link>
            <Link to="/" className="transition hover:text-white">
              {t(
                "LOGIN_LINK_BACK_HOME_THIAGOIAZZETTI",
                "Voltar para a pagina inicial",
              )}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
