import { AnimatePresence, motion } from "framer-motion";
import { useSettings } from "@/lib/settings";
import { useGameState, ACHIEVEMENTS } from "@/lib/game-state";
import coinImg from "@/assets/coin.png";

interface AchievementsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AchievementsPanel({ open, onClose }: AchievementsPanelProps) {
  const { t } = useSettings();
  const { achievements } = useGameState();
  const total = ACHIEVEMENTS.length;
  const unlocked = ACHIEVEMENTS.filter((a) => achievements[a.id]).length;

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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative w-full max-w-md rounded-3xl bg-card text-card-foreground p-6 shadow-2xl ring-1 ring-black/5 max-h-[90vh] overflow-y-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <h2 className="font-display text-2xl font-bold">
                  {t("achievements")}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 text-foreground/70 transition hover:bg-foreground/20"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mb-3 rounded-2xl bg-amber-100 dark:bg-amber-900/30 p-3 text-center">
              <div className="font-display text-2xl font-bold tabular-nums">
                {unlocked} / {total}
              </div>
              <div className="text-xs font-semibold text-amber-900/70 dark:text-amber-200/70">{t("unlocked")}</div>
            </div>

            <div className="space-y-2">
              {ACHIEVEMENTS.map((a) => {
                const isUnlocked = !!achievements[a.id];
                const raw = t(a.key);
                const [title, desc] = raw.split("|");
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                      isUnlocked
                        ? "border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20 dark:border-amber-700/50"
                        : "border-foreground/10 bg-foreground/[0.02] opacity-60"
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
                        isUnlocked ? "bg-amber-200 dark:bg-amber-800/40" : "bg-foreground/10 grayscale"
                      }`}
                    >
                      {isUnlocked ? a.icon : "🔒"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-sm font-bold truncate">{title}</h3>
                      <p className="text-xs text-foreground/60">{desc}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 rounded-full bg-amber-200/80 dark:bg-amber-800/40 px-2.5 py-1 text-[11px] font-bold tabular-nums text-amber-900 dark:text-amber-100 ring-1 ring-amber-400/50">
                      <span>+{a.reward}</span>
                      <img src={coinImg} alt="" className="h-4 w-4" width={16} height={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
