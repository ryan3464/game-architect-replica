import { motion } from "framer-motion";

interface GoldenBurstProps {
  x: number;
  y: number;
}

/** Renders a burst of 10 sparkles flying outward. Place absolutely-positioned. */
export function GoldenBurst({ x, y }: GoldenBurstProps) {
  const sparkles = Array.from({ length: 10 });
  return (
    <div className="pointer-events-none absolute z-30" style={{ left: x, top: y }}>
      {sparkles.map((_, i) => {
        const angle = (i / sparkles.length) * Math.PI * 2;
        const dist = 40 + Math.random() * 30;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
            animate={{ x: dx, y: dy, opacity: 0, scale: 1.4, rotate: 180 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute text-lg"
            style={{
              filter: "drop-shadow(0 0 4px gold)",
            }}
          >
            ✨
          </motion.span>
        );
      })}
    </div>
  );
}
