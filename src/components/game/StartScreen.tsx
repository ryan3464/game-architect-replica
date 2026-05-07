import { motion } from "framer-motion";
import { useSettings } from "@/lib/settings";
import { LANGS, type Lang } from "@/lib/i18n";

interface StartScreenProps {
  onStart: (mode: "classic" | "timeAttack") => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const { lang, setLang, volume, setVolume, muted, setMuted, theme, setTheme, t } = useSettings();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 overflow-y-auto"
      style={{
        background:
          theme === "dark"
            ? "linear-gradient(135deg, oklch(0.32 0.08 280) 0%, oklch(0.38 0.12 30) 55%, oklch(0.28 0.08 200) 100%)"
            : "linear-gradient(135deg, oklch(0.85 0.12 220) 0%, oklch(0.92 0.1 90) 60%, oklch(0.88 0.14 145) 100%)",
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="relative w-full max-w-md rounded-3xl bg-card/95 text-card-foreground backdrop-blur-md p-7 shadow-2xl ring-1 ring-black/5 my-6"
      >
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h1>
        {t("subtitle") && <p className="mt-2 text-sm text-foreground/70">{t("subtitle")}</p>}

        {/* How to play */}
        <div className="mt-5 rounded-2xl bg-foreground/5 p-4">
          <div className="font-display text-sm font-bold uppercase tracking-wider text-foreground/70">
            {t("howToTitle")}
          </div>
          <ol className="mt-2 space-y-2 text-sm text-foreground/80">
            {[t("howTo1"), t("howTo2"), t("howTo3"), t("howTo4")].map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                  {i + 1}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground/60">
            {t("language")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code as Lang)}
                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition ${
                  lang === l.code
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/15 bg-card text-foreground hover:border-foreground/30"
                }`}
              >
                <span className="text-lg">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground/60">
            {t("theme")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition ${
                theme === "light"
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/15 bg-card text-foreground hover:border-foreground/30"
              }`}
            >
              <span className="text-lg">☀️</span>
              <span>{t("themeLight")}</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition ${
                theme === "dark"
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/15 bg-card text-foreground hover:border-foreground/30"
              }`}
            >
              <span className="text-lg">🌙</span>
              <span>{t("themeDark")}</span>
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground/60">
              {t("volume")}
            </label>
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                muted ? "bg-black/10 text-foreground/60" : "bg-foreground text-background"
              }`}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={(e) => {
                setVolume(Number(e.target.value) / 100);
                if (muted) setMuted(false);
              }}
              disabled={muted}
              className="flex-1 accent-foreground disabled:opacity-50"
            />
            <span className="w-8 text-right text-xs font-semibold text-foreground/70">
              {Math.round(volume * 100)}
            </span>
          </div>
        </div>

        {/* Single "Play" button — starts classic mode directly */}
        <motion.button
          type="button"
          onClick={() => onStart("classic")}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="mt-6 w-full rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 py-4 px-3 font-display text-xl font-bold text-white shadow-lg transition flex items-center justify-center gap-2"
        >
          <span>{t("play")}</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
