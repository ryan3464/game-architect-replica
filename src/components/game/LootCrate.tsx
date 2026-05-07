import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import crateImg from "@/assets/loot-crate.png";
import parachuteImg from "@/assets/parachute.png";
import coinImg from "@/assets/coin.png";
import { acquireExternalPause, releaseExternalPause } from "@/lib/external-pause";

export type LootKind = "coins" | "magnet" | "slowmo" | "golden_fruits" | "skin";
export type LootTier = "common" | "rare" | "epic" | "legendary";

export interface LootDrop {
  kind: LootKind;
  amount: number;
  /** Optional rarity tier shown in the reveal popup */
  tier?: LootTier;
  /** When kind === "skin", the readable skin name */
  skinName?: string;
}

export interface CrateState {
  id: number;
  x: number;
  startY: number;
  endY: number;
  /** Pre-rolled loot revealed when player taps the crate. */
  loot: LootDrop;
}

interface LootCrateProps {
  crate: CrateState;
  onTap: (id: number, loot: LootDrop, x: number, y: number) => void;
  onExpire: (id: number) => void;
}

const FALL_DURATION = 4.2;
const SIT_TIME_MS = 6000;

export function LootCrate({ crate, onTap, onExpire }: LootCrateProps) {
  const [phase, setPhase] = useState<"falling" | "landed" | "opened">("falling");

  useEffect(() => {
    const fallT = setTimeout(() => setPhase("landed"), FALL_DURATION * 1000);
    const expireT = setTimeout(() => onExpire(crate.id), FALL_DURATION * 1000 + SIT_TIME_MS);
    return () => {
      clearTimeout(fallT);
      clearTimeout(expireT);
    };
  }, [crate.id, onExpire]);

  const handleActivate = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (phase === "opened") return;
    onTap(crate.id, crate.loot, crate.x + 36, (phase === "landed" ? crate.endY : crate.startY) + 36);
    setPhase("opened");
  };

  const fallDistance = crate.endY - crate.startY;

  if (phase === "opened") return null;

  return (
    <motion.button
      type="button"
      onClick={handleActivate}
      className="absolute z-40 cursor-pointer touch-manipulation pointer-events-auto"
      style={{ left: crate.x, top: crate.startY, width: 80, height: 110 }}
      initial={{ y: 0, opacity: 0 }}
      animate={{
        y: phase === "falling" ? fallDistance : fallDistance,
        opacity: 1,
      }}
      transition={{
        y: { duration: FALL_DURATION, ease: "easeIn" },
        opacity: { duration: 0.3 },
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      aria-label="Loot crate"
    >
      <AnimatePresence>
        {phase === "falling" && (
          <motion.img
            src={parachuteImg}
            alt=""
            width={80}
            height={70}
            className="absolute -top-12 left-0 w-20 h-auto pointer-events-none select-none"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      <motion.img
        src={crateImg}
        alt=""
        width={80}
        height={80}
        className="w-20 h-20 select-none drop-shadow-2xl"
        animate={
          phase === "landed"
            ? { rotate: [-3, 3, -3, 3, -2, 2, 0], scale: [1, 1.05, 1] }
            : { rotate: [-2, 2, -2] }
        }
        transition={
          phase === "landed"
            ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }
      />

      {phase === "landed" && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl pointer-events-none"
          animate={{ scale: [0.8, 1.2, 0.8], rotate: [0, 15, -15, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          ✨
        </motion.div>
      )}
    </motion.button>
  );
}

interface LootBurstProps {
  loot: LootDrop;
  x: number;
  y: number;
  label: string;
  /** Localized rarity label, e.g. "Comune", "Raro" */
  tierLabel?: string;
  /** Localized close button label */
  closeLabel?: string;
  onDone: () => void;
  /** Milliseconds the close button stays disabled (anti-misclick). Defaults to 2000. */
  closeDelayMs?: number;
}

const TIER_STYLE: Record<LootTier, { gradient: string; ring: string; glow: string }> = {
  common: {
    gradient: "from-slate-300 to-slate-500",
    ring: "ring-slate-200",
    glow: "shadow-slate-400/50",
  },
  rare: {
    gradient: "from-sky-400 to-blue-600",
    ring: "ring-sky-200",
    glow: "shadow-sky-400/60",
  },
  epic: {
    gradient: "from-fuchsia-500 to-purple-700",
    ring: "ring-fuchsia-200",
    glow: "shadow-fuchsia-500/60",
  },
  legendary: {
    gradient: "from-amber-300 via-yellow-400 to-orange-500",
    ring: "ring-yellow-200",
    glow: "shadow-amber-400/70",
  },
};

/** Big celebratory popup shown when a crate is opened, revealing the prize + rarity. */
export function LootBurst({ loot, label, tierLabel, closeLabel, onDone, closeDelayMs = 1000 }: LootBurstProps) {
  const tier = loot.tier ?? "common";
  const style = TIER_STYLE[tier];
  const [remaining, setRemaining] = useState(closeDelayMs);
  // ⏸ La modale di airdrop / loot mette il gioco in pausa globale
  // (acquire al mount, release allo smontaggio).
  useEffect(() => {
    acquireExternalPause();
    return () => releaseExternalPause();
  }, []);
  useEffect(() => {
    setRemaining(closeDelayMs);
    const start = performance.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, closeDelayMs - (performance.now() - start));
      setRemaining(left);
      if (left <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [closeDelayMs]);
  const canClose = remaining <= 0;
  const seconds = Math.ceil(remaining / 1000);

  const icon =
    loot.kind === "coins"
      ? null
      : loot.kind === "magnet"
        ? "🧲"
        : loot.kind === "slowmo"
          ? "⏱️"
          : loot.kind === "skin"
            ? "🪣"
            : "✨";

  const headlineAmount =
    loot.kind === "skin" ? (loot.skinName ?? label) : `+${loot.amount} ${label}`;

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={() => { if (canClose) onDone(); }}
      />

      <motion.div
        className="relative flex flex-col items-center"
        initial={{ scale: 0.4, y: 30, opacity: 0 }}
        animate={{
          scale: [0.4, 1.15, 1],
          y: [30, -8, 0],
          opacity: [0, 1, 1],
        }}
        exit={{ scale: 0.9, opacity: 0, y: -20 }}
        transition={{ duration: 0.6, times: [0, 0.6, 1], ease: "easeOut" }}
      >
        {/* Burst rays */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className={`absolute h-1.5 w-24 rounded-full bg-gradient-to-r ${style.gradient}`}
              style={{ rotate: `${i * 30}deg`, transformOrigin: "center" }}
              initial={{ scaleX: 0, opacity: 1 }}
              animate={{ scaleX: 2, opacity: 0 }}
              transition={{ duration: 0.9, delay: 0.1 }}
            />
          ))}
        </div>

        {/* Tier badge */}
        {tierLabel && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`relative z-10 mb-2 rounded-full bg-gradient-to-r ${style.gradient} px-4 py-1 text-xs font-bold uppercase tracking-widest text-white shadow-lg ring-2 ${style.ring}`}
          >
            ✦ {tierLabel} ✦
          </motion.div>
        )}

        {/* Reward card */}
        <div
          className={`relative z-10 flex min-w-[240px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-br ${style.gradient} px-6 py-5 shadow-2xl ${style.glow} ring-4 ring-white/40`}
        >
          {icon ? (
            <span className="text-5xl drop-shadow-md">{icon}</span>
          ) : (
            <img src={coinImg} alt="" className="h-12 w-12 drop-shadow-md" width={48} height={48} />
          )}
          <span className="font-display text-2xl font-extrabold text-white drop-shadow-md whitespace-nowrap">
            {headlineAmount}
          </span>
        </div>

        {/* Close button — disabled for closeDelayMs to prevent misclicks */}
        <motion.button
          type="button"
          onClick={() => { if (canClose) onDone(); }}
          aria-disabled={!canClose}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={canClose ? { scale: 1.05 } : undefined}
          whileTap={canClose ? { scale: 0.95 } : undefined}
          className="relative z-10 mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-slate-900 shadow-xl ring-2 ring-white/60 transition"
        >
          <span>{closeLabel ?? "Close"}</span>
          {!canClose && (
            <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-black/20 px-1.5 text-xs font-bold tabular-nums text-slate-700">
              {seconds}
            </span>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
