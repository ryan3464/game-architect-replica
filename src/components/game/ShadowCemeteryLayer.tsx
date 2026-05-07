import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BucketHandle } from "@/components/game/Bucket";
import type { FruitState } from "@/components/game/FallingFruit";
import { sfx } from "@/lib/sfx";
import { vibrate } from "@/lib/haptics";

interface Props {
  active: boolean;
  paused: boolean;
  fieldRef: React.RefObject<HTMLDivElement | null>;
  bucketRef: React.RefObject<BucketHandle | null>;
  bucketWidth: number;
  fruits: FruitState[];
  onFruitDestroyed: (id: number) => void;
  onReaperHit: () => void;
  onZombieGrab: () => void;
}

const LIGHT_RADIUS = 200;

interface ZombieHand { id: number; x: number; bornAt: number; }
interface EyeRay { id: number; x: number; bornAt: number; }
interface ReaperRun { id: number; startedAt: number; dive: boolean; }

export function ShadowCemeteryLayer({
  active, paused, fieldRef, bucketRef, bucketWidth,
  fruits, onFruitDestroyed, onReaperHit, onZombieGrab,
}: Props) {
  const [bucketX, setBucketX] = useState(0);
  const [bucketY, setBucketY] = useState(0);
  const bucketSpeedRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTRef = useRef(performance.now());

  const [hands, setHands] = useState<ZombieHand[]>([]);
  const [rays, setRays] = useState<EyeRay[]>([]);
  const [reaper, setReaper] = useState<ReaperRun | null>(null);
  const [reaperPos, setReaperPos] = useState({ x: -200, y: 80 });
  const idRef = useRef(1);
  const grabbedUntilRef = useRef(0);

  // rAF: track bucket center
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      const field = fieldRef.current;
      const innerRect = bucketRef.current?.getInnerRect();
      if (field && innerRect) {
        const fr = field.getBoundingClientRect();
        const cx = innerRect.left - fr.left + innerRect.width / 2;
        const cy = innerRect.top - fr.top + innerRect.height / 2;
        const now = performance.now();
        const dt = Math.max(1, now - lastTRef.current);
        bucketSpeedRef.current = Math.abs(cx - lastXRef.current) / dt;
        lastXRef.current = cx;
        lastTRef.current = now;
        setBucketX(cx);
        setBucketY(cy);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, fieldRef, bucketRef]);

  // Eye ray scheduler
  useEffect(() => {
    if (!active) return;
    let timer: number;
    const schedule = () => {
      const wait = 15000 + Math.random() * 5000;
      timer = window.setTimeout(() => {
        if (!paused) fireRay();
        schedule();
      }, wait);
    };
    const fireRay = () => {
      const field = fieldRef.current;
      if (!field) return;
      const w = field.getBoundingClientRect().width;
      const tx = Math.max(60, Math.min(w - 60, bucketX + (Math.random() - 0.5) * 120));
      const id = idRef.current++;
      sfx.hiss();
      setRays((p) => [...p, { id, x: tx, bornAt: performance.now() }]);
      setTimeout(() => {
        setRays((p) => p.filter((r) => r.id !== id));
        const handId = idRef.current++;
        setHands((p) => [...p, { id: handId, x: tx, bornAt: performance.now() }]);
        vibrate(20);
        setTimeout(() => {
          setHands((p) => p.filter((h) => h.id !== handId));
        }, 4000);
      }, 700);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [active, paused, bucketX, fieldRef]);

  // Hand collision
  useEffect(() => {
    if (!active || hands.length === 0) return;
    const id = window.setInterval(() => {
      if (paused) return;
      const now = performance.now();
      if (now < grabbedUntilRef.current) return;
      for (const h of hands) {
        if (Math.abs(h.x - bucketX) < bucketWidth * 0.55) {
          grabbedUntilRef.current = now + 2600;
          onZombieGrab();
          vibrate([30, 40, 30]);
          break;
        }
      }
    }, 120);
    return () => clearInterval(id);
  }, [active, hands, bucketX, bucketWidth, paused, onZombieGrab]);

  // Reaper scheduler
  useEffect(() => {
    if (!active) return;
    let timer: number;
    const schedule = () => {
      const wait = 25000 + Math.random() * 10000;
      timer = window.setTimeout(() => {
        if (!paused) {
          sfx.bell();
          setReaper({ id: idRef.current++, startedAt: performance.now(), dive: false });
        }
        schedule();
      }, wait);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [active, paused]);

  // Reaper animation
  useEffect(() => {
    if (!reaper || !active) return;
    const field = fieldRef.current;
    if (!field) return;
    const fr0 = field.getBoundingClientRect();
    const w = fr0.width;
    const h = fr0.height;
    const duration = 7000;
    let raf = 0;
    const tick = () => {
      if (paused) { raf = requestAnimationFrame(tick); return; }
      const t = (performance.now() - reaper.startedAt) / duration;
      if (t >= 1) { setReaper(null); return; }
      const x = -120 + (w + 240) * t;
      let y = 80 + Math.sin(t * Math.PI * 3) * 40;

      const overBucket = Math.abs(x - bucketX) < 70;
      const isVulnerable = bucketSpeedRef.current > 1.2 || performance.now() < grabbedUntilRef.current;
      if (overBucket && isVulnerable && !reaper.dive) {
        setReaper((r) => r ? { ...r, dive: true } : r);
      }
      if (reaper.dive) {
        const since = (performance.now() - reaper.startedAt) / duration;
        y = 80 + (h - 160) * Math.min(1, Math.max(0, (since - (x + 120) / (w + 240) + 0.05) * 4));
      }
      setReaperPos({ x, y });

      const innerRect = bucketRef.current?.getInnerRect();
      if (innerRect && reaper.dive) {
        const fr = field.getBoundingClientRect();
        const bx = innerRect.left - fr.left + innerRect.width / 2;
        const by = innerRect.top - fr.top + innerRect.height / 2;
        if (Math.hypot(x - bx, y - by) < 60) {
          onReaperHit();
          vibrate([40, 30, 60]);
          setReaper(null);
          return;
        }
      }
      for (const f of fruits) {
        if (f.status !== "falling") continue;
        const fcx = f.x + f.size / 2;
        if (Math.abs(fcx - x) < 50) onFruitDestroyed(f.id);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reaper, active, paused, bucketX, fruits, onFruitDestroyed, onReaperHit, fieldRef, bucketRef]);

  if (!active) return null;

  return (
    <>
      {/* Pure black flashlight overlay — radial mask centered on bucket */}
      <div
        className="pointer-events-none absolute inset-0 z-[18]"
        style={{
          background: "#000000",
          WebkitMaskImage: `radial-gradient(circle ${LIGHT_RADIUS}px at ${bucketX}px ${bucketY}px, transparent 0%, rgba(0,0,0,0.5) 70%, black 100%)`,
          maskImage: `radial-gradient(circle ${LIGHT_RADIUS}px at ${bucketX}px ${bucketY}px, transparent 0%, rgba(0,0,0,0.5) 70%, black 100%)`,
        }}
      />
      {/* Subtle warm halo from the lantern */}
      <div
        className="pointer-events-none absolute z-[19]"
        style={{
          left: bucketX - LIGHT_RADIUS,
          top: bucketY - LIGHT_RADIUS,
          width: LIGHT_RADIUS * 2,
          height: LIGHT_RADIUS * 2,
          background: "radial-gradient(circle, rgba(255,170,70,0.18) 0%, rgba(255,120,30,0.06) 50%, transparent 75%)",
          mixBlendMode: "screen",
        }}
      />

      {/* Object-cast light: each falling fruit emits a small glow */}
      {fruits.filter(f => f.status === "falling").map((f) => (
        <FruitGlow key={`g-${f.id}`} fruit={f} />
      ))}

      {/* Spectral Eye */}
      <SpectralEye bucketX={bucketX} fieldRef={fieldRef} />

      {/* Eye rays */}
      <AnimatePresence>
        {rays.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute z-[22] overflow-hidden"
            style={{
              left: r.x - 22,
              top: 100,
              width: 44,
              bottom: 0,
              background: "linear-gradient(to bottom, rgba(170,230,255,0.55), rgba(80,160,255,0.35) 60%, rgba(120,200,255,0.2))",
              boxShadow: "0 0 28px rgba(120,200,255,0.55)",
              filter: "blur(0.5px)",
            }}
          >
            {/* Particle stream */}
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  left: 8 + (i * 2.7) % 28,
                  width: 2 + (i % 3),
                  height: 2 + (i % 3),
                  top: -10,
                  opacity: 0.85,
                  animation: `rayDrop 0.7s linear ${(i * 0.05) % 0.7}s infinite`,
                }}
              />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Zombie hands — neon green, grow from below */}
      <AnimatePresence>
        {hands.map((h) => (
          <div
            key={h.id}
            className="pointer-events-none absolute z-[26]"
            style={{
              left: h.x - 38,
              bottom: 18,
              width: 76,
              height: 100,
              transformOrigin: "bottom center",
              animation: "handGrow 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            <ZombieHandSvg />
          </div>
        ))}
      </AnimatePresence>

      {/* Flying Reaper — fluid shadow */}
      {reaper && (
        <div
          className="pointer-events-none absolute z-[28]"
          style={{
            left: reaperPos.x - 80,
            top: reaperPos.y - 50,
            width: 160,
            height: 100,
            transform: reaper.dive ? "rotate(15deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <FlyingReaperSvg />
        </div>
      )}

      <style>{`
        @keyframes rayDrop {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes handGrow {
          0% { transform: scaleY(0) translateY(20px); opacity: 0; }
          60% { opacity: 1; }
          100% { transform: scaleY(1) translateY(0); opacity: 1; }
        }
        @keyframes eyePulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(140,200,255,0.6)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 18px rgba(140,200,255,0.95)); }
        }
        @keyframes reaperFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}

function FruitGlow({ fruit }: { fruit: FruitState }) {
  // Mounted as a sibling glow; uses same x and CSS transform animation matching fall.
  // We keep it simple: place at fruit.x with a soft radial that follows via CSS animation.
  return (
    <div
      className="pointer-events-none absolute z-[20]"
      style={{
        left: fruit.x + fruit.size / 2 - 60,
        top: 0,
        width: 120,
        height: 120,
        background: "radial-gradient(circle, rgba(255,180,90,0.35), transparent 70%)",
        mixBlendMode: "screen",
        animation: `fruitFall ${fruit.duration}s linear forwards`,
      }}
    >
      <style>{`
        @keyframes fruitFall {
          from { transform: translateY(0); }
          to { transform: translateY(100vh); }
        }
      `}</style>
    </div>
  );
}

function SpectralEye({ bucketX, fieldRef }: { bucketX: number; fieldRef: React.RefObject<HTMLDivElement | null> }) {
  const [centerX, setCenterX] = useState(200);
  useEffect(() => {
    const f = fieldRef.current;
    if (!f) return;
    setCenterX(f.getBoundingClientRect().width / 2);
  }, [fieldRef]);
  const dx = Math.max(-12, Math.min(12, (bucketX - centerX) / 20));
  return (
    <div
      className="pointer-events-none absolute z-[20]"
      style={{
        left: centerX - 60,
        top: 28,
        width: 120,
        height: 76,
        animation: "eyePulse 2s ease-in-out infinite",
      }}
    >
      <svg viewBox="0 0 120 76" width="120" height="76">
        <defs>
          <radialGradient id="eyeGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="40%" stopColor="#a0e0ff" />
            <stop offset="100%" stopColor="#1a3050" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="38" rx="55" ry="30" fill="#0a0814" stroke="#5a3a90" strokeWidth="2" />
        <ellipse cx="60" cy="38" rx="42" ry="24" fill="url(#eyeGlow)" />
        <circle cx={60 + dx} cy="38" r="11" fill="#000" />
        <circle cx={60 + dx - 3} cy="35" r="3" fill="#fff" opacity="0.85" />
      </svg>
    </div>
  );
}

function FlyingReaperSvg() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        animation: "reaperFloat 2.4s ease-in-out infinite",
      }}
    >
      <svg viewBox="0 0 160 100" width="160" height="100" style={{ overflow: "visible" }}>
        {/* Fluid shadow body — heavy blur, low opacity */}
        <g style={{ filter: "blur(4px)", opacity: 0.7 }}>
          <ellipse cx="65" cy="55" rx="55" ry="26" fill="#000" />
          <path d="M10 50 Q35 28 65 45 Q35 60 10 50 Z" fill="#000" />
          <path d="M120 50 Q90 28 65 45 Q90 60 120 50 Z" fill="#000" />
          <path d="M45 38 Q65 12 85 38 Z" fill="#000" />
        </g>
        {/* Glowing eyes — only these are sharp */}
        <g style={{ filter: "drop-shadow(0 0 10px #00f0ff)" }}>
          <circle cx="55" cy="50" r="3.5" fill="#bff7ff" />
          <circle cx="72" cy="50" r="3.5" fill="#bff7ff" />
        </g>
        {/* Scythe shaft — faint */}
        <line x1="92" y1="55" x2="140" y2="95" stroke="#0a0a0a" strokeWidth="2" opacity="0.55" style={{ filter: "blur(2px)" }} />
        {/* Scythe blade — sharp + neon glow */}
        <g style={{ filter: "drop-shadow(0 0 10px #00f0ff)" }}>
          <path d="M140 95 Q154 78 144 58 Q132 76 122 70 Q132 90 140 95 Z" fill="#dff8ff" stroke="#fff" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function ZombieHandSvg() {
  return (
    <svg viewBox="0 0 76 100" width="76" height="100" style={{ filter: "drop-shadow(0 0 6px rgba(120,255,80,0.65))" }}>
      <defs>
        <linearGradient id="zhSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#aaff44" />
          <stop offset="100%" stopColor="#3a7a18" />
        </linearGradient>
      </defs>
      <rect x="28" y="68" width="20" height="32" fill="url(#zhSkin)" stroke="#0a1a05" strokeWidth="1.5" />
      <path d="M20 54 Q16 44 24 38 L52 38 Q60 44 56 54 L52 70 L24 70 Z" fill="url(#zhSkin)" stroke="#0a1a05" strokeWidth="1.5" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={22 + i * 9} y="18" width="6" height="24" rx="2" fill="url(#zhSkin)" stroke="#0a1a05" strokeWidth="1.2" />
      ))}
      <rect x="14" y="40" width="8" height="14" rx="2" fill="url(#zhSkin)" stroke="#0a1a05" strokeWidth="1.2" transform="rotate(-30 18 47)" />
      <path d="M30 46 L34 56 M44 46 L42 58" stroke="#1a3a05" strokeWidth="1" fill="none" />
    </svg>
  );
}
