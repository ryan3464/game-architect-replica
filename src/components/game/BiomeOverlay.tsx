import { motion } from "framer-motion";
import type { BiomeKind } from "@/lib/levels";

interface BiomeOverlayProps {
  biome?: BiomeKind;
}

/**
 * Mobile / low-end device detection — used to halve particle counts so the
 * biome overlays don't tank the framerate on phones.
 */
const isLowEnd =
  typeof window !== "undefined" &&
  (window.matchMedia?.("(max-width: 768px)").matches ||
    (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency !== undefined &&
      ((navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 8) <= 4);

/**
 * Decorative, non-interactive visual layer that gives volcano / tundra / space
 * biomes a unique on-screen identity. Pointer-events: none so it never blocks
 * gameplay. Sits above the background but below fruit / bucket.
 */
export function BiomeOverlay({ biome }: BiomeOverlayProps) {
  if (!biome) return null;

  if (biome === "volcano") {
    // Realistic erupting embers + heat haze + lava glow.
    // NO standing flame tongues — fire only appears where fireballs hit
    // (handled by per-impact firePatches in the game component).
    const embers = Array.from({ length: isLowEnd ? 10 : 22 });
    return (
      <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        {/* Bottom lava glow — pulsing */}
        <motion.div
          className="absolute inset-x-0 bottom-0 h-40"
          style={{
            background:
              "linear-gradient(to top, rgba(255,60,10,0.5) 0%, rgba(255,120,30,0.3) 35%, rgba(255,180,60,0.12) 70%, transparent 100%)",
            mixBlendMode: "screen",
            filter: "blur(2px)",
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Heat haze tint */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 110%, rgba(255,90,30,0.22) 0%, transparent 55%)",
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Rising embers */}
        {embers.map((_, i) => {
          const left = (i * 7.3) % 100;
          const delay = (i * 0.4) % 5;
          const dur = 3 + (i % 4);
          const size = 3 + (i % 5);
          return (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                bottom: -10,
                width: size,
                height: size,
                background: "radial-gradient(circle, #fff2c4 0%, #ffb24a 40%, #ff5a1a 75%, transparent 100%)",
                boxShadow: "0 0 12px rgba(255,140,40,0.95)",
              }}
              animate={{
                y: ["0vh", "-110vh"],
                x: [0, (i % 2 === 0 ? 1 : -1) * 50, (i % 2 === 0 ? -1 : 1) * 30, 0],
                opacity: [0, 1, 1, 0],
                scale: [1, 1.2, 0.9, 0.6],
              }}
              transition={{
                duration: dur,
                delay,
                repeat: Infinity,
                ease: "easeOut",
                times: [0, 0.15, 0.85, 1],
              }}
            />
          );
        })}
      </div>
    );
  }

  if (biome === "tundra") {
    // PREMIUM tundra atmosphere — multi-layer parallax snow, aurora ribbons,
    // edge bloom, cold ground vapor, foreground depth-of-field flakes.
    const flakesFar = Array.from({ length: isLowEnd ? 10 : 22 });
    const flakesMid = Array.from({ length: isLowEnd ? 8 : 16 });
    const flakesNear = Array.from({ length: isLowEnd ? 4 : 8 });
    const vaporPuffs = Array.from({ length: isLowEnd ? 4 : 7 });
    return (
      <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        {/* Cold tint */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(180,220,255,0.18) 0%, rgba(120,180,230,0.08) 60%, transparent 100%)",
          }}
        />
        {/* Edge bloom — soft cyan vignette around the playfield */}
        <div
          className="absolute inset-0"
          style={{
            boxShadow:
              "inset 0 0 120px 20px rgba(120,200,255,0.35), inset 0 0 220px 60px rgba(80,160,230,0.18)",
          }}
        />
        {/* Aurora ribbons */}
        <motion.div
          className="absolute inset-x-0 top-0 h-1/2"
          style={{
            background:
              "linear-gradient(120deg, transparent 0%, rgba(120,255,200,0.4) 25%, rgba(180,120,255,0.35) 55%, transparent 80%)",
            filter: "blur(28px)",
            mixBlendMode: "screen",
          }}
          animate={{ x: ["-15%", "15%", "-15%"], opacity: [0.6, 0.95, 0.6] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-x-0 top-[10%] h-1/3"
          style={{
            background:
              "linear-gradient(80deg, transparent 0%, rgba(160,255,180,0.3) 40%, rgba(100,200,255,0.35) 70%, transparent 100%)",
            filter: "blur(36px)",
            mixBlendMode: "screen",
          }}
          animate={{ x: ["10%", "-10%", "10%"], opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Parallax FAR — slow tiny flakes */}
        {flakesFar.map((_, i) => {
          const left = (i * 4.7) % 100;
          const delay = (i * 0.4) % 8;
          const dur = 14 + (i % 6);
          const size = 2 + (i % 2);
          return (
            <motion.span
              key={`far-${i}`}
              className="absolute rounded-full bg-white"
              style={{ left: `${left}%`, top: -10, width: size, height: size, opacity: 0.55, filter: "blur(0.5px)" }}
              animate={{ y: ["0vh", "110vh"], x: [0, (i % 2 === 0 ? 1 : -1) * 20, 0] }}
              transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
            />
          );
        })}
        {/* Parallax MID */}
        {flakesMid.map((_, i) => {
          const left = (i * 6.3) % 100;
          const delay = (i * 0.35) % 6;
          const dur = 7 + (i % 4);
          const size = 3 + (i % 3);
          return (
            <motion.span
              key={`mid-${i}`}
              className="absolute rounded-full bg-white"
              style={{ left: `${left}%`, top: -10, width: size, height: size, opacity: 0.85, boxShadow: "0 0 4px rgba(255,255,255,0.9)" }}
              animate={{ y: ["0vh", "110vh"], x: [0, (i % 2 === 0 ? 1 : -1) * 30, 0] }}
              transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
            />
          );
        })}
        {/* Parallax NEAR — big blurred flakes (depth-of-field foreground) */}
        {flakesNear.map((_, i) => {
          const left = (i * 13.7) % 100;
          const delay = (i * 0.6) % 4;
          const dur = 4 + (i % 2);
          const size = 12 + (i % 3) * 4;
          return (
            <motion.span
              key={`near-${i}`}
              className="absolute rounded-full bg-white"
              style={{ left: `${left}%`, top: -30, width: size, height: size, opacity: 0.5, filter: "blur(4px)" }}
              animate={{ y: ["-5vh", "115vh"], x: [0, (i % 2 === 0 ? 1 : -1) * 60, 0] }}
              transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
            />
          );
        })}
        {/* Cold ground vapor */}
        {vaporPuffs.map((_, i) => {
          const left = 5 + ((i * 14) % 90);
          const delay = (i * 0.9) % 5;
          const dur = 6 + (i % 3);
          return (
            <motion.div
              key={`vapor-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                bottom: -40,
                width: 80 + (i % 3) * 30,
                height: 60 + (i % 3) * 20,
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(220,240,255,0.55) 0%, rgba(180,220,255,0.25) 45%, transparent 75%)",
                filter: "blur(8px)",
                mixBlendMode: "screen",
              }}
              animate={{ y: [0, -120, -240], opacity: [0, 0.85, 0], scale: [0.7, 1.1, 1.4] }}
              transition={{ duration: dur, delay, repeat: Infinity, ease: "easeOut" }}
            />
          );
        })}
      </div>
    );
  }


  if (biome === "space") {
    // Twinkling stars + drifting nebula + occasional shooting star + solid ground
    const stars = Array.from({ length: isLowEnd ? 22 : 50 });
    const shooting = Array.from({ length: isLowEnd ? 2 : 3 });
    return (
      <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        {/* Deep space tint */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 30%, rgba(120,80,200,0.3) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(40,80,200,0.35) 0%, transparent 55%)",
            mixBlendMode: "screen",
          }}
        />
        {/* Stars */}
        {stars.map((_, i) => {
          const left = (i * 7.7) % 100;
          const top = (i * 11.3) % 85; // keep stars above ground
          const size = 1 + (i % 3);
          const delay = (i * 0.17) % 3;
          return (
            <motion.span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                boxShadow: "0 0 6px rgba(255,255,255,0.9)",
              }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 2 + (i % 3), delay, repeat: Infinity, ease: "easeInOut" }}
            />
          );
        })}
        {/* Shooting stars */}
        {shooting.map((_, i) => {
          const top = 10 + i * 25;
          const delay = i * 4 + 2;
          return (
            <motion.span
              key={`shoot-${i}`}
              className="absolute h-[2px] w-24"
              style={{
                top: `${top}%`,
                left: "-10%",
                background: "linear-gradient(90deg, transparent, white, transparent)",
                filter: "drop-shadow(0 0 6px white)",
                transform: "rotate(15deg)",
              }}
              animate={{ x: ["0vw", "120vw"], opacity: [0, 1, 0] }}
              transition={{ duration: 1.4, delay, repeat: Infinity, repeatDelay: 8, ease: "easeOut" }}
            />
          );
        })}
        {/* Floating planet */}
        <motion.div
          className="absolute"
          style={{
            top: "8%",
            right: "6%",
            width: 90,
            height: 90,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle at 30% 30%, #ffd5a0 0%, #d97a3a 50%, #6b2a10 100%)",
            boxShadow: "0 0 40px rgba(255,160,80,0.4), inset -10px -8px 30px rgba(0,0,0,0.5)",
          }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  return null;
}
