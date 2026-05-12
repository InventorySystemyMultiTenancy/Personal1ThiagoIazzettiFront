import { Languages } from "lucide-react";
import { useI18n } from "../contexts/I18nContext.jsx";

export default function LanguageSwitcher({ compact = false }) {
  const { locale, locales, setLocale } = useI18n();

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.03] ${compact ? "px-2 py-1" : "px-2.5 py-1.5"}`}
    >
      <Languages size={compact ? 12 : 14} className="text-white/55" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="bg-transparent text-xs font-semibold text-white/70 outline-none"
      >
        {locales.map((item) => (
          <option
            key={item.code}
            value={item.code}
            className="bg-[#0b0b0b] text-white"
          >
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
