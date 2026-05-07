/**
 * 👕 VESTITO — Tasto "Rewarded Ad" (+1 giro extra).
 * Look professionale gradiente oro/neon, icona Play (lucide), testo "+1".
 * Vibra ogni 5 secondi per attirare l'attenzione.
 */
import { motion } from "framer-motion";
import { Play, Loader2 } from "lucide-react";

interface AdSpinButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}

export function AdSpinButton({ onClick, loading, disabled }: AdSpinButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label="Guarda una pubblicità per +1 giro"
      whileTap={{ scale: 0.92 }}
      animate={
        loading || disabled
          ? { x: 0, rotate: 0 }
          : {
              x: [0, -2, 2, -2, 2, 0],
              rotate: [0, -2, 2, -1, 1, 0],
            }
      }
      transition={{
        duration: 0.6,
        repeat: loading || disabled ? 0 : Infinity,
        repeatDelay: 4.4, // vibra ogni ~5s
        ease: "easeInOut",
      }}
      className="relative flex h-16 w-16 flex-col items-center justify-center rounded-2xl
                 bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600
                 text-white font-display font-extrabold shadow-[0_6px_20px_-4px_rgba(245,158,11,0.7),inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-3px_6px_rgba(0,0,0,0.3)]
                 ring-2 ring-amber-200/80
                 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {/* Glow neon di fondo */}
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-200/40 to-transparent" />
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <>
          <Play className="h-5 w-5 drop-shadow" fill="currentColor" />
          <span className="mt-0.5 text-[11px] leading-none drop-shadow">+1</span>
        </>
      )}
    </motion.button>
  );
}
