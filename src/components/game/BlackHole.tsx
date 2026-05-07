import { motion } from "framer-motion";
import blackHoleImg from "@/assets/hazard-blackhole.png";

export interface BlackHoleState {
  id: number;
  /** Container-local center x (px). */
  x: number;
  /** Container-local center y (px). */
  y: number;
  /** Pull radius in px. */
  radius: number;
  /** Spawn timestamp (performance.now). */
  bornAt: number;
  /** Lifetime in ms. */
  lifeMs: number;
}

interface Props {
  hole: BlackHoleState;
}

/**
 * Visual-only black hole. The pulling/destroying logic lives in Index.tsx so it
 * can read & mutate the in-flight fruits list each frame.
 */
export function BlackHole({ hole }: Props) {
  const size = hole.radius * 1.6;
  return (
    <motion.div
      className="pointer-events-none absolute z-20 select-none"
      style={{
        left: hole.x - size / 2,
        top: hole.y - size / 2,
        width: size,
        height: size,
      }}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {/* Pull ring */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          border: "2px solid rgba(180,120,255,0.55)",
          boxShadow: "0 0 30px rgba(140,80,220,0.65), inset 0 0 25px rgba(140,80,220,0.55)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0.4, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Spinning core image */}
      <motion.img
        src={blackHoleImg}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full"
        style={{ filter: "drop-shadow(0 0 18px rgba(120,60,200,0.85))" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}