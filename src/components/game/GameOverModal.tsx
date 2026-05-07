/**
 * 👕 VESTITO — Modale Game Over con tasto "Recupera 1 cuore" (rewarded ad).
 * Riceve callbacks per revive (ad simulato 2s) e per restart.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2, Play, RotateCcw, Home } from "lucide-react";

interface GameOverModalProps {
  open: boolean;
  score: number;
  level: number;
  isWatchingAd: boolean;
  onRevive: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export function GameOverModal({
  open,
  score,
  level,
  isWatchingAd,
  onRevive,
  onRestart,
  onExit,
}: GameOverModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.8, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-rose-100 to-rose-50 dark:from-zinc-900 dark:to-zinc-950 p-6 text-center shadow-2xl ring-4 ring-rose-500/60"
          >
            <motion.div
              className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg ring-4 ring-rose-200/70"
              animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
              transition={{ duration: 0.8 }}
            >
              <Heart className="h-10 w-10" fill="currentColor" />
            </motion.div>
            <h2 className="font-display text-3xl font-extrabold text-rose-700 dark:text-rose-300">
              GAME OVER
            </h2>
            <p className="mt-2 text-sm text-foreground/70">
              Livello <strong>{level}</strong> · Punteggio <strong>{score}</strong>
            </p>

            {/* Revive button — Rewarded Ad (pulsante pulsante per attirare l'occhio) */}
            <motion.button
              type="button"
              onClick={onRevive}
              disabled={isWatchingAd}
              animate={isWatchingAd ? {} : { scale: [1, 1.04, 1], boxShadow: [
                "0 0 0 0 rgba(251,191,36,0.7)",
                "0 0 0 14px rgba(251,191,36,0)",
                "0 0 0 0 rgba(251,191,36,0)",
              ] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              className="mt-5 w-full rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 py-3.5 px-4 font-display text-base font-extrabold text-white shadow-lg ring-2 ring-amber-200 transition active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isWatchingAd ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Caricamento video…
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" fill="currentColor" />
                  Recupera 1 cuore e continua
                </>
              )}
            </motion.button>
            <p className="mt-1.5 text-[11px] font-medium text-foreground/70">
              Non perdere i tuoi progressi! Guarda un breve video
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onRestart}
                disabled={isWatchingAd}
                className="rounded-2xl bg-foreground text-background py-2.5 px-3 font-display text-sm font-bold shadow active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Riprova
              </button>
              <button
                type="button"
                onClick={onExit}
                disabled={isWatchingAd}
                className="rounded-2xl bg-card text-card-foreground ring-1 ring-black/10 py-2.5 px-3 font-display text-sm font-bold shadow active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Home className="h-4 w-4" />
                Menu
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
