import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const I18N_STORAGE_KEY = "thiago_locale";
const I18N_SYSTEM = "website";
const DEFAULT_LOCALE = "pt-BR";

const SUPPORTED_LOCALES = [
  { code: "pt-BR", label: "PT-BR" },
  { code: "pt-PT", label: "PT-PT" },
  { code: "en-US", label: "EN" },
  { code: "it-IT", label: "IT" },
  { code: "es-ES", label: "ES" },
  { code: "ar-MA", label: "AR" },
];

const I18nContext = createContext(null);

function getApiBaseUrl() {
  return (
    import.meta.env.VITE_I18N_API_URL ||
    "https://tradudor-i8n-languages.onrender.com"
  ).replace(/\/$/, "");
}

function getStoredLocale() {
  try {
    const raw = localStorage.getItem(I18N_STORAGE_KEY);
    if (!raw) return DEFAULT_LOCALE;
    if (SUPPORTED_LOCALES.some((item) => item.code === raw)) {
      return raw;
    }
    return DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(getStoredLocale);
  const [direction, setDirection] = useState("ltr");
  const [dictionary, setDictionary] = useState({});

  useEffect(() => {
    let mounted = true;

    async function loadTranslations() {
      const url = `${getApiBaseUrl()}/traducoes/${I18N_SYSTEM}/${locale}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`I18N request failed (${response.status})`);
        }
        const payload = await response.json();
        if (!mounted) return;
        setDictionary(payload?.traducoes || {});
        setDirection(payload?.direcao || "ltr");
      } catch {
        if (!mounted) return;
        setDictionary({});
        setDirection(locale === "ar-MA" ? "rtl" : "ltr");
      }
    }

    loadTranslations();

    try {
      localStorage.setItem(I18N_STORAGE_KEY, locale);
    } catch {
      // Ignore storage failures
    }

    return () => {
      mounted = false;
    };
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);

  const t = (key, fallback = "") => dictionary[key] || fallback || key;

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      direction,
      locales: SUPPORTED_LOCALES,
      t,
    }),
    [locale, direction, dictionary],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return ctx;
}
