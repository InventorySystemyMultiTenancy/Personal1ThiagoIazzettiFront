import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Crown, Lock, Mail } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function LoginPage() {
  const { tenantId } = useParams();
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
      const targetTenant = session.user.personalId || tenantId;
      const targetRoute =
        session.user.role === "PERSONAL" ? "admin" : "cliente";
      navigate(targetTenant ? `/${targetTenant}/${targetRoute}` : "/", {
        replace: true,
      });
    } catch (loginError) {
      setError(loginError?.message || "Nao foi possivel entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] px-6 py-10 text-[#f6ebcf]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 p-2 text-[#d4af37]">
              <Crown size={20} />
            </div>
            <div>
              <p className="font-title text-xl text-[#f5d77a]">
                Thiago Iazzetti
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Personal admin e aluno
              </p>
            </div>
          </div>

          <h1 className="mt-8 font-title text-5xl leading-tight text-[#fff1cc]">
            Entrar na plataforma real.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-white/70">
            Use sua conta para acessar o painel do personal ou a area do aluno.
            O tenant correto vem do proprio backend, entao nao ha contrato demo.
          </p>

          <div className="mt-8 space-y-4 text-sm text-white/72">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="font-semibold text-[#f5d77a]">Personal</p>
              <p className="mt-1">
                Acesso ao painel, alunos, planos e treinos.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="font-semibold text-[#f5d77a]">Aluno</p>
              <p className="mt-1">
                Acesso ao perfil, plano contratado e treinos.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/45 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">
            Acesso
          </p>
          <h2 className="mt-3 font-title text-3xl text-[#f5d77a]">Login</h2>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm text-white/70">
              Email
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-[#d4af37]/60">
                <Mail size={18} className="text-[#d4af37]" />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                  placeholder="voce@exemplo.com"
                  required
                />
              </div>
            </label>

            <label className="block text-sm text-white/70">
              Senha
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-[#d4af37]/60">
                <Lock size={18} className="text-[#d4af37]" />
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d4af37] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Entrando..." : "Entrar agora"}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/cadastro"
              className="text-[#f5d77a] transition hover:text-white"
            >
              Criar conta de aluno
            </Link>
            <Link to="/" className="transition hover:text-white">
              Voltar para a pagina inicial
            </Link>
          </div>

          {tenantId ? (
            <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              Tenant atual: {tenantId}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
