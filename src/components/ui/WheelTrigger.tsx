/**
 * 👕 VESTITO — Bottone trigger della Ruota della Fortuna.
 * Solo presentazione: riceve `spinsLeft`, `maxSpins`, `onClick`.
 */
import { motion } from "framer-motion";

interface WheelTriggerProps {
  spinsLeft: number;
  maxSpins: number;
  onClick: () => void;
  className?: string;
}

export function WheelTrigger({ spinsLeft, maxSpins, onClick, className = "" }: WheelTriggerProps) {
  const hasSpins = spinsLeft > 0;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Ruota della Fortuna"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.2 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className={`pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 shadow-[0_6px_20px_-4px_rgba(0,0,0,0.45)] ring-2 ring-amber-100/80 dark:ring-amber-200/30 ${className}`}
    >
      {/* Pulse halo */}
      {hasSpins && (
        <motion.span
          className="absolute inset-0 rounded-full bg-amber-300/60"
          animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Icona ruota */}
      <motion.svg
        viewBox="0 0 64 64"
        className="relative h-7 w-7 drop-shadow"
        animate={hasSpins ? { rotate: [0, 360] } : { rotate: 0 }}
        transition={hasSpins ? { duration: 8, repeat: Infinity, ease: "linear" } : undefined}
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="28" fill="#fff8e1" stroke="#7a4a00" strokeWidth="3" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a1 = (i * 45 - 90) * (Math.PI / 180);
          const a2 = ((i + 1) * 45 - 90) * (Math.PI / 180);
          const x1 = 32 + 28 * Math.cos(a1);
          const y1 = 32 + 28 * Math.sin(a1);
          const x2 = 32 + 28 * Math.cos(a2);
          const y2 = 32 + 28 * Math.sin(a2);
          const colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#eab308"];
          return (
            <path
              key={i}
              d={`M32 32 L${x1} ${y1} A28 28 0 0 1 ${x2} ${y2} Z`}
              fill={colors[i]}
              stroke="#7a4a00"
              strokeWidth="1.5"
            />
          );
        })}
        <circle cx="32" cy="32" r="6" fill="#fde68a" stroke="#7a4a00" strokeWidth="2" />
      </motion.svg>

      {/* Badge giri rimanenti */}
      <span
        className={`absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white shadow ring-2 ring-white ${
          hasSpins ? "bg-rose-500" : "bg-zinc-500"
        }`}
      >
        {spinsLeft}/{maxSpins}
      </span>
    </motion.button>
  );
}
