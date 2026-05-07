import { useEffect, useRef, useState, useCallback } from "react";
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
  /** Called when the reaper's scythe slices a falling fruit (id). */
  onFruitDestroyed: (id: number) => void;
  /** Called when the reaper directly hits the bucket. */
  onReaperHit: () => void;
  /** Called when zombie hands grab the bucket → freeze for 2.5s. */
  onZombieGrab: () => void;
}

const LIGHT_RADIUS = 150;

interface ZombieHand { id: number; x: number; bornAt: number; }
interface EyeRay { id: number; x: number; bornAt: number; }
interface ReaperRun { id: number; startedAt: number; dive: boolean; diveX: number; }

export function ShadowCemeteryLayer({
  active, paused, fieldRef, bucketRef, bucketWidth,
  fruits, onFruitDestroyed, onReaperHit, onZombieGrab,
}: Props) {
  // Bucket position tracked via rAF for the spotlight mask
  const [bucketX, setBucketX] = useState(0);
  const [bucketY, setBucketY] = useState(0);
  const [bucketSpeed, setBucketSpeed] = useState(0);
  const lastXRef = useRef(0);
  const lastTRef = useRef(performance.now());
  // Light trail ghost positions
  const [trail, setTrail] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const trailIdRef = useRef(0);

  const [hands, setHands] = useState<ZombieHand[]>([]);
  const [rays, setRays] = useState<EyeRay[]>([]);
  const [reaper, setReaper] = useState<ReaperRun | null>(null);
  const reaperPosRef = useRef({ x: -200, y: 80 });
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
        const fieldRect = field.getBoundingClientRect();
        const cx = innerRect.left - fieldRect.left + innerRect.width / 2;
        const cy = innerRect.top - fieldRect.top + innerRect.height / 2;
        const now = performance.now();
        const dt = Math.max(1, now - lastTRef.current);
        const sp = Math.abs(cx - lastXRef.current) / dt; // px/ms
        lastXRef.current = cx;
        lastTRef.current = now;
        setBucketX(cx); setBucketY(cy); setBucketSpeed(sp);
        // Drop a trail ghost when moving fast
        if (sp > 0.6) {
          const id = trailIdRef.current++;
          setTrail((prev) => [...prev.slice(-4), { id, x: cx, y: cy }]);
          setTimeout(() => setTrail((p) => p.filter((t) => t.id !== id)), 320);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, fieldRef, bucketRef]);

  // Eye ray scheduler — every 15-20s
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
      // Aim near current bucket position with some lead/error
      const tx = Math.max(60, Math.min(w - 60, bucketX + (Math.random() - 0.5) * 120));
      const id = idRef.current++;
      sfx.click();
      setRays((p) => [...p, { id, x: tx, bornAt: performance.now() }]);
      // After ~0.6s the ray hits ground and spawns hands
      setTimeout(() => {
        setRays((p) => p.filter((r) => r.id !== id));
        const handId = idRef.current++;
        setHands((p) => [...p, { id: handId, x: tx, bornAt: performance.now() }]);
        sfx.splat();
        vibrate(20);
        setTimeout(() => {
          setHands((p) => p.filter((h) => h.id !== handId));
        }, 4000);
      }, 600);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [active, paused, bucketX, fieldRef]);

  // Hand collision check
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
          vibrate([30, 40, 30, 40, 30]);
          break;
        }
      }
    }, 120);
    return () => clearInterval(id);
  }, [active, hands, bucketX, bucketWidth, paused, onZombieGrab]);

  // Reaper scheduler — every 25-35s
  useEffect(() => {
    if (!active) return;
    let timer: number;
    const schedule = () => {
      const wait = 25000 + Math.random() * 10000;
      timer = window.setTimeout(() => {
        if (!paused) launch();
        schedule();
      }, wait);
    };
    const launch = () => {
      const id = idRef.current++;
      sfx.bell?.();
      setReaper({ id, startedAt: performance.now(), dive: false, diveX: 0 });
    };
    schedule();
    return () => clearTimeout(timer);
  }, [active, paused]);

  // Reaper animation + collision
  useEffect(() => {
    if (!reaper || !active) return;
    const field = fieldRef.current;
    if (!field) return;
    const w = field.getBoundingClientRect().width;
    const h = field.getBoundingClientRect().height;
    const duration = 7000; // ms across screen
    let raf = 0;
    let lastWhisper = 0;
    const tick = () => {
      if (paused) { raf = requestAnimationFrame(tick); return; }
      const t = (performance.now() - reaper.startedAt) / duration;
      if (t >= 1) { setReaper(null); return; }
      const x = -120 + (w + 240) * t;
      let y = 80 + Math.sin(t * Math.PI * 3) * 40;
      // Whisper occasionally
      if (performance.now() - lastWhisper > 1500) {
        sfx.click(); lastWhisper = performance.now();
      }
      // Dive check: when reaper passes bucket and bucket is OUTSIDE its light circle...
      // The "light center" is the bucket itself, so we treat "outside" as: bucket is moving fast
      // (light flickering = vulnerable) OR bucket is grabbed/locked.
      const overBucket = Math.abs(x - bucketX) < 60;
      const isVulnerable = bucketSpeed > 1.2 || performance.now() < grabbedUntilRef.current;
      if (overBucket && isVulnerable && !reaper.dive) {
        setReaper((r) => r ? { ...r, dive: true, diveX: bucketX } : r);
      }
      if (reaper.dive) {
        const dt = (performance.now() - reaper.startedAt) / duration;
        // Dive towards bucket
        y = 80 + (h - 160) * Math.min(1, (dt - (x + 120) / (w + 240) + 0.05) * 4);
      }
      reaperPosRef.current = { x, y };
      // Hit bucket?
      const innerRect = bucketRef.current?.getInnerRect();
      if (innerRect && reaper.dive) {
        const fr = field.getBoundingClientRect();
        const bx = innerRect.left - fr.left + innerRect.width / 2;
        const by = innerRect.top - fr.top + innerRect.height / 2;
        if (Math.hypot(reaperPosRef.current.x - bx, reaperPosRef.current.y - by) < 60) {
          onReaperHit();
          vibrate([40, 30, 60]);
          setReaper(null);
          return;
        }
      }
      // Slice falling fruits in scythe range
      for (const f of fruits) {
        if (f.status !== "falling") continue;
        const fcx = f.x + f.size / 2;
        // Approximate fruit y from animation progress is hard; just use scythe x range
        if (Math.abs(fcx - reaperPosRef.current.x) < 50) {
          onFruitDestroyed(f.id);
        }
      }
      // Force re-render via state nudge (we read reaperPosRef in render below)
      setReaperTick((n) => (n + 1) % 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reaper, active, paused, bucketX, bucketSpeed, fruits, onFruitDestroyed, onReaperHit, fieldRef, bucketRef]);

  const [, setReaperTick] = useState(0);

  if (!active) return null;

  const flicker = bucketSpeed > 1.0 ? 0.88 : 0.92;

  return (
    <>
      {/* Dark fog overlay with radial spotlight cut around the bucket */}
      <div
        className="pointer-events-none absolute inset-0 z-[18]"
        style={{
          background: "rgba(2,0,8,1)",
          opacity: flicker,
          WebkitMaskImage: `radial-gradient(circle ${LIGHT_RADIUS}px at ${bucketX}px ${bucketY}px, transparent 0%, rgba(0,0,0,0.4) 55%, black 100%)`,
          maskImage: `radial-gradient(circle ${LIGHT_RADIUS}px at ${bucketX}px ${bucketY}px, transparent 0%, rgba(0,0,0,0.4) 55%, black 100%)`,
          transition: "opacity 80ms linear",
        }}
      />
      {/* Warm lantern glow */}
      <div
        className="pointer-events-none absolute z-[19]"
        style={{
          left: bucketX - LIGHT_RADIUS,
          top: bucketY - LIGHT_RADIUS,
          width: LIGHT_RADIUS * 2,
          height: LIGHT_RADIUS * 2,
          background: "radial-gradient(circle, rgba(255,180,80,0.25) 0%, rgba(255,140,40,0.08) 50%, transparent 70%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Light trail ghosts */}
      {trail.map((g) => (
        <div
          key={g.id}
          className="pointer-events-none absolute z-[19] rounded-full"
          style={{
            left: g.x - 60, top: g.y - 60, width: 120, height: 120,
            background: "radial-gradient(circle, rgba(255,180,80,0.18), transparent 70%)",
            mixBlendMode: "screen",
            animation: "fadeOut 0.3s forwards",
          }}
        />
      ))}

      {/* Spectral Eye */}
      <SpectralEye bucketX={bucketX} fieldRef={fieldRef} />

      {/* Eye rays */}
      <AnimatePresence>
        {rays.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scaleY: 0.4 }}
            animate={{ opacity: [0, 1, 0.9, 0.6], scaleY: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute z-[22]"
            style={{
              left: r.x - 18,
              top: 110,
              width: 36,
              bottom: 0,
              background: "linear-gradient(to bottom, rgba(120,200,255,0.95), rgba(60,140,255,0.7) 50%, rgba(80,180,255,0.4))",
              boxShadow: "0 0 30px rgba(120,200,255,0.9), inset 0 0 20px rgba(180,230,255,0.7)",
              filter: "blur(0.5px)",
              transformOrigin: "top",
            }}
          />
        ))}
      </AnimatePresence>

      {/* Zombie hands */}
      <AnimatePresence>
        {hands.map((h) => (
          <motion.div
            key={h.id}
            initial={{ y: 40, opacity: 0, scale: 0.6 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="pointer-events-none absolute z-[26]"
            style={{ left: h.x - 38, bottom: 18, width: 76, height: 90 }}
          >
            <ZombieHandSvg />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Flying Reaper */}
      {reaper && (
        <div
          className="pointer-events-none absolute z-[28]"
          style={{
            left: reaperPosRef.current.x - 70,
            top: reaperPosRef.current.y - 50,
            width: 140,
            height: 100,
            transform: reaper.dive ? "rotate(15deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <FlyingReaperSvg />
        </div>
      )}
      <style>{`
        @keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } }
      `}</style>
    </>
  );
}

function SpectralEye({ bucketX, fieldRef }: { bucketX: number; fieldRef: React.RefObject<HTMLDivElement | null> }) {
  const [centerX, setCenterX] = useState(200);
  useEffect(() => {
    const f = fieldRef.current;
    if (!f) return;
    setCenterX(f.getBoundingClientRect().width / 2);
  }, [fieldRef]);
  // Pupil tracks bucket
  const dx = Math.max(-12, Math.min(12, (bucketX - centerX) / 20));
  return (
    <div
      className="pointer-events-none absolute z-[20]"
      style={{ left: centerX - 55, top: 30, width: 110, height: 70 }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: "100%", height: "100%" }}
      >
        <svg viewBox="0 0 110 70" width="110" height="70">
          <defs>
            <radialGradient id="eyeGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="40%" stopColor="#a0e0ff" />
              <stop offset="100%" stopColor="#1a3050" />
            </radialGradient>
          </defs>
          <ellipse cx="55" cy="35" rx="50" ry="28" fill="#0a0814" stroke="#5a3a90" strokeWidth="2" />
          <ellipse cx="55" cy="35" rx="38" ry="22" fill="url(#eyeGlow)" />
          <circle cx={55 + dx} cy="35" r="10" fill="#000" />
          <circle cx={55 + dx - 3} cy="32" r="3" fill="#fff" opacity="0.8" />
          {/* Glow */}
          <ellipse cx="55" cy="35" rx="55" ry="32" fill="none" stroke="rgba(140,200,255,0.5)" strokeWidth="1" filter="blur(4px)" />
        </svg>
      </motion.div>
    </div>
  );
}

function ZombieHandSvg() {
  return (
    <svg viewBox="0 0 76 90" width="76" height="90">
      <defs>
        <linearGradient id="zhSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a8a6a" />
          <stop offset="100%" stopColor="#3a4030" />
        </linearGradient>
      </defs>
      {/* Wrist */}
      <rect x="28" y="60" width="20" height="30" fill="url(#zhSkin)" stroke="#1a1a1a" strokeWidth="1.5" />
      {/* Palm */}
      <path d="M20 48 Q16 38 24 32 L52 32 Q60 38 56 48 L52 64 L24 64 Z" fill="url(#zhSkin)" stroke="#1a1a1a" strokeWidth="1.5" />
      {/* Fingers */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={22 + i * 9} y="14" width="6" height="22" rx="2" fill="url(#zhSkin)" stroke="#1a1a1a" strokeWidth="1.2" />
      ))}
      {/* Thumb */}
      <rect x="14" y="36" width="8" height="14" rx="2" fill="url(#zhSkin)" stroke="#1a1a1a" strokeWidth="1.2" transform="rotate(-30 18 43)" />
      {/* Cracks / blood */}
      <path d="M30 40 L34 50 M44 40 L42 52" stroke="#5a1010" strokeWidth="1" fill="none" />
    </svg>
  );
}

function FlyingReaperSvg() {
  return (
    <svg viewBox="0 0 140 100" width="140" height="100">
      <defs>
        <linearGradient id="scytheGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a0e0ff" />
          <stop offset="100%" stopColor="#4080ff" />
        </linearGradient>
      </defs>
      {/* Body shadow */}
      <ellipse cx="55" cy="55" rx="45" ry="22" fill="#000" opacity="0.85" />
      {/* Wings smoke */}
      <path d="M10 50 Q30 30 55 45 Q30 55 10 50 Z" fill="#000" opacity="0.7" />
      <path d="M100 50 Q80 30 55 45 Q80 55 100 50 Z" fill="#000" opacity="0.7" />
      {/* Hood point */}
      <path d="M40 40 Q55 20 70 40" fill="#000" opacity="0.95" />
      {/* Glowing eyes */}
      <circle cx="48" cy="50" r="3.5" fill="#5fb8ff" filter="blur(0.5px)" />
      <circle cx="62" cy="50" r="3.5" fill="#5fb8ff" filter="blur(0.5px)" />
      <circle cx="48" cy="50" r="6" fill="#5fb8ff" opacity="0.4" />
      <circle cx="62" cy="50" r="6" fill="#5fb8ff" opacity="0.4" />
      {/* Scythe shaft */}
      <line x1="80" y1="55" x2="125" y2="95" stroke="#1a1408" strokeWidth="3" />
      {/* Scythe blade — glowing */}
      <path d="M125 95 Q138 80 130 60 Q120 75 110 70 Q118 88 125 95 Z" fill="url(#scytheGlow)" stroke="#fff" strokeWidth="1.2" />
      <path d="M125 95 Q138 80 130 60" stroke="#fff" strokeWidth="2" fill="none" filter="blur(2px)" opacity="0.9" />
    </svg>
  );
}
