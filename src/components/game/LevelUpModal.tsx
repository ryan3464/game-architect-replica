import { motion } from "framer-motion";
import { useSettings } from "@/lib/settings";
import { LEVELS } from "@/lib/levels";
import { CountdownButton } from "@/components/game/CountdownButton";

interface LevelUpModalProps {
  show: boolean;
  nextFruitImg: string | null;
  nextFruitName: string | null;
  isFinal: boolean;
  onContinue: () => void;
  /** Called when player picks a specific level after finishing all of them. */
  onSelectLevel?: (id: number) => void;
  /** Called when player wants to return to the start screen / home. */
  onGoHome?: () => void;
}

export function LevelUpModal({
  show,
  nextFruitImg,
  nextFruitName,
  isFinal,
  onContinue,
  onSelectLevel,
  onGoHome,
}: LevelUpModalProps) {
  const { t } = useSettings();
  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.7, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="relative w-full max-w-sm rounded-3xl bg-card text-card-foreground p-7 text-center shadow-2xl ring-1 ring-black/5 max-h-[90vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <motion.div
          className="text-5xl"
          animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8 }}
        >
          🎉
        </motion.div>
        <h2 className="mt-3 font-display text-2xl font-bold">
          {isFinal ? t("completeAll") : t("levelUp")}
        </h2>

        {!isFinal && nextFruitImg && (
          <>
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-foreground/60">
              {t("nextFruit")}
            </p>
            <motion.img
              src={nextFruitImg}
              alt=""
              className="mx-auto mt-3 h-24 w-24"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <p className="mt-2 font-display text-xl font-bold">{nextFruitName}</p>
          </>
        )}

        {isFinal ? (
          <>
            <p className="mt-4 font-display text-lg font-bold text-foreground">
              {t("chooseLevelSubtitle")}
            </p>

            <ul className="mt-4 space-y-2 text-left">
              {LEVELS.map((lvl) => (
                <li key={lvl.id}>
                  <CountdownButton
                    show={show}
                    onClick={() => onSelectLevel?.(lvl.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700/40 p-2.5 transition hover:scale-[1.02] hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 font-display text-sm font-bold text-white ring-4 ring-white dark:ring-card">
                      {lvl.id}
                    </div>
                    <div className="min-w-0 flex-1 text-center">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
                        {t("level")} {lvl.id}
                      </div>
                      <div className="font-display text-sm font-bold truncate">
                        {t(`fruit_${lvl.fruitKey}_plural`)}
                      </div>
                    </div>
                    <img src={lvl.fruitImg} alt="" className="h-9 w-9 shrink-0 object-contain" width={36} height={36} />
                  </CountdownButton>
                </li>
              ))}
            </ul>

            <CountdownButton
              show={show}
              onClick={() => (onGoHome ?? onContinue)()}
              className="mt-5 w-full rounded-2xl py-3 font-display text-base font-bold shadow-lg transition bg-foreground text-background hover:scale-[1.02]"
            >
              🏠 {t("home")}
            </CountdownButton>
          </>
        ) : (
          <CountdownButton
            show={show}
            onClick={onContinue}
            className="mt-6 w-full rounded-2xl py-3 font-display text-base font-bold shadow-lg transition bg-foreground text-background hover:scale-[1.02]"
          >
            {t("continue")} →
          </CountdownButton>
        )}
      </motion.div>
    </motion.div>
  );
}
