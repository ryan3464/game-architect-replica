import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

export type LightningPhase = "warning" | "strike";

export interface LightningStrikeState {
  id: number;
  x: number;
  phase: LightningPhase;
}

interface LightningStrikeProps {
  strike: LightningStrikeState;
  fieldHeight: number;
}

/** Generate a random zigzag bolt path from top to bottom. */
function generateBoltPath(width: number, height: number, segments = 10): string {
  const step = height / segments;
  let x = width / 2;
  const points: string[] = [`M${x} 0`];
  for (let i = 1; i <= segments; i++) {
    const y = step * i;
    // Random horizontal displacement — gets wider in the middle
    const spread = (i < segments ? 18 + Math.random() * 22 : 8);
    x = width / 2 + (Math.random() - 0.5) * spread * 2;
    x = Math.max(8, Math.min(width - 8, x));
    points.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(" ");
}

/** Impact particles that burst upward when lightning hits ground. */
function ImpactParticles({ x, fieldHeight }: { x: number; fieldHeight: number }) {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i / 12) * Math.PI * 2,
      speed: 40 + Math.random() * 60,
      size: 2 + Math.random() * 4,
      isBlue: Math.random() > 0.4,
    })), []);

  return (
    <div
      className="pointer-events-none absolute z-[19]"
      style={{ left: x - 60, top: fieldHeight - 80, width: 120, height: 80 }}
    >
      {particles.map((p) => {
        const dx = Math.cos(p.angle - Math.PI / 2) * p.speed;
        const dy = -Math.abs(Math.sin(p.angle - Math.PI / 2)) * p.speed - 20;
        return (
          <motion.span
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: 60,
              bottom: 10,
              width: p.size,
              height: p.size,
              background: p.isBlue
                ? "radial-gradient(circle, #93c5fd, #3b82f6)"
                : "radial-gradient(circle, #ffffff, #e0e7ff)",
              boxShadow: p.isBlue
                ? "0 0 8px rgba(59,130,246,0.9)"
                : "0 0 6px rgba(255,255,255,0.9)",
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: dx, y: dy, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.5 + Math.random() * 0.3, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

export function LightningStrike({ strike, fieldHeight }: LightningStrikeProps) {
  const { x, phase, id } = strike;

  // Pre-generate 4 different bolt shapes for the rapid-flash effect
  const boltPaths = useMemo(() =>
    Array.from({ length: 4 }, () => generateBoltPath(80, fieldHeight - 30)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, fieldHeight]
  );

  return (
    <div
      className="pointer-events-none absolute z-[18]"
      style={{ left: x - 60, top: 0, width: 120, height: fieldHeight }}
    >
      <AnimatePresence>
        {phase === "warning" && (
          <motion.div
            key="warn"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Storm cloud charging up above the strike point */}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: -6, width: 110, height: 50 }}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: [0.85, 1.05, 1], opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Cloud silhouette */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 55% 60% at 30% 60%, rgba(40,55,80,0.95) 0%, transparent 70%), radial-gradient(ellipse 50% 55% at 70% 55%, rgba(50,65,90,0.95) 0%, transparent 70%), radial-gradient(ellipse 60% 55% at 50% 70%, rgba(35,50,75,0.95) 0%, transparent 70%)",
                  filter: "blur(1px)",
                }}
              />
              {/* Charging glow inside the cloud — pulses brighter as it charges */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 45% 35% at 50% 65%, rgba(180,210,255,0.95) 0%, rgba(120,170,240,0.6) 40%, transparent 75%)",
                  mixBlendMode: "screen",
                  filter: "blur(2px)",
                }}
                animate={{ opacity: [0.2, 1, 0.4, 1] }}
                transition={{ duration: 1, ease: "easeIn" }}
              />
              {/* Tiny crackling sparks inside the cloud */}
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    left: `${30 + i * 18}%`,
                    top: `${55 + (i % 2) * 12}%`,
                    width: 2.5,
                    height: 2.5,
                    boxShadow: "0 0 6px rgba(180,210,255,0.95)",
                  }}
                  animate={{ opacity: [0, 1, 0, 1, 0], scale: [0.6, 1.3, 0.8, 1.2, 0.6] }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: "easeOut" }}
                />
              ))}
            </motion.div>
            {/* Thin pulsing energy line — the warning laser */}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: 30,
                width: 1.5,
                height: fieldHeight - 30,
                background:
                  "linear-gradient(to bottom, rgba(147,197,253,0.7), rgba(147,197,253,0.15))",
                boxShadow: "0 0 12px rgba(147,197,253,0.6), 0 0 4px rgba(147,197,253,0.9)",
              }}
              animate={{ opacity: [0.25, 0.75, 0.25] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}

        {phase === "strike" && (
          <motion.div
            key="strike"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
          >
            {/* Storm cloud discharging — flashes white then fades and shrinks */}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: -6, width: 110, height: 50 }}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: [1, 1, 0], scale: [1, 1.1, 0.9] }}
              transition={{ duration: 0.45, ease: "easeOut", times: [0, 0.3, 1] }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 55% 60% at 30% 60%, rgba(40,55,80,0.95) 0%, transparent 70%), radial-gradient(ellipse 50% 55% at 70% 55%, rgba(50,65,90,0.95) 0%, transparent 70%), radial-gradient(ellipse 60% 55% at 50% 70%, rgba(35,50,75,0.95) 0%, transparent 70%)",
                  filter: "blur(1px)",
                }}
              />
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 60% at 50% 70%, rgba(255,255,255,1) 0%, rgba(180,210,255,0.85) 35%, transparent 80%)",
                  mixBlendMode: "screen",
                  filter: "blur(2px)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [1, 0.4, 0] }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </motion.div>
            {/* Rapid flash bolts — 4 flashes in ~0.25s, each with a different path */}
            {boltPaths.map((path, i) => (
              <motion.svg
                key={i}
                className="absolute left-1/2 -translate-x-1/2"
                style={{ top: 30, width: 80, height: fieldHeight - 30 }}
                viewBox={`0 0 80 ${fieldHeight - 30}`}
                preserveAspectRatio="none"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 0.07,
                  delay: i * 0.06,
                  ease: "easeOut",
                }}
              >
                <defs>
                  <filter id={`lglow-${id}-${i}`} x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="6" />
                  </filter>
                </defs>
                {/* Outer electric blue glow */}
                <path
                  d={path}
                  stroke="#60a5fa"
                  strokeWidth={10}
                  fill="none"
                  filter={`url(#lglow-${id}-${i})`}
                  opacity="0.8"
                />
                {/* Mid glow */}
                <path
                  d={path}
                  stroke="#93c5fd"
                  strokeWidth={5}
                  fill="none"
                  opacity="0.9"
                />
                {/* White hot core */}
                <path
                  d={path}
                  stroke="#ffffff"
                  strokeWidth={2}
                  fill="none"
                />
              </motion.svg>
            ))}

            {/* Impact particles at ground level */}
            <ImpactParticles x={60} fieldHeight={fieldHeight} />

            {/* Ambient flash — brightens the entire screen briefly */}
            <motion.div
              className="fixed inset-0 pointer-events-none"
              style={{
                background: "rgba(200,220,255,0.35)",
                mixBlendMode: "screen",
              }}
              initial={{ opacity: 0.9 }}
              animate={{ opacity: [0.9, 0, 0.5, 0, 0.3, 0] }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
