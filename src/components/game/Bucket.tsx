import { motion, useMotionValue, animate, useAnimation } from "framer-motion";
import { useEffect, useImperativeHandle, forwardRef, useRef } from "react";
import bucketImg from "@/assets/bucket-modern.png";
import bucketLargeImg from "@/assets/bucket-large.png";
import type { BucketId, BucketSkinId } from "@/lib/game-state";

export interface BucketHandle {
  getRect: () => DOMRect | null;
  getInnerRect: () => DOMRect | null;
  getX: () => number;
  setX: (val: number) => void;
  /** Squash & stretch bounce when something lands inside */
  squash: () => void;
}

export interface BucketFruit {
  id: number;
  img: string;
  x: number;
  rot: number;
  /** monotonic counter so we can animate latest entry */
  bornAt: number;
}

interface BucketProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  fruits: BucketFruit[];
  width?: number;
  bucketId?: BucketId;
  skin?: BucketSkinId;
  /** When true, the bucket is frozen → moves slower and shows a white snowball aura. */
  frozen?: boolean;
  /** When true, the bucket is fully locked in place (ice-cube encased). */
  locked?: boolean;
  /** When true, the bucket is electrically stunned — cannot move but no ice visual. */
  stunned?: boolean;
  /** When true, render a magical shield bubble around the bucket. */
  shielded?: boolean;
  /** Pulses to N when set — triggers shield-break animation. */
  shieldBreakKey?: number;
  /** Solid floor obstacles the bucket cannot cross. Each {x,w} is in field-local px. */
  obstacles?: Array<{ x: number; w: number }>;
  /** While `locked` is true, drives the visible cracking progress (0 = pristine, 1 = almost broken). */
  iceBreakProgress?: number;
  /** When true, the bucket is electrically stunned (stormpeak lightning). Shows sparks. */
  electricStun?: boolean;
}

const BUCKET_IMG: Record<BucketId, string> = {
  wooden: bucketImg,
  large: bucketLargeImg,
};

/** CSS filter applied to the wooden bucket image to recolor it for each skin. */
export const SKIN_FILTERS: Record<BucketSkinId, string> = {
  default: "",
  // Pure, saturated gold with strong warm glow.
  gold: "sepia(1) hue-rotate(-18deg) saturate(4.2) brightness(1.25) contrast(1.1) drop-shadow(0 0 12px rgba(255,200,40,0.95)) drop-shadow(0 0 24px rgba(255,170,20,0.6))",
  // Custom-shape skins don't use the wooden image, but we keep an entry
  // for the shop preview tile (rendered via <SkinPreview/>).
  cart: "",
  teacup: "",
  ghost: "",
};

/** Skins that render as a custom SVG shape instead of the wooden bucket image. */
const CUSTOM_SHAPE_SKINS: BucketSkinId[] = ["cart", "teacup", "ghost"];

/** Burst of glass shards when the shield breaks — no emoji, pure SVG. */
function ShieldBreakBurst() {
  // 8 shards radiating outward
  const shards = Array.from({ length: 8 }, (_, i) => i);
  return (
    <motion.div
      className="pointer-events-none absolute z-[36]"
      style={{ left: "-22%", right: "-22%", top: "-30%", bottom: "-12%" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      {/* shockwave ring */}
      <motion.div
        className="absolute inset-0"
        style={{
          borderRadius: "9999px",
          border: "3px solid rgba(180,220,255,0.9)",
          boxShadow: "0 0 30px rgba(140,200,255,0.85)",
        }}
        initial={{ scale: 0.6, opacity: 0.9 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      />
      {shards.map((i) => {
        const angle = (i / shards.length) * Math.PI * 2;
        const dx = Math.cos(angle) * 90;
        const dy = Math.sin(angle) * 90;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{
              width: 14,
              height: 6,
              marginLeft: -7,
              marginTop: -3,
              background:
                "linear-gradient(90deg, rgba(220,240,255,0.95), rgba(140,200,255,0.6))",
              borderRadius: 2,
              boxShadow: "0 0 6px rgba(180,220,255,0.9)",
              transform: `rotate(${(angle * 180) / Math.PI}deg)`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: dx, y: dy, opacity: 0, scale: 0.6, rotate: (angle * 180) / Math.PI + 60 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
          />
        );
      })}
    </motion.div>
  );
}

/** Renders a custom container shape for a non-default skin. */
export function SkinShape({ skin, width = 140 }: { skin: BucketSkinId; width?: number }) {
  const h = width; // square viewport
  if (skin === "cart") {
    return (
      <svg viewBox="0 0 120 120" width={width} height={h} className="drop-shadow-2xl">
        <defs>
          <linearGradient id="cartBody2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5b5b" />
            <stop offset="100%" stopColor="#c0392b" />
          </linearGradient>
          <radialGradient id="cartWheel2" cx="0.35" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="#666" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </radialGradient>
        </defs>
        {/* push handle */}
        <path d="M14 28 L8 28 L8 14 L26 14" fill="none" stroke="#b0b6bf" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {/* basket body — solid red, clean shape */}
        <path
          d="M22 34 L102 34 L94 84 L30 84 Z"
          fill="url(#cartBody2)"
          stroke="#7a1f1a"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* top rim */}
        <rect x="20" y="32" width="84" height="5" rx="2" fill="#7a1f1a" />
        {/* front grid lines (subtle) */}
        {[42, 52, 62, 72].map((y) => (
          <line key={y} x1="26" y1={y} x2="98" y2={y} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
        ))}
        {[40, 56, 72, 88].map((x) => (
          <line key={x} x1={x} y1="38" x2={x - 2} y2="82" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
        ))}
        {/* axles */}
        <line x1="32" y1="84" x2="30" y2="100" stroke="#3b434d" strokeWidth="3" strokeLinecap="round" />
        <line x1="92" y1="84" x2="94" y2="100" stroke="#3b434d" strokeWidth="3" strokeLinecap="round" />
        {/* wheels */}
        <circle cx="30" cy="104" r="9" fill="url(#cartWheel2)" stroke="#000" strokeWidth="1.5" />
        <circle cx="30" cy="104" r="3" fill="#cfd6df" />
        <circle cx="94" cy="104" r="9" fill="url(#cartWheel2)" stroke="#000" strokeWidth="1.5" />
        <circle cx="94" cy="104" r="3" fill="#cfd6df" />
        {/* highlight stripe */}
        <path d="M28 42 L96 42" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (skin === "teacup") {
    return (
      <svg viewBox="0 0 120 120" width={width} height={h} className="drop-shadow-2xl">
        <defs>
          <linearGradient id="teaPorcelain" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff8f0" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e8d8c5" />
          </linearGradient>
          <linearGradient id="teaSaucerG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d4c0a8" />
          </linearGradient>
          <radialGradient id="teaInside" cx="0.5" cy="0.2" r="0.7">
            <stop offset="0%" stopColor="#a26535" />
            <stop offset="100%" stopColor="#5a3318" />
          </radialGradient>
        </defs>
        {/* curly elegant handle */}
        <path
          d="M92 52 C 116 50, 118 96, 88 90"
          fill="none"
          stroke="#c9a96a"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M93 58 C 108 58, 108 84, 90 82"
          fill="none"
          stroke="#fff7e0"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* cup body */}
        <path
          d="M14 42 Q14 38 18 38 L92 38 Q96 38 96 42 L86 94 Q50 102 24 94 Z"
          fill="url(#teaPorcelain)"
          stroke="#b89668"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* tea liquid (top-down view through the rim) */}
        <ellipse cx="55" cy="42" rx="40" ry="6.5" fill="url(#teaInside)" />
        <ellipse cx="55" cy="40" rx="40" ry="6" fill="none" stroke="#7a4422" strokeWidth="1.2" />
        {/* steam wisps */}
        <path d="M40 24 q 4 -8 0 -14 q -4 -6 0 -12" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" />
        <path d="M55 22 q 4 -8 0 -14 q -4 -6 0 -12" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" />
        <path d="M70 24 q 4 -8 0 -14 q -4 -6 0 -12" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" />
        {/* gold rim band */}
        <rect x="16" y="50" width="78" height="3.5" fill="#d4af5a" />
        {/* floral motif */}
        <g fill="#d4af5a" opacity="0.85">
          <circle cx="32" cy="64" r="2.6" />
          <circle cx="28" cy="68" r="1.6" />
          <circle cx="36" cy="68" r="1.6" />
          <circle cx="32" cy="72" r="1.6" />
          <circle cx="78" cy="64" r="2.6" />
          <circle cx="74" cy="68" r="1.6" />
          <circle cx="82" cy="68" r="1.6" />
          <circle cx="78" cy="72" r="1.6" />
        </g>
        <path d="M44 70 q 11 6 22 0" fill="none" stroke="#d4af5a" strokeWidth="1.4" />
        {/* highlight on cup */}
        <path
          d="M22 60 Q26 80 28 92"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* saucer */}
        <ellipse cx="55" cy="100" rx="54" ry="7.5" fill="url(#teaSaucerG)" stroke="#b89668" strokeWidth="2" />
        <ellipse cx="55" cy="97" rx="46" ry="3.5" fill="none" stroke="#d4af5a" strokeWidth="1.2" />
      </svg>
    );
  }
  if (skin === "ghost") {
    // Ghost = a real, fully transparent floating bucket.
    // Same proportions as a normal bucket, glassy/ethereal look, no face.
    return (
      <svg viewBox="0 0 120 120" width={width} height={h} className="drop-shadow-xl">
        <defs>
          <linearGradient id="ghostGlass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(220,240,255,0.45)" />
            <stop offset="50%" stopColor="rgba(180,220,250,0.25)" />
            <stop offset="100%" stopColor="rgba(140,200,240,0.45)" />
          </linearGradient>
        </defs>
        {/* handle */}
        <path
          d="M30 34 Q60 12 90 34"
          fill="none"
          stroke="rgba(220,240,255,0.85)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* bucket body — transparent trapezoid */}
        <path
          d="M20 40 L100 40 L90 100 L30 100 Z"
          fill="url(#ghostGlass)"
          stroke="rgba(220,240,255,0.9)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* top rim ellipse */}
        <ellipse cx="60" cy="40" rx="40" ry="6" fill="rgba(255,255,255,0.18)" stroke="rgba(220,240,255,0.9)" strokeWidth="2" />
        {/* bottom rim ellipse */}
        <ellipse cx="60" cy="100" rx="30" ry="4" fill="none" stroke="rgba(220,240,255,0.7)" strokeWidth="2" />
        {/* soft side reflections */}
        <path d="M28 46 L36 96" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
        <path d="M92 46 L84 96" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}

export const Bucket = forwardRef<BucketHandle, BucketProps>(function Bucket(
  { containerRef, fruits, width = 140, bucketId = "wooden", skin = "default", frozen = false, locked = false, stunned = false, shielded = false, shieldBreakKey = 0, obstacles = [], iceBreakProgress = 0, electricStun = false },
  ref,
) {
  const x = useMotionValue(0);
  const elRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const squashControls = useAnimation();
  // Read latest `frozen` inside event handlers without re-binding listeners.
  const frozenRef = useRef(frozen);
  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);
  const lockedRef = useRef(locked || stunned);
  useEffect(() => { lockedRef.current = locked || stunned; }, [locked, stunned]);
  const obstaclesRef = useRef(obstacles);
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);

  useEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.offsetWidth;
    x.set(w / 2 - width / 2);
  }, [containerRef, x, width]);

  // When obstacles change (a new obsidian just landed), if the bucket is
  // overlapping any of them, shove it out to the nearest free side so it
  // can never end up inside an obstacle.
  useEffect(() => {
    if (!containerRef.current) return;
    if (obstacles.length === 0) return;
    const containerW = containerRef.current.offsetWidth;
    const max = containerW - width;
    let pos = x.get();
    for (const ob of obstacles) {
      const overlap = pos > ob.x - width && pos < ob.x + ob.w;
      if (overlap) {
        const leftSide = ob.x - width;          // bucket pos that just touches ob's left edge
        const rightSide = ob.x + ob.w;          // bucket pos that just touches ob's right edge
        // Pick the closer free side, but stay inside the field. If one side is
        // off-field, force the other.
        const distLeft = leftSide < 0 ? Infinity : pos - leftSide;
        const distRight = rightSide > max ? Infinity : rightSide - pos;
        if (distLeft <= distRight) pos = Math.max(0, leftSide);
        else pos = Math.min(max, rightSide);
      }
    }
    if (pos !== x.get()) {
      animate(x, pos, { type: "tween", duration: 0.18, ease: "easeOut" });
    }
  }, [obstacles, x, width, containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // True when an active touch drag is in progress (finger started near the bucket).
    let touchDragging = false;

    const move = (clientX: number) => {
      if (lockedRef.current) return;
      const rect = container.getBoundingClientRect();
      const local = clientX - rect.left - width / 2;
      const max = rect.width - width;
      let target = Math.max(0, Math.min(max, local));
      const current = x.get();
      const obs = obstaclesRef.current;
      const movingRight = target > current;
      for (const ob of obs) {
        const left = ob.x - width;
        const right = ob.x + ob.w;
        const currentlyOverlap = current > left && current < right;
        if (currentlyOverlap) {
          const obCenter = ob.x + ob.w / 2;
          const bucketCenter = current + width / 2;
          const escapeRight = bucketCenter >= obCenter;
          if (escapeRight) {
            target = Math.max(target, current);
          } else {
            target = Math.min(target, current);
          }
          continue;
        }
        if (movingRight) {
          if (left >= current && left < target) {
            target = Math.max(0, left);
          }
        } else if (target < current) {
          if (right <= current && right > target) {
            target = Math.min(max, right);
          }
        }
      }
      const isFrozen = frozenRef.current;
      animate(x, target, {
        type: isFrozen ? "spring" : "tween",
        duration: isFrozen ? undefined : 0.08,
        ease: "linear",
        stiffness: isFrozen ? 90 : undefined,
        damping: isFrozen ? 28 : undefined,
        mass: isFrozen ? 1.6 : undefined,
      });
    };

    // Desktop: mouse always tracks (hover-to-move).
    const onMouse = (e: MouseEvent) => move(e.clientX);

    // Mobile: only move when the touch starts on/near the bucket. This prevents
    // taps on the tree from yanking the bucket across the screen.
    const isNearBucket = (clientX: number) => {
      const rect = container.getBoundingClientRect();
      const bucketLeft = rect.left + x.get();
      const bucketRight = bucketLeft + width;
      const slack = width * 0.6; // a bit of forgiveness around the bucket
      return clientX >= bucketLeft - slack && clientX <= bucketRight + slack;
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      touchDragging = isNearBucket(t.clientX);
      if (touchDragging) move(t.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchDragging) return;
      const t = e.touches[0];
      if (t) move(t.clientX);
    };
    const onTouchEnd = () => {
      touchDragging = false;
    };

    container.addEventListener("mousemove", onMouse);
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener("touchcancel", onTouchEnd);
    return () => {
      container.removeEventListener("mousemove", onMouse);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [containerRef, x, width]);

  useImperativeHandle(ref, () => ({
    getRect: () => elRef.current?.getBoundingClientRect() ?? null,
    getInnerRect: () => innerRef.current?.getBoundingClientRect() ?? null,
    getX: () => x.get(),
    setX: (val: number) => x.set(val),
    squash: () => {
      // Squash & stretch: compress vertically, widen, then bounce back
      squashControls.start({
        scaleX: [1, 1.12, 0.96, 1.04, 1],
        scaleY: [1, 0.82, 1.06, 0.98, 1],
        transition: { duration: 0.45, ease: "easeOut", times: [0, 0.25, 0.55, 0.8, 1] },
      });
    },
  }));

  const MAX_VISIBLE = 18;
  const shown = fruits.slice(-MAX_VISIBLE);
  const lastBornAt = shown.length > 0 ? shown[shown.length - 1].bornAt : 0;

  return (
    <motion.div
      ref={(el) => {
        elRef.current = el;
      }}
      style={{ x, width }}
      className="pointer-events-none absolute bottom-[2%] left-0 z-20 select-none"
    >
      <div className="relative" style={{ width }}>
        {/* Frozen snowball aura — wraps the bucket while frozen.
            Rendered OUTSIDE the squash wrapper so the bucket bounce
            doesn't squash the aura too. */}
        {frozen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute z-30"
            style={{
              left: "-12%",
              right: "-12%",
              top: "-12%",
              bottom: "-12%",
              borderRadius: "9999px",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(220,240,255,0.55) 55%, rgba(180,220,255,0.0) 100%)",
              boxShadow: "0 0 30px rgba(200,230,255,0.9), inset 0 0 20px rgba(255,255,255,0.7)",
            }}
          />
        )}
        {/* Electric stun sparks — shown when hit by stormpeak lightning */}
        {electricStun && (
          <motion.div
            className="pointer-events-none absolute z-[37]"
            style={{
              left: "-18%",
              right: "-18%",
              top: "-20%",
              bottom: "-10%",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Electric glow */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(147,197,253,0.4) 0%, rgba(59,130,246,0.15) 50%, transparent 80%)",
                boxShadow: "0 0 20px rgba(59,130,246,0.6)",
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.15, repeat: Infinity }}
            />
            {/* Sparks shooting from bucket */}
            {Array.from({ length: 8 }, (_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const dist = 35 + Math.random() * 25;
              const dx = Math.cos(angle) * dist;
              const dy = Math.sin(angle) * dist;
              const sparkLen = 8 + Math.random() * 12;
              return (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: "50%",
                    top: "50%",
                    width: sparkLen,
                    height: 2,
                    marginLeft: -sparkLen / 2,
                    marginTop: -1,
                    background: "linear-gradient(90deg, rgba(255,255,255,0.95), rgba(147,197,253,0.8))",
                    borderRadius: 2,
                    boxShadow: "0 0 6px rgba(147,197,253,0.9)",
                    transform: `rotate(${(angle * 180) / Math.PI}deg)`,
                  }}
                  animate={{
                    x: [0, dx, dx * 0.6],
                    y: [0, dy, dy * 0.6],
                    opacity: [1, 0.8, 0],
                    scale: [1, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 0.35,
                    repeat: Infinity,
                    repeatDelay: 0.1 + Math.random() * 0.2,
                    ease: "easeOut",
                  }}
                />
              );
            })}
            {/* Mini lightning arcs around the bucket */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
              <motion.path
                d="M20 30 L28 40 L22 50 L30 60"
                stroke="#93c5fd"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 0.3 }}
              />
              <motion.path
                d="M75 25 L68 38 L76 48 L70 58"
                stroke="#60a5fa"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.2, delay: 0.15, repeat: Infinity, repeatDelay: 0.35 }}
              />
              <motion.path
                d="M45 15 L50 28 L44 35"
                stroke="#ffffff"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.15, delay: 0.1, repeat: Infinity, repeatDelay: 0.25 }}
              />
            </svg>
          </motion.div>
        )}
        {/* Shield bubble — wraps the bucket while a shield is equipped.
            Lives outside the squash wrapper so it doesn't bounce when
            the bucket catches fruit. */}
        {shielded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: [1, 1.04, 1] }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.3 } }}
            className="pointer-events-none absolute z-[35]"
            style={{
              left: "-22%",
              right: "-22%",
              top: "-30%",
              bottom: "-12%",
              borderRadius: "9999px",
              background:
                "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, rgba(140,200,255,0.25) 35%, rgba(80,160,255,0.18) 65%, rgba(80,160,255,0) 100%)",
              border: "2px solid rgba(180,220,255,0.85)",
              boxShadow: "0 0 28px rgba(120,190,255,0.75), inset 0 0 24px rgba(255,255,255,0.55)",
            }}
          >
            {/* highlight reflection */}
            <div
              className="absolute"
              style={{
                left: "18%",
                top: "12%",
                width: "28%",
                height: "18%",
                borderRadius: "9999px",
                background: "radial-gradient(ellipse, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 70%)",
              }}
            />
          </motion.div>
        )}
        {/* Shield break shards — fired once per shieldBreakKey change */}
        {shieldBreakKey > 0 && (
          <ShieldBreakBurst key={shieldBreakKey} />
        )}
        {/* Ice-cube encasement — wraps the bucket, semi-transparent so the
            bucket stays visible. Lives outside the squash wrapper so it
            doesn't bounce. */}
        {locked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="pointer-events-none absolute z-[34]"
            style={{
              left: "-18%",
              right: "-18%",
              top: "-22%",
              bottom: "-8%",
            }}
          >
            <div
              className="h-full w-full rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(220,240,255,0.55) 0%, rgba(160,210,240,0.35) 50%, rgba(110,170,220,0.55) 100%)",
                border: "3px solid rgba(255,255,255,0.85)",
                boxShadow:
                  "inset 0 0 24px rgba(255,255,255,0.7), 0 8px 24px rgba(80,130,180,0.5)",
                backdropFilter: "blur(1px)",
              }}
            >
              <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="h-full w-full">
                {/* Base ice frost streaks — always visible, sparse */}
                <path d="M14 14 L22 28" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" fill="none" />
                <path d="M82 12 L74 26" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" fill="none" />
                <path d="M10 96 L20 88" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" fill="none" />
                <path d="M88 100 L78 90" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" fill="none" />
                {/* Random ice shard fragments — appear progressively as the player taps.
                    Each "stage" adds short irregular crack fragments at random-ish
                    positions inside the cube (no spider-web pattern). */}
                {iceBreakProgress > 0.15 && (
                  <g key="frag-1">
                    <path d="M28 22 L34 30 L30 36" stroke="rgba(0,30,60,0.55)" strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M28 22 L34 30 L30 36" stroke="rgba(255,255,255,0.95)" strokeWidth="0.9" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M70 32 L64 38" stroke="rgba(0,30,60,0.5)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                  </g>
                )}
                {iceBreakProgress > 0.35 && (
                  <g key="frag-2">
                    <path d="M18 58 L26 52 L32 60 L28 68" stroke="rgba(0,30,60,0.55)" strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M18 58 L26 52 L32 60 L28 68" stroke="rgba(255,255,255,0.9)" strokeWidth="0.9" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M58 22 L52 28 L56 34" stroke="rgba(0,30,60,0.5)" strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                  </g>
                )}
                {iceBreakProgress > 0.55 && (
                  <g key="frag-3">
                    <path d="M76 56 L82 64 L74 70" stroke="rgba(0,30,60,0.6)" strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M76 56 L82 64 L74 70" stroke="rgba(255,255,255,0.9)" strokeWidth="0.9" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M42 78 L48 84 L42 90" stroke="rgba(0,30,60,0.55)" strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M62 78 L68 86" stroke="rgba(0,30,60,0.5)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  </g>
                )}
                {iceBreakProgress > 0.75 && (
                  <g key="frag-4">
                    <path d="M14 38 L22 42 L18 50" stroke="rgba(0,30,60,0.65)" strokeWidth="2.4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M14 38 L22 42 L18 50" stroke="rgba(255,255,255,0.95)" strokeWidth="1" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M86 78 L78 82 L84 92" stroke="rgba(0,30,60,0.6)" strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M86 78 L78 82 L84 92" stroke="rgba(255,255,255,0.9)" strokeWidth="0.9" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M48 42 L54 48" stroke="rgba(0,30,60,0.55)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  </g>
                )}
                {iceBreakProgress > 0.9 && (
                  <g key="frag-5">
                    {/* Final shatter — many small irregular fragments scattered everywhere */}
                    <path d="M36 14 L42 20 L38 26" stroke="rgba(0,30,60,0.7)" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M62 102 L56 96 L62 90" stroke="rgba(0,30,60,0.7)" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M22 70 L30 76" stroke="rgba(0,30,60,0.6)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M70 14 L76 22" stroke="rgba(0,30,60,0.6)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M50 60 L56 66 L52 72" stroke="rgba(0,30,60,0.65)" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    <path d="M36 14 L42 20 L38 26 M62 102 L56 96 L62 90 M50 60 L56 66 L52 72" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                  </g>
                )}
              </svg>
              {/* glossy top highlight */}
              <div
                className="absolute"
                style={{
                  left: "12%",
                  top: "8%",
                  width: "40%",
                  height: "18%",
                  borderRadius: "9999px",
                  background: "radial-gradient(ellipse, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)",
                }}
              />
            </div>
          </motion.div>
        )}
        {/* Bucket itself — squash applies only to this inner wrapper. */}
        <motion.div
          className="relative"
          style={{ width, transformOrigin: "50% 100%" }}
          animate={squashControls}
        >
        {/* invisible mouth hitbox for collision */}
        <div
          ref={innerRef}
          className="pointer-events-none absolute z-10"
          style={{ left: "14%", right: "14%", top: "10%", height: "30%" }}
          aria-hidden
        />

        {/* fruits stacked inside the bucket */}
        <div
          className="pointer-events-none absolute overflow-hidden"
          style={{ left: "12%", right: "12%", top: "20%", bottom: "32%" }}
        >
          {skin === "ghost" ? null : shown.map((f, i) => {
            const row = Math.floor(i / 4);
            const col = i % 4;
            const isLatest = f.bornAt === lastBornAt;
            return (
              <motion.img
                key={f.id}
                src={f.img}
                alt=""
                className="absolute"
                style={{
                  left: `${col * 25 + (row % 2) * 6}%`,
                  bottom: `${row * 18}%`,
                  width: "32%",
                  height: "auto",
                  transform: `rotate(${f.rot}deg)`,
                }}
                initial={isLatest ? { y: -30, scale: 1.3, opacity: 0 } : false}
                animate={
                  isLatest
                    ? { y: [-30, 4, -8, 0], scale: [1.3, 1, 1.1, 1], opacity: 1 }
                    : { y: 0, scale: 1, opacity: 1 }
                }
                transition={
                  isLatest
                    ? { duration: 0.45, times: [0, 0.5, 0.75, 1], ease: "easeOut" }
                    : { duration: 0 }
                }
              />
            );
          })}
        </div>

        {bucketId === "wooden" && CUSTOM_SHAPE_SKINS.includes(skin) ? (
          <motion.div
            className="relative z-20 w-full"
            animate={skin === "ghost" ? { y: [0, -4, 0], opacity: [0.85, 1, 0.85] } : undefined}
            transition={skin === "ghost" ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
            style={{ filter: skin === "ghost" ? "drop-shadow(0 0 16px rgba(180,220,255,0.9))" : undefined }}
          >
            <SkinShape skin={skin} width={width} />
          </motion.div>
        ) : (
          <div className="relative w-full">
            <img
              src={BUCKET_IMG[bucketId]}
              alt="Bucket"
              className="relative z-20 h-auto w-full drop-shadow-2xl"
              draggable={false}
              width={512}
              height={512}
              style={bucketId === "wooden" && skin === "gold" ? { filter: SKIN_FILTERS.gold } : undefined}
            />
            {/* Gold skin: shimmer sweep + sparkles + pulsing aura */}
            {bucketId === "wooden" && skin === "gold" && (
              <>
                {/* Pulsing aura behind */}
                <motion.div
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(255,210,80,0.55) 0%, rgba(255,170,20,0.25) 45%, rgba(255,140,0,0) 75%)",
                    filter: "blur(6px)",
                  }}
                  animate={{ opacity: [0.55, 0.95, 0.55], scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Twinkling sparkles around the bucket */}
                {Array.from({ length: 6 }).map((_, i) => {
                  const left = 8 + (i * 17) % 90;
                  const top = 12 + (i * 23) % 70;
                  const delay = (i * 0.35) % 2;
                  return (
                    <motion.span
                      key={i}
                      className="pointer-events-none absolute z-30"
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        width: 6,
                        height: 6,
                        borderRadius: "9999px",
                        background:
                          "radial-gradient(circle, #fffbe0 0%, #ffd24a 50%, transparent 100%)",
                        boxShadow: "0 0 8px rgba(255,210,80,0.95)",
                      }}
                      animate={{ opacity: [0, 1, 0], scale: [0.4, 1.4, 0.4] }}
                      transition={{ duration: 1.4, delay, repeat: Infinity, ease: "easeInOut" }}
                    />
                  );
                })}
              </>
            )}
          </div>
        )}
        </motion.div>
      </div>
    </motion.div>
  );
});
