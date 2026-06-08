import { useEffect, useState } from "react";

export const THEME_MODE_STORAGE_KEY = "thiago_theme_mode";
export const THEME_MODES = {
  dark: "dark",
  military: "military",
};

export function getStoredThemeMode() {
  try {
    const saved = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return saved === THEME_MODES.military ? THEME_MODES.military : THEME_MODES.dark;
  } catch {
    return THEME_MODES.dark;
  }
}

export function applyThemeMode(mode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(
    "theme-military",
    mode === THEME_MODES.military,
  );
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState(() => getStoredThemeMode());

  useEffect(() => {
    applyThemeMode(themeMode);
    localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const toggleThemeMode = () => {
    setThemeMode((current) =>
      current === THEME_MODES.military ? THEME_MODES.dark : THEME_MODES.military,
    );
  };

  return {
    isMilitaryTheme: themeMode === THEME_MODES.military,
    themeMode,
    toggleThemeMode,
  };
}
