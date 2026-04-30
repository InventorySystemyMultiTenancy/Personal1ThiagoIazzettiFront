import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTenant } from "../contexts/TenantContext.jsx";

export default function RegisterPage() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    personalId: tenantId || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resolvedTenant = useMemo(
    () => form.personalId.trim() || tenantId || "",
    [form.personalId, tenantId],
  );

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
      const session = await signUp({
        ...form,
        personalId: resolvedTenant,
      });
      navigate(session.user.role === "PERSONAL" ? "/admin" : "/cliente", {
        replace: true,
      });
    } catch (registerError) {
      setError(registerError?.message || "Nao foi possivel cadastrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#090909] px-6 py-10 text-[#f2f2f2]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-4xl border border-[#b5f03c]/20 bg-[radial-gradient(circle_at_top,rgba(181,240,60,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Thiago Iazzetti Personal Premium"
              className="h-12 w-12 rounded-2xl bg-white object-cover p-1"
            />
            <div>
              <p className="font-title text-xl text-[#b5f03c]">Criar conta</p>
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Cadastro de aluno por tenant
              </p>
            </div>
          </div>

          <h1 className="mt-8 font-title text-5xl leading-tight text-[#d4f7a0]">
            Entre no seu personal e acompanhe seus treinos.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-white/70">
            O cadastro cria o usuario do aluno e amarra a conta ao tenant
            informado. Depois do registro, o login vai direto para sua area.
          </p>

          <div className="mt-8 space-y-4 text-sm text-white/72">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="font-semibold text-[#b5f03c]">Plano contratado</p>
              <p className="mt-1">
                Escolha o plano e confirme a adesao.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="font-semibold text-[#b5f03c]">Treinos e agenda</p>
              <p className="mt-1">
                Acompanhe as rotinas liberadas pelo seu personal.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-4xl border border-[#b5f03c]/20 bg-black/45 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">
            Novo aluno
          </p>
          <h2 className="mt-3 font-title text-3xl text-[#b5f03c]">Cadastro</h2>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm text-white/70">
              Nome completo
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-[#b5f03c]/60">
                <User size={18} className="text-[#b5f03c]" />
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                  placeholder="Seu nome"
                  required
                />
              </div>
            </label>

            <label className="block text-sm text-white/70">
              Email
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-[#b5f03c]/60">
                <Mail size={18} className="text-[#b5f03c]" />
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
              Telefone
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-[#b5f03c]/60">
                <Phone size={18} className="text-[#b5f03c]" />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </label>

            <label className="block text-sm text-white/70">
              Senha
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-[#b5f03c]/60">
                <ShieldCheck size={18} className="text-[#b5f03c]" />
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                  placeholder="Crie uma senha"
                  required
                />
              </div>
            </label>

            {/* personalId is auto-detected from subdomain when available */}
            {!tenantId ? (
              <label className="block text-sm text-white/70">
                ID do personal
                <input
                  name="personalId"
                  value={form.personalId}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-[#b5f03c]/60"
                  placeholder="UUID do personal"
                  required
                />
              </label>
            ) : (
              <p className="mt-3 text-sm text-white/70">
                Cadastro vinculado detectado:{" "}
                <strong className="text-[#b5f03c]">{tenantId}</strong>
              </p>
            )}

            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#b5f03c] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Cadastrando..." : "Criar conta"}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/login"
              className="text-[#b5f03c] transition hover:text-white"
            >
              Ja tenho conta
            </Link>
            <Link to="/" className="transition hover:text-white">
              Voltar para a pagina inicial
            </Link>
          </div>

          {resolvedTenant ? (
            <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              Cadastro vinculado detectado: {resolvedTenant}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
