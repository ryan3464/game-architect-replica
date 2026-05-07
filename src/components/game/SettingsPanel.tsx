import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/settings";
import { LANGS, type Lang } from "@/lib/i18n";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  /** When provided, shows a "Change mode" button that returns to the start screen. */
  onChangeMode?: () => void;
}

export function SettingsPanel({ open, onClose, onChangeMode }: SettingsPanelProps) {
  const { lang, setLang, volume, setVolume, muted, setMuted, theme, setTheme, screenShake, setScreenShake, t } = useSettings();
  const [confirmingChangeMode, setConfirmingChangeMode] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full max-w-sm rounded-3xl bg-card text-card-foreground p-6 shadow-2xl ring-1 ring-black/5"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-foreground">{t("settings")}</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-foreground/70 transition hover:bg-black/10"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Language */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-foreground/80">
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

            {/* Theme */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-foreground/80">
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
                  <span>☀️</span>
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
                  <span>🌙</span>
                  <span>{t("themeDark")}</span>
                </button>
              </div>
            </div>

            {/* Volume */}
            <div className="mb-2">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground/80">{t("volume")}</label>
                <button
                  type="button"
                  onClick={() => setMuted(!muted)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    muted ? "bg-foreground/10 text-foreground/60" : "bg-foreground text-background"
                  }`}
                >
                  {muted ? "🔇 " + t("off") : "🔊 " + t("on")}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-foreground/50">0</span>
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

            {/* Screen shake */}
            <div className="mt-5 flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground/80">{t("screenShake")}</label>
              <button
                type="button"
                onClick={() => setScreenShake(!screenShake)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  screenShake ? "bg-foreground text-background" : "bg-foreground/10 text-foreground/60"
                }`}
              >
                {screenShake ? "📳 " + t("on") : "🚫 " + t("off")}
              </button>
            </div>

            {/* Change mode */}
            {onChangeMode && (
              <div className="mt-6 border-t border-black/10 pt-4">
                {!confirmingChangeMode ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingChangeMode(true)}
                    className="w-full rounded-2xl border-2 border-foreground/20 bg-card py-3 px-4 font-display text-sm font-bold text-foreground transition hover:border-foreground/40 hover:bg-foreground/5 flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">🔄</span>
                    <span>{t("changeMode")}</span>
                  </button>
                ) : (
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-700/50 p-3">
                    <p className="text-xs text-foreground/80 mb-3 text-center font-semibold">
                      {t("changeModeConfirm")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingChangeMode(false)}
                        className="rounded-xl bg-card border-2 border-foreground/15 py-2 text-xs font-bold text-foreground/70"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingChangeMode(false);
                          onChangeMode();
                          onClose();
                        }}
                        className="rounded-xl bg-foreground py-2 text-xs font-bold text-background"
                      >
                        {t("backToMenu")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
