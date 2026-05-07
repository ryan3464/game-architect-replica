import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings";
import { useGameState } from "@/lib/game-state";
import { sfx } from "@/lib/sfx";
import coinImg from "@/assets/coin.png";

interface QuestsPanelProps {
  open: boolean;
  onClose: () => void;
}

const KIND_ICON: Record<string, string> = {
  catch_fruits: "🍌",
  combo: "🔥",
  catch_golden: "✨",
  complete_levels: "🏆",
};

function msUntilMidnight() {
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - d.getTime();
}
function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function QuestsPanel({ open, onClose }: QuestsPanelProps) {
  const { t } = useSettings();
  const { quests, claimQuest } = useGameState();
  const [countdown, setCountdown] = useState(msUntilMidnight());

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setCountdown(msUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, [open]);

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
                <span className="text-2xl">📜</span>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {t("quests")}
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

            <div className="mb-4 flex items-center justify-between rounded-2xl bg-foreground/5 px-3 py-2 text-xs">
              <span className="font-semibold text-foreground/70">{t("questsResetIn")}</span>
              <span className="font-display font-bold tabular-nums">{fmtCountdown(countdown)}</span>
            </div>

            <div className="space-y-3">
              {quests.map((q) => {
                const pct = Math.round((q.progress / q.target) * 100);
                const label = t(`quest_${q.kind}`).replace("{n}", String(q.target));
                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-3 transition ${
                      q.claimed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900 opacity-80 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-100 dark:opacity-100"
                        : q.done
                          ? "border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-100 text-amber-950 dark:border-amber-500/50 dark:from-amber-900/40 dark:to-yellow-900/30 dark:text-amber-50"
                          : "border-black/10 bg-foreground/[0.02] text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background text-xl shadow-inner">
                        {KIND_ICON[q.kind]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-sm font-bold">{label}</h3>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-black/10">
                            <motion.div
                              className="h-full rounded-full bg-emerald-500"
                              initial={false}
                              animate={{ width: `${pct}%` }}
                              transition={{ type: "spring", stiffness: 120, damping: 20 }}
                            />
                          </div>
                          <span className="text-[10px] font-bold tabular-nums text-foreground/70">
                            {q.progress}/{q.target}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!q.done || q.claimed}
                        onClick={() => {
                          claimQuest(q.id);
                          sfx.coin();
                        }}
                        className={`shrink-0 rounded-xl px-3 py-2 font-display text-xs font-bold transition ${
                          q.claimed
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 cursor-default"
                            : q.done
                              ? "bg-amber-500 text-white hover:scale-105"
                              : "bg-black/10 text-foreground/40 cursor-not-allowed"
                        }`}
                      >
                        {q.claimed ? (
                          "✓"
                        ) : (
                          <span className="flex items-center gap-1">
                            +{q.reward}
                            <img src={coinImg} alt="" className="h-3.5 w-3.5" width={14} height={14} />
                          </span>
                        )}
                      </button>
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
