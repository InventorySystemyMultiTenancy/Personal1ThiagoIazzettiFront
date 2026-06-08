import { useEffect, useState } from "react";
import { Save, UserRound } from "lucide-react";
import { useTenant } from "../contexts/TenantContext.jsx";
import {
  DEFAULT_FOOTER_PROFILE,
  loadFooterProfile,
  saveFooterProfile,
} from "../lib/footerProfile.js";

export default function AdminMyDataPage() {
  const { tenantId } = useTenant();
  const [form, setForm] = useState(DEFAULT_FOOTER_PROFILE);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm(loadFooterProfile(tenantId || "default"));
  }, [tenantId]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const saved = saveFooterProfile(tenantId || "default", form);
    setForm(saved);
    setMessage("Dados salvos. O rodapé da página pública já foi atualizado neste navegador.");
  };

  const handleReset = () => {
    setForm(DEFAULT_FOOTER_PROFILE);
    setMessage("");
  };

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-3">
          <UserRound className="text-[#b5f03c]" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
              Perfil público
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Meus dados</h1>
            <p className="mt-1 text-sm text-white/50">
              Edite as informações exibidas no rodapé da página pública.
            </p>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-lg border border-[#b5f03c]/20 bg-[#b5f03c]/10 px-4 py-3 text-sm text-white/75">
          {message}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 lg:grid-cols-[1fr_0.8fr]"
      >
        <section className="space-y-4">
          <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
            Nome exibido
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#0b0b0b] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-[#b5f03c]/50"
              placeholder="Thiago Iazzetti"
            />
          </label>

          <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
            CREF
            <input
              value={form.cref}
              onChange={(event) => updateField("cref", event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[#0b0b0b] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-[#b5f03c]/50"
              placeholder="Ex.: CREF 000000-G/SP"
            />
          </label>

          <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
            Biografia curta
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              rows={4}
              className="mt-2 w-full resize-none rounded-lg border border-white/[0.08] bg-[#0b0b0b] px-3 py-2.5 text-sm font-normal leading-6 text-white outline-none transition focus:border-[#b5f03c]/50"
              placeholder="Resumo profissional para o rodapé"
            />
          </label>

          <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
            História resumida
            <textarea
              value={form.story}
              onChange={(event) => updateField("story", event.target.value)}
              rows={6}
              className="mt-2 w-full resize-none rounded-lg border border-white/[0.08] bg-[#0b0b0b] px-3 py-2.5 text-sm font-normal leading-6 text-white outline-none transition focus:border-[#b5f03c]/50"
              placeholder="Conte uma história curta sobre trajetória, método ou especialidade"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#b5f03c] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-black transition hover:brightness-110"
            >
              <Save size={14} />
              Salvar dados
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/55 transition hover:border-white/20 hover:text-white"
            >
              Restaurar padrão
            </button>
          </div>
        </section>

        <aside className="rounded-xl border border-white/[0.06] bg-black/25 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
            Prévia do rodapé
          </p>
          <div className="mt-4 flex items-center gap-2">
            <img
              src="/image.png"
              alt={form.name || "Thiago Iazzetti"}
              className="h-10 w-10 rounded-full bg-white/10 object-contain p-1"
            />
            <span className="font-bold tracking-wide text-[#b5f03c]">
              {form.name || DEFAULT_FOOTER_PROFILE.name}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/55">
            {form.description || DEFAULT_FOOTER_PROFILE.description}
          </p>
          {form.cref ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-[#b5f03c]/70">
              CREF: {form.cref}
            </p>
          ) : null}
          {form.story ? (
            <p className="mt-3 text-sm leading-6 text-white/45">
              {form.story}
            </p>
          ) : null}
        </aside>
      </form>
    </main>
  );
}
