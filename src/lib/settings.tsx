import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type Lang, tr } from "./i18n";
import { sfx } from "./sfx";

export type Theme = "light" | "dark";

interface SettingsState {
  lang: Lang;
  setLang: (l: Lang) => void;
  volume: number; // 0..1
  setVolume: (v: number) => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  screenShake: boolean;
  setScreenShake: (v: boolean) => void;
  t: (key: string) => string;
}

const Ctx = createContext<SettingsState | null>(null);

const STORAGE_KEY = "fruit-harvest-settings-v1";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [screenShake, setScreenShake] = useState(true);

  // Hydrate from localStorage on mount (browser only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.lang) setLang(parsed.lang);
        if (typeof parsed.volume === "number") setVolume(parsed.volume);
        if (typeof parsed.muted === "boolean") setMuted(parsed.muted);
        if (parsed.theme === "dark" || parsed.theme === "light") setTheme(parsed.theme);
        if (typeof parsed.screenShake === "boolean") setScreenShake(parsed.screenShake);
      } else {
        const browser = navigator.language.slice(0, 2).toLowerCase();
        if (["en", "it", "es", "fr"].includes(browser)) {
          setLang(browser as Lang);
        }
        if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
          setTheme("dark");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lang, volume, muted, theme, screenShake }));
    } catch {
      // ignore
    }
  }, [lang, volume, muted, theme, screenShake]);

  // Apply theme class on <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  // Sync with sfx engine
  useEffect(() => {
    sfx.setVolume(muted ? 0 : volume);
  }, [volume, muted]);

  const value = useMemo<SettingsState>(
    () => ({
      lang,
      setLang,
      volume,
      setVolume,
      muted,
      setMuted,
      theme,
      setTheme,
      toggleTheme: () => setTheme((th) => (th === "dark" ? "light" : "dark")),
      screenShake,
      setScreenShake,
      t: (key: string) => tr(lang, key),
    }),
    [lang, volume, muted, theme, screenShake],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

// Force a full page reload when this module is hot-updated. The exported
// React Context identity changes on HMR, which would otherwise leave already-
// mounted consumers reading from a stale Context with no provider.
if (import.meta.hot) {
  import.meta.hot.invalidate();
}
