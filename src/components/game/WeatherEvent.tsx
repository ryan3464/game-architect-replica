import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

export type WeatherKind = "rain" | "wind" | "fog" | "sun" | "bomb_storm" | "fire_rain";

/** Halve particle counts on small screens / low-core devices to save battery + frames. */
const isLowEnd =
  typeof window !== "undefined" &&
  (window.matchMedia?.("(max-width: 768px)").matches ||
    ((navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 8) <= 4);

interface WeatherEventProps {
  kind: WeatherKind | null;
  windDirection?: 1 | -1;
}

/**
 * Visual overlay for active weather events. Pure presentation — gameplay logic
 * lives in Index.tsx. Effects are positioned absolutely covering the whole field.
 */
export function WeatherEvent({ kind, windDirection = 1 }: WeatherEventProps) {
  // Generate stable random raindrops once per render
  const raindrops = useMemo(
    () =>
      Array.from({ length: isLowEnd ? 28 : 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 0.6 + Math.random() * 0.5,
      })),
    [],
  );

  const leaves = useMemo(
    () =>
      Array.from({ length: isLowEnd ? 7 : 14 }, (_, i) => ({
        id: i,
        y: 5 + Math.random() * 80,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 2,
        size: 14 + Math.random() * 10,
      })),
    [],
  );

  const fogPatches = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        id: i,
        y: 10 + i * 18,
        delay: i * 0.8,
        direction: i % 2 === 0 ? 1 : -1,
      })),
    [],
  );

  return (
    <AnimatePresence>
      {kind === "rain" && (
        <motion.div
          key="rain"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Dim overlay */}
          <div className="absolute inset-0 bg-blue-900/15" />
          {raindrops.map((d) => (
            <motion.div
              key={d.id}
              className="absolute h-6 w-[2px] rounded-full bg-blue-200/70"
              style={{ left: `${d.x}%`, top: -20 }}
              animate={{ y: ["0vh", "110vh"] }}
              transition={{
                duration: d.duration,
                repeat: Infinity,
                delay: d.delay,
                ease: "linear",
              }}
            />
          ))}
        </motion.div>
      )}

      {kind === "wind" && (
        <motion.div
          key="wind"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {leaves.map((l) => (
            <motion.div
              key={l.id}
              className="absolute"
              style={{ top: `${l.y}%`, left: windDirection > 0 ? -40 : "100%", fontSize: l.size }}
              animate={{
                x: windDirection > 0 ? ["0vw", "110vw"] : ["0vw", "-110vw"],
                rotate: [0, 360 * windDirection],
              }}
              transition={{
                duration: l.duration,
                repeat: Infinity,
                delay: l.delay,
                ease: "linear",
              }}
            >
              🍃
            </motion.div>
          ))}
        </motion.div>
      )}

      {kind === "fog" && (
        <motion.div
          key="fog"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute inset-0 bg-white/25 backdrop-blur-[1.5px]" />
          {fogPatches.map((p) => (
            <motion.div
              key={p.id}
              className="absolute h-32 w-[140%] rounded-full bg-white/40 blur-2xl"
              style={{ top: `${p.y}%`, left: "-20%" }}
              animate={{ x: p.direction > 0 ? ["0%", "30%", "0%"] : ["0%", "-30%", "0%"] }}
              transition={{
                duration: 12,
                repeat: Infinity,
                delay: p.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>
      )}

      {kind === "sun" && (
        <motion.div
          key="sun"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Warm golden tint + radial sun glow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 8%, rgba(255, 220, 100, 0.5) 0%, rgba(255, 200, 80, 0.22) 28%, transparent 55%)",
            }}
          />
        </motion.div>
      )}

      {kind === "bomb_storm" && (
        <motion.div
          key="bomb_storm"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(180,20,20,0.18) 0%, rgba(120,10,10,0.32) 100%)",
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}

      {kind === "fire_rain" && (
        <motion.div
          key="fire_rain"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center top, rgba(255,120,40,0.30) 0%, rgba(180,30,10,0.25) 60%, rgba(120,10,10,0.15) 100%)",
            }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const WEATHER_LABEL_KEYS: Record<WeatherKind, { key: string; icon: string; color: string }> = {
  rain: { key: "weather_rain", icon: "🌧️", color: "from-blue-500 to-blue-700" },
  wind: { key: "weather_wind", icon: "💨", color: "from-teal-400 to-emerald-600" },
  fog: { key: "weather_fog", icon: "🌫️", color: "from-slate-400 to-slate-600" },
  sun: { key: "weather_sun", icon: "☀️", color: "from-amber-400 to-orange-500" },
  bomb_storm: { key: "weather_bomb_storm", icon: "💣", color: "from-red-600 to-rose-800" },
  fire_rain: { key: "weather_fire_rain", icon: "🔥", color: "from-orange-500 to-red-700" },
};

export function getWeatherMeta(kind: WeatherKind) {
  return WEATHER_LABEL_KEYS[kind];
}

interface WeatherBannerProps {
  kind: WeatherKind | null;
  remainingSeconds: number;
  label: string;
}

/** Top-center banner showing the active weather event and time left. */
export function WeatherBanner({ kind, remainingSeconds, label }: WeatherBannerProps) {
  return (
    <AnimatePresence>
      {kind && (
        <motion.div
          key={kind}
          initial={{ y: -60, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -60, opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="pointer-events-none absolute right-2 top-[160px] z-20"
        >
          <div
            className={`flex flex-col items-center gap-0.5 rounded-2xl bg-gradient-to-b ${getWeatherMeta(
              kind,
            ).color} px-2 py-1.5 shadow-xl ring-2 ring-white/30 text-white`}
          >
            <span className="text-base leading-none">{getWeatherMeta(kind).icon}</span>
            <span className="font-display text-[9px] font-bold uppercase tracking-wide leading-none">{label}</span>
            <span className="font-display text-[9px] font-bold tabular-nums opacity-80 leading-none">
              {remainingSeconds}s
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
