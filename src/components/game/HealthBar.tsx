/**
 * 👕 VESTITO — HealthBar (3 cuori vita).
 * Mostra 3 icone di cuori in alto a sinistra. Rossi=pieni, grigi=vuoti.
 * Componente puramente visivo, riceve `hearts` (0..3) come prop.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

interface HealthBarProps {
  /** Numero di vite, supporta mezzi cuori (es. 2.5). */
  hearts: number;
  max?: number;
  /** Cuore Dorato attivo: 0 = nessuno, 0.5 = mezzo, 1 = pieno. */
  goldenHeart?: number | boolean;
}

/**
 * Cuore con riempimento parziale (full / half / empty) tramite clip-path.
 */
function PartialHeart({ fill }: { fill: "full" | "half" | "empty" }) {
  if (fill === "full") {
    return (
      <Heart className="h-7 w-7 drop-shadow fill-rose-500 text-rose-600" strokeWidth={2} />
    );
  }
  if (fill === "empty") {
    return (
      <Heart
        className="h-7 w-7 drop-shadow fill-zinc-400/40 text-zinc-500"
        strokeWidth={2}
      />
    );
  }
  // half
  return (
    <div className="relative h-7 w-7">
      <Heart
        className="absolute inset-0 h-7 w-7 fill-zinc-400/40 text-zinc-500"
        strokeWidth={2}
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: "inset(0 50% 0 0)" }}
      >
        <Heart className="h-7 w-7 drop-shadow fill-rose-500 text-rose-600" strokeWidth={2} />
      </div>
    </div>
  );
}

export function HealthBar({ hearts, max = 3, goldenHeart = 0 }: HealthBarProps) {
  const goldenValue = typeof goldenHeart === "number" ? goldenHeart : goldenHeart ? 1 : 0;
  return (
    <motion.div
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="pointer-events-auto absolute left-3 top-24 z-30 flex items-center gap-1.5 rounded-full bg-card/85 text-card-foreground backdrop-blur-md px-3 py-1.5 shadow-lg ring-1 ring-black/5"
      aria-label={`Vite: ${hearts} su ${max}`}
    >
      {Array.from({ length: max }).map((_, i) => {
        const v = hearts - i;
        const fill: "full" | "half" | "empty" = v >= 1 ? "full" : v >= 0.5 ? "half" : "empty";
        return (
          <motion.div
            key={i}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 18, delay: i * 0.04 }}
          >
            <PartialHeart fill={fill} />
          </motion.div>
        );
      })}
      {goldenValue > 0 && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="ml-1 pl-1 border-l border-amber-400/50 relative h-7 w-7"
          aria-label="Cuore Dorato attivo"
          style={{ filter: "drop-shadow(0 0 4px rgba(251,191,36,0.7))" }}
        >
          {goldenValue >= 1 ? (
            <Heart className="h-7 w-7 fill-amber-400 text-amber-600" strokeWidth={2} />
          ) : (
            <>
              <Heart className="absolute inset-0 h-7 w-7 fill-zinc-400/30 text-amber-700/60" strokeWidth={2} />
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "inset(0 50% 0 0)" }}>
                <Heart className="h-7 w-7 fill-amber-400 text-amber-600" strokeWidth={2} />
              </div>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
