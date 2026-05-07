import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import meteoriteImg from "@/assets/hazard-meteorite.png";

export interface MeteoriteState {
  id: number;
  x: number;        // landing X (px from field left)
  startY: number;   // initial top (negative)
  endY: number;     // ground Y (top of meteorite when landed)
  size: number;     // px
  slideDx: number;  // px diagonal slide
  fallDuration: number;
  /** Large meteorites act as solid obstacles for ~3s before fading. */
  isLarge?: boolean;
}

interface Props {
  meteor: MeteoriteState;
  onLanded: (id: number) => void;
  onExpire: (id: number) => void;
  paused?: boolean;
}

/**
 * Pure-CSS meteorite. Falls diagonally with a glowing trail.
 * - Small/Medium: shatter instantly on impact (particles + remove).
 * - Large: lands as a solid obstacle for 3 seconds, then fades.
 */
export function MeteoriteHazard({ meteor, onLanded, onExpire, paused = false }: Props) {
  const [phase, setPhase] = useState<"falling" | "landed" | "fading" | "shatter">("falling");

  // Falling -> landed/shatter timeline
  useEffect(() => {
    if (phase !== "falling") return;
    if (paused) return;
    const t = window.setTimeout(() => {
      onLanded(meteor.id);
      // Trigger global screen shake
      const root = document.querySelector(".game-shake-root");
      if (root) {
        root.classList.add("meteor-shake");
        window.setTimeout(() => root.classList.remove("meteor-shake"), 220);
      }
      if (meteor.isLarge) {
        setPhase("landed");
      } else {
        setPhase("shatter");
      }
    }, meteor.fallDuration * 1000);
    return () => clearTimeout(t);
  }, [phase, paused, meteor.fallDuration, meteor.id, meteor.isLarge, onLanded]);

  // Large meteorites: 3s solid, then fade & expire
  useEffect(() => {
    if (phase !== "landed") return;
    if (paused) return;
    const tFade = window.setTimeout(() => setPhase("fading"), 3000);
    const tEnd = window.setTimeout(() => onExpire(meteor.id), 3500);
    return () => {
      clearTimeout(tFade);
      clearTimeout(tEnd);
    };
  }, [phase, paused, meteor.id, onExpire]);

  // Shatter (small/medium): brief particle burst then expire
  useEffect(() => {
    if (phase !== "shatter") return;
    if (paused) return;
    const tEnd = window.setTimeout(() => onExpire(meteor.id), 500);
    return () => clearTimeout(tEnd);
  }, [phase, paused, meteor.id, onExpire]);

  const fallDistance = meteor.endY - meteor.startY;

  if (phase === "falling") {
    return (
      <div
        className="pointer-events-none absolute z-[22] select-none"
        style={{ left: meteor.x, top: meteor.startY, width: meteor.size, height: meteor.size }}
      >
        <motion.div
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={paused ? {} : { x: meteor.slideDx, y: fallDistance, opacity: 1 }}
          transition={{
            x: { duration: meteor.fallDuration, ease: "linear" },
            y: { duration: meteor.fallDuration, ease: "easeIn" },
            opacity: { duration: 0.05 },
          }}
          style={{ width: meteor.size, height: meteor.size, position: "relative" }}
        >
          <div
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: "55%",
              width: meteor.size * 0.55,
              height: meteor.size * 2.6,
              background:
                "linear-gradient(to top, rgba(255,180,120,0.95) 0%, rgba(220,120,80,0.7) 25%, rgba(120,80,80,0.3) 55%, rgba(80,40,40,0) 100%)",
              filter: "blur(3px)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
          <img
            src={meteoriteImg}
            alt=""
            width={meteor.size}
            height={meteor.size}
            draggable={false}
            className="absolute inset-0 select-none"
            style={{
              width: meteor.size,
              height: meteor.size,
              filter:
                "drop-shadow(0 0 12px rgba(255,160,100,0.85)) drop-shadow(0 0 22px rgba(180,80,40,0.55))",
            }}
          />
        </motion.div>
      </div>
    );
  }

  // SHATTER: small / medium meteorites — burst into particles
  if (phase === "shatter") {
    const shards = Array.from({ length: 10 });
    return (
      <div
        className="pointer-events-none absolute z-[22] select-none"
        style={{
          left: meteor.x + meteor.slideDx,
          top: meteor.endY,
          width: meteor.size,
          height: meteor.size,
        }}
      >
        {shards.map((_, i) => {
          const angle = (i / shards.length) * Math.PI * 2;
          const dist = 40 + Math.random() * 30;
          const dx = Math.cos(angle) * dist;
          const dy = Math.sin(angle) * dist - 10;
          return (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: 6 + (i % 3) * 2,
                height: 6 + (i % 3) * 2,
                background:
                  "radial-gradient(circle, #ffb066 0%, #c2410c 60%, transparent 100%)",
                filter: "drop-shadow(0 0 6px rgba(255,140,60,0.9))",
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: dx, y: dy, opacity: 0, scale: 0.3 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          );
        })}
      </div>
    );
  }

  // LANDED + FADING — large meteorite acts as solid obstacle for 3s
  const isFading = phase === "fading";
  return (
    <motion.div
      className="pointer-events-none absolute z-[22] select-none"
      style={{ left: meteor.x + meteor.slideDx, top: meteor.endY, width: meteor.size, height: meteor.size }}
      initial={{ scale: 1, scaleY: 1, opacity: 1 }}
      animate={
        isFading
          ? { scale: 0, opacity: 0 }
          : { scaleY: [0.55, 1.05, 0.9], scale: [1, 1, 1] }
      }
      transition={
        isFading
          ? { duration: 0.5, ease: "easeIn" }
          : { duration: 0.35, ease: "easeOut", times: [0, 0.5, 1] }
      }
    >
      <motion.img
        src={meteoriteImg}
        alt=""
        width={meteor.size}
        height={meteor.size}
        draggable={false}
        className="absolute inset-0 select-none"
        style={{ width: meteor.size, height: meteor.size }}
        animate={{
          filter: [
            "drop-shadow(0 0 14px rgba(255,90,30,0.9)) drop-shadow(0 0 26px rgba(255,120,40,0.6))",
            "drop-shadow(0 0 8px rgba(194,65,12,0.7)) drop-shadow(0 0 14px rgba(140,50,20,0.45))",
            "drop-shadow(0 0 14px rgba(255,90,30,0.9)) drop-shadow(0 0 26px rgba(255,120,40,0.6))",
          ],
        }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Smoke particles rising */}
      {!isFading &&
        Array.from({ length: 6 }).map((_, i) => {
          const lx = 18 + (i * 13) % 70;
          const delay = i * 0.18;
          return (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${lx}%`,
                bottom: "55%",
                width: 10 + (i % 3) * 4,
                height: 10 + (i % 3) * 4,
                background: "radial-gradient(circle, rgba(180,180,180,0.85) 0%, rgba(120,120,120,0.4) 60%, transparent 100%)",
                filter: "blur(2px)",
              }}
              animate={{
                y: [0, -50 - (i % 3) * 14],
                x: [0, (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 4)],
                opacity: [0, 0.85, 0],
                scale: [0.4, 1.4, 1.8],
              }}
              transition={{ duration: 1.6 + (i % 3) * 0.2, delay, repeat: Infinity, ease: "easeOut" }}
            />
          );
        })}
      {/* Countdown ring — visual hint that it's about to disappear */}
      {!isFading && (
        <motion.div
          className="absolute -inset-2 rounded-full"
          style={{
            border: "3px solid rgba(255,140,60,0.85)",
            boxShadow: "0 0 18px rgba(255,140,60,0.6)",
          }}
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: [0.9, 0.4, 0.9], scale: [1, 1.06, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div
        className="absolute"
        style={{
          left: "-15%",
          right: "-15%",
          bottom: -6,
          height: 14,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, transparent 70%)",
        }}
      />
    </motion.div>
  );
}
