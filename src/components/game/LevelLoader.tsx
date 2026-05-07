import { motion } from "framer-motion";
import { useSettings } from "@/lib/settings";

interface LevelLoaderProps {
  show: boolean;
  fruitImg?: string | null;
  fruitName?: string | null;
  levelId?: number | null;
}

/**
 * Full-screen loader shown during level transitions so the player never
 * sees the previous level's tree/background swap to the next one mid-frame.
 */
export function LevelLoader({ show, fruitImg, fruitName, levelId }: LevelLoaderProps) {
  const { t } = useSettings();
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-950 dark:from-slate-800 dark:via-slate-900 dark:to-black"
    >
      {fruitImg && (
        <motion.img
          src={fruitImg}
          alt=""
          className="h-24 w-24 drop-shadow-xl"
          animate={{ y: [0, -14, 0], rotate: [0, -8, 8, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          width={96}
          height={96}
        />
      )}
      {levelId != null && (
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
          {t("level")} {levelId}
        </p>
      )}
      {fruitName && (
        <p className="mt-1 font-display text-2xl font-bold text-white">{fruitName}</p>
      )}
      <div className="mt-6 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-white/80"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
