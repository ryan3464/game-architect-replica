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
    // Twinkling stars + nebula (slow hue-rotate) + shooting stars
    // + cosmic constellation tree integrated in bg + stardust drift.
    const stars = Array.from({ length: isLowEnd ? 22 : 50 });
    const shooting = Array.from({ length: isLowEnd ? 2 : 3 });
    const stardust = Array.from({ length: isLowEnd ? 18 : 36 });
    return (
      <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        {/* Animated nebula — slow hue-rotate keeps the bg "alive" */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 30%, rgba(120,80,200,0.32) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(40,80,200,0.38) 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, rgba(180,60,200,0.22) 0%, transparent 60%)",
            mixBlendMode: "screen",
          }}
          animate={{ filter: ["hue-rotate(0deg)", "hue-rotate(40deg)", "hue-rotate(-30deg)", "hue-rotate(0deg)"] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Stars */}
        {stars.map((_, i) => {
          const left = (i * 7.7) % 100;
          const top = (i * 11.3) % 85;
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
        {/* Stardust drift — slow floating particles for depth */}
        {stardust.map((_, i) => {
          const left = (i * 5.9) % 100;
          const startTop = 20 + ((i * 7) % 60);
          const dur = 14 + (i % 7);
          const delay = (i * 0.3) % 6;
          const sz = 1 + (i % 3);
          const drift = (i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 8);
          return (
            <motion.span
              key={`dust-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                top: `${startTop}%`,
                width: sz,
                height: sz,
                background:
                  "radial-gradient(circle, rgba(220,210,255,0.95) 0%, rgba(160,140,220,0.5) 60%, transparent 100%)",
                boxShadow: "0 0 6px rgba(200,180,255,0.9)",
                filter: "blur(0.4px)",
              }}
              animate={{ y: [0, -40, -80, -120], x: [0, drift, drift * 0.4, 0], opacity: [0, 0.9, 0.9, 0] }}
              transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
            />
          );
        })}
        {/* Cosmic constellation tree — integrated, translucent */}
        <CosmicTree />
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

/**
 * Cosmic tree painted directly in the biome layer (no external image).
 * Branches are translucent gradients dotted with star nodes — looks like
 * a constellation rooted in the playfield.
 */
function CosmicTree() {
  const branches = [
    { d: "M50,100 Q42,78 30,58 Q22,44 12,30", w: 2.4 },
    { d: "M50,100 Q58,78 70,58 Q78,44 88,30", w: 2.4 },
    { d: "M50,100 Q48,72 44,46 Q42,30 40,16", w: 2.0 },
    { d: "M50,100 Q52,72 56,46 Q58,30 60,16", w: 2.0 },
    { d: "M50,100 Q40,82 26,72 Q14,66 4,62", w: 1.6 },
    { d: "M50,100 Q60,82 74,72 Q86,66 96,62", w: 1.6 },
  ];
  const nodes = [
    { x: 12, y: 30 }, { x: 88, y: 30 }, { x: 40, y: 16 }, { x: 60, y: 16 },
    { x: 22, y: 44 }, { x: 78, y: 44 }, { x: 4, y: 62 }, { x: 96, y: 62 },
    { x: 30, y: 58 }, { x: 70, y: 58 }, { x: 44, y: 46 }, { x: 56, y: 46 },
    { x: 50, y: 100 },
  ];
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2"
      style={{
        bottom: 80,
        width: "min(96vw, 720px)",
        height: "min(80vh, 640px)",
        opacity: 0.85,
        mixBlendMode: "screen",
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="cosmicBranch" x1="0" y1="100%" x2="0" y2="0">
            <stop offset="0%" stopColor="#a78bff" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#c4a8ff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="cosmicNode">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="60%" stopColor="#b9a6ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#7c5dff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d="M48,100 Q47,80 49,60 Q51,40 50,18"
          stroke="url(#cosmicBranch)"
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(180,140,255,0.8))" }}
        />
        {branches.map((b, i) => (
          <path
            key={i}
            d={b.d}
            stroke="url(#cosmicBranch)"
            strokeWidth={b.w}
            fill="none"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px rgba(160,120,255,0.7))" }}
          />
        ))}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={1.6} fill="url(#cosmicNode)">
            <animate
              attributeName="opacity"
              values="0.4;1;0.4"
              dur={`${2 + (i % 4)}s`}
              repeatCount="indefinite"
              begin={`${(i * 0.2) % 3}s`}
            />
          </circle>
        ))}
      </svg>
    </div>
  );
}
