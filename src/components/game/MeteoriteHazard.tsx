import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import meteoriteImg from "@/assets/hazard-meteorite.png";

export interface MeteoriteState {
  id: number;
  x: number;        // landing X (px from field left)
  startY: number;   // initial top (negative)
  endY: number;     // ground Y
  size: number;     // px
  slideDx: number;  // px diagonal slide
  fallDuration: number;
}

interface Props {
  meteor: MeteoriteState;
  onLanded: (id: number) => void;
  onExpire: (id: number) => void;
  paused?: boolean;
}

/**
 * Pure-CSS meteorite. Falls diagonally with a glowing trail, "lands" with a
 * squash + smoke burst + screen shake, then sits as a physical obstacle for
 * ~4s before scaling down and fading out.
 */
export function MeteoriteHazard({ meteor, onLanded, onExpire, paused = false }: Props) {
  const [phase, setPhase] = useState<"falling" | "landed" | "fading">("falling");

  // Drive landing → fading → expire timeline.
  useEffect(() => {
    if (phase !== "falling") return;
    if (paused) return;
    const t = window.setTimeout(() => {
      setPhase("landed");
      onLanded(meteor.id);
      // Trigger global screen shake
      const root = document.querySelector(".game-shake-root");
      if (root) {
        root.classList.add("meteor-shake");
        window.setTimeout(() => root.classList.remove("meteor-shake"), 220);
      }
    }, meteor.fallDuration * 1000);
    return () => clearTimeout(t);
  }, [phase, paused, meteor.fallDuration, meteor.id, onLanded]);

  useEffect(() => {
    if (phase !== "landed") return;
    if (paused) return;
    const tFade = window.setTimeout(() => setPhase("fading"), 1000);
    const tEnd = window.setTimeout(() => onExpire(meteor.id), 1400);
    return () => {
      clearTimeout(tFade);
      clearTimeout(tEnd);
    };
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
          {/* Glowing trail behind the meteorite */}
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
          {/* Original meteorite sprite */}
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

  // LANDED + FADING — physical obstacle on the ground (sprite kept)
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
          ? { duration: 0.4, ease: "easeIn" }
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
      {/* Impact crater shadow underneath */}
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
