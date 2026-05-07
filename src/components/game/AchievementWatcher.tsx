import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useGameState, ACHIEVEMENTS } from "@/lib/game-state";
import { useSettings } from "@/lib/settings";
import { sfx } from "@/lib/sfx";

/** Watches stats/coins and unlocks achievements. Renders nothing. */
export function AchievementWatcher() {
  const { stats, coins, unlockAchievement, achievements } = useGameState();
  const { t } = useSettings();
  const lastUnlockedRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);
  const hydratedKnownRef = useRef(false);

  // As soon as the persisted achievements map arrives (possibly empty), seed
  // our "already known" set so hydration-phase recomputations cannot fire
  // toasts for things that were unlocked in a previous session.
  useEffect(() => {
    for (const id of Object.keys(achievements)) {
      lastUnlockedRef.current.add(id);
    }
    hydratedKnownRef.current = true;
  }, [achievements]);

  // Extra safety: wait a longer window after mount before allowing toasts, so
  // all localStorage-driven state (coins, stats, achievements) has had time to
  // hydrate and stabilise.
  useEffect(() => {
    const id = window.setTimeout(() => {
      readyRef.current = true;
    }, 1500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!readyRef.current || !hydratedKnownRef.current) return;
    const tryUnlock = (id: string, condition: boolean) => {
      if (!condition) return;
      if (lastUnlockedRef.current.has(id)) return;
      const ok = unlockAchievement(id);
      if (ok) {
        lastUnlockedRef.current.add(id);
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        if (!def) return;
        const raw = t(def.key);
        const [title, desc] = raw.split("|");
        sfx.achievement();
        toast.success(`${def.icon} ${t("achievementUnlocked")}`, {
          description: `${title} — +${def.reward} 🪙\n${desc ?? ""}`,
          duration: 4500,
        });
      }
    };

    tryUnlock("first_harvest", stats.totalFruits >= 1);
    tryUnlock("combo_15", stats.bestCombo >= 15);
    tryUnlock("combo_30", stats.bestCombo >= 30);
    tryUnlock("combo_50", stats.bestCombo >= 50);
    tryUnlock("golden_10", stats.totalGolden >= 10);
    tryUnlock("golden_100", stats.totalGolden >= 100);
    tryUnlock("level_complete", stats.totalLevelsDone >= 1);
    tryUnlock("all_levels", stats.totalLevelsDone >= 6);
    tryUnlock("fruits_500", stats.totalFruits >= 500);
    tryUnlock("fruits_5000", stats.totalFruits >= 5000);
    tryUnlock("rich_500", coins >= 500);
    tryUnlock("time_attack_50", stats.bestTimeAttack >= 50);
    tryUnlock("no_drop", stats.perfectNoDropLevels >= 1);
    tryUnlock("no_bomb_hit", stats.perfectNoBombLevels >= 1);
  }, [stats, coins, unlockAchievement, t]);

  return null;
}
