import { AnimatePresence, motion } from "framer-motion";
import { useSettings } from "@/lib/settings";
import { useGameState } from "@/lib/game-state";
import { LEVELS } from "@/lib/levels";

interface LevelMapProps {
  open: boolean;
  onClose: () => void;
  currentLevel: number;
  /** The highest level the player has ever reached/unlocked. */
  maxUnlockedLevel: number;
  onSelectLevel?: (id: number) => void;
}

export function LevelMap({ open, onClose, currentLevel, maxUnlockedLevel, onSelectLevel }: LevelMapProps) {
  const { t } = useSettings();
  const { stats } = useGameState();
  const allDone = stats.totalLevelsDone >= LEVELS.length;

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
            className="relative w-full max-w-sm rounded-3xl bg-card text-card-foreground p-6 shadow-2xl ring-1 ring-black/5 max-h-[90vh] overflow-y-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🗺️</span>
                <h2 className="font-display text-xl font-bold text-foreground">
                  {t("levelMap")}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-foreground/70 transition hover:bg-black/10"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {allDone && (
              <div className="mb-3 rounded-2xl bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/30 p-3 text-center text-xs font-bold text-amber-900 dark:text-amber-100">
                🎉 {t("allLevelsUnlocked")}
              </div>
            )}

            <div className="relative pl-2">
              {/* vertical path */}
              <div className="absolute left-[34px] top-6 bottom-6 w-1 rounded-full bg-gradient-to-b from-emerald-300 via-amber-300 to-rose-300" />

              <ul className="space-y-3">
                {LEVELS.map((lvl) => {
                  const isCurrent = lvl.id === currentLevel;
                  const isDone = lvl.id < maxUnlockedLevel;
                  const isLocked = lvl.id > maxUnlockedLevel && !allDone;
                  // Clickable when unlocked AND callback provided AND it's not the current level
                  const canSelect = !!onSelectLevel && !isLocked && !isCurrent;
                  const Wrapper: "button" | "div" = canSelect ? "button" : "div";
                  return (
                    <motion.li
                      key={lvl.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: lvl.id * 0.05 }}
                    >
                      <Wrapper
                        type={canSelect ? "button" : undefined}
                        onClick={canSelect ? () => { onSelectLevel?.(lvl.id); onClose(); } : undefined}
                        className={`relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                          isCurrent
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-600"
                            : isDone || (allDone && !isCurrent)
                              ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/25 dark:border-emerald-700/60"
                              : "border-black/10 bg-black/5 opacity-70"
                        } ${canSelect ? "hover:scale-[1.02] hover:shadow-md cursor-pointer" : ""}`}
                      >
                        <div
                          className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-base font-bold ring-4 ring-white ${
                            isCurrent
                              ? "bg-amber-500 text-white"
                              : isDone || allDone
                                ? "bg-emerald-500 text-white"
                                : "bg-foreground/30 text-white"
                          }`}
                        >
                          {isLocked ? "🔒" : isDone || allDone ? "✓" : lvl.id}
                        </div>
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
                            {t("level")} {lvl.id}
                          </div>
                          <div className="font-display text-sm font-bold truncate">
                            {t(`fruit_${lvl.fruitKey}_plural`)}
                          </div>
                          <div className="text-xs text-foreground/60">
                            {t("target")}: {lvl.target}
                          </div>
                        </div>
                        <img
                          src={lvl.fruitImg}
                          alt=""
                          className={`ml-auto h-10 w-10 shrink-0 ${isLocked ? "grayscale" : ""}`}
                          width={40}
                          height={40}
                        />
                      </Wrapper>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
