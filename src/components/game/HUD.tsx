import { motion } from "framer-motion";
import { useSettings } from "@/lib/settings";
import { useGameState } from "@/lib/game-state";
import coinImg from "@/assets/coin.png";

interface HUDProps {
  level: number;
  fruitImg: string;
  fruitName: string;
  collected: number;
  target: number;
  coins: number;
  onOpenSettings: () => void;
  onOpenShop: () => void;
  onOpenMap: () => void;
  onOpenAchievements: () => void;
  onOpenQuests: () => void;
  onPause: () => void;
}

export function HUD({
  level,
  fruitImg,
  fruitName,
  collected,
  target,
  coins,
  onOpenSettings,
  onOpenShop,
  onOpenMap,
  onOpenAchievements,
  onOpenQuests,
  onPause,
}: HUDProps) {
  const { t } = useSettings();
  const { quests } = useGameState();
  const claimableQuests = quests.filter((q) => q.done && !q.claimed).length;

  const progress = Math.min(100, (collected / target) * 100);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-1 p-1.5 md:p-2">
      {/* Compact progress bar pinned at the very top to save vertical space */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="pointer-events-auto mx-auto w-full max-w-[320px] rounded-full bg-card/85 text-card-foreground backdrop-blur-md p-1 shadow-md ring-1 ring-black/5"
      >
        <div className="relative h-4 overflow-hidden rounded-full bg-black/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
          <div className="absolute inset-0 flex items-center justify-center font-display text-[11px] font-bold text-foreground leading-none">
            {collected} / {target}
          </div>
        </div>
      </motion.div>

      <div className="flex items-start justify-between gap-2">
        <motion.button
          type="button"
          onClick={onOpenMap}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="pointer-events-auto flex items-center gap-1.5 rounded-2xl bg-card/85 text-card-foreground backdrop-blur-md px-2 py-1.5 shadow-lg ring-1 ring-black/5"
          aria-label={t("levelMap")}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/90 text-background font-display text-xs font-bold">
            {level}
          </div>
          <img src={fruitImg} alt="" className="h-6 w-6" width={24} height={24} />
        </motion.button>

        <div className="flex flex-col gap-1.5 items-end">
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-card/85 text-card-foreground backdrop-blur-md px-2.5 py-1 shadow-lg ring-1 ring-black/5"
          >
            <img src={coinImg} alt="" className="h-4 w-4" width={16} height={16} />
            <span className="font-display text-xs font-bold tabular-nums">{coins}</span>
          </motion.div>

          <div className="flex gap-1.5 flex-wrap justify-end">
            <motion.button
              type="button"
              onClick={onOpenQuests}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.06 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="pointer-events-auto relative flex h-9 w-9 items-center justify-center rounded-xl bg-card/85 text-card-foreground backdrop-blur-md shadow-lg ring-1 ring-black/5"
              aria-label={t("quests")}
            >
              <span className="text-sm">📜</span>
              {claimableQuests > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {claimableQuests}
                </span>
              )}
            </motion.button>

            <motion.button
              type="button"
              onClick={onOpenAchievements}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.07 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl bg-card/85 text-card-foreground backdrop-blur-md shadow-lg ring-1 ring-black/5"
              aria-label={t("achievements")}
            >
              <span className="text-sm">🏆</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={onOpenShop}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.08 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl bg-card/85 text-card-foreground backdrop-blur-md shadow-lg ring-1 ring-black/5"
              aria-label={t("shop")}
            >
              <span className="text-sm">🛒</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={onPause}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.09 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl bg-card/85 text-card-foreground backdrop-blur-md shadow-lg ring-1 ring-black/5"
              aria-label={t("pause")}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4.5" width="4" height="15" rx="1.5" />
                <rect x="14" y="4.5" width="4" height="15" rx="1.5" />
              </svg>
            </motion.button>

            <motion.button
              type="button"
              onClick={onOpenSettings}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{ rotate: 30 }}
              whileTap={{ scale: 0.92 }}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl bg-card/85 text-card-foreground backdrop-blur-md shadow-lg ring-1 ring-black/5"
              aria-label={t("settings")}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
