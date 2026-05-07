import { useEffect, useRef, useState } from "react";
import type { BucketHandle } from "@/components/game/Bucket";
import type { FruitState } from "@/components/game/FallingFruit";

interface Props {
  active: boolean;
  bgImg: string;
  fieldRef: React.RefObject<HTMLDivElement | null>;
  bucketRef: React.RefObject<BucketHandle | null>;
  fruits: FruitState[];
}

/**
 * High-end visual layer applied ONLY to the banana biome.
 * - 3-layer parallax (bg blurred 10%, midground 100%, fg blurred 150%)
 * - CSS vignette for depth
 * - Ambient pollen / sun-dust particles
 * - Per-falling-fruit ground drop shadows that follow the fruit horizontally
 */
export function BananaBiomeLayer({ active, bgImg, fieldRef, bucketRef, fruits }: Props) {
  const [bucketX, setBucketX] = useState(0);
  const [fieldW, setFieldW] = useState(800);
  const [fieldH, setFieldH] = useState(600);
  const [groundY, setGroundY] = useState(540);

  // Track bucket center (drives parallax) + field size
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      const field = fieldRef.current;
      const inner = bucketRef.current?.getInnerRect();
      if (field) {
        const fr = field.getBoundingClientRect();
        setFieldW(fr.width);
        setFieldH(fr.height);
        setGroundY(fr.height - 80);
        if (inner) setBucketX(inner.left - fr.left + inner.width / 2);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, fieldRef, bucketRef]);

  if (!active) return null;

  const center = fieldW / 2;
  // parallax offset relative to bucket distance from center
  const offset = bucketX - center;
  const bgShift = -offset * 0.1;
  const fgShift = -offset * 1.5;

  return (
    <>
      {/* Layer 1 — Background (very far, blurred, slow parallax) */}
      <div
        className="pointer-events-none absolute inset-0 z-[0]"
        style={{
          backgroundImage: `url(${bgImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          filter: "blur(7px) saturate(1.05) brightness(0.92)",
          transform: `translate3d(${bgShift}px, 0, 0) scale(1.08)`,
          willChange: "transform",
        }}
      />
      {/* Subtle warm color grading + atmospheric haze */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,220,140,0.10) 0%, rgba(255,180,120,0.05) 40%, rgba(120,180,140,0.08) 100%)",
          mixBlendMode: "soft-light",
        }}
      />

      {/* Midground sharp layer (sky highlight + ground tint) — provides crisp focal plane */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2]"
        style={{
          height: 160,
          background:
            "linear-gradient(to top, rgba(120,90,40,0.35) 0%, rgba(180,140,70,0.18) 45%, transparent 100%)",
        }}
      />

      {/* Per-fruit ground drop shadows (banana fruits only) */}
      {fruits
        .filter((f) => f.status === "falling")
        .map((f) => (
          <FruitGroundShadow key={`sh-${f.id}`} fruit={f} groundY={groundY} />
        ))}

      {/* Ambient pollen / sun-dust particles */}
      <DustParticles fieldW={fieldW} fieldH={fieldH} />

      {/* Foreground out-of-focus leaves — parallax 150% */}
      <div
        className="pointer-events-none absolute inset-0 z-[27]"
        style={{
          transform: `translate3d(${fgShift}px, 0, 0)`,
          willChange: "transform",
          filter: "blur(5px)",
          opacity: 0.55,
        }}
      >
        <FgLeaf x="-4%" y="6%" rot={-18} scale={1.2} delay={0} />
        <FgLeaf x="78%" y="2%" rot={22} scale={1.4} delay={1.6} />
        <FgLeaf x="42%" y="74%" rot={8} scale={1.6} delay={3.0} />
        <FgLeaf x="88%" y="62%" rot={-12} scale={1.3} delay={2.2} />
      </div>

      {/* CSS Vignette (drawn above everything) */}
      <div
        className="pointer-events-none absolute inset-0 z-[35]"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.28) 80%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <style>{`
        @keyframes bananaDust {
          0% { transform: translate3d(0,0,0); opacity: 0; }
          10% { opacity: 0.85; }
          100% { transform: translate3d(var(--dx), var(--dy), 0); opacity: 0; }
        }
        @keyframes fgLeafSway {
          0%, 100% { transform: rotate(var(--rot)) translateY(0); }
          50% { transform: rotate(calc(var(--rot) + 6deg)) translateY(8px); }
        }
        @keyframes bananaTreeSway {
          0%, 100% { transform: rotate(-1.2deg); }
          50% { transform: rotate(1.2deg); }
        }
        .banana-tree-sway > button {
          animation: bananaTreeSway 4.5s ease-in-out infinite;
          transform-origin: 50% 100%;
        }
      `}</style>
    </>
  );
}

function FruitGroundShadow({ fruit, groundY }: { fruit: FruitState; groundY: number }) {
  // Track the actual fruit DOM y to scale/opacity shadow as it falls.
  const [y, setY] = useState(fruit.startY);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = document.getElementById(`fruit-${fruit.id}`);
      if (el) {
        const r = el.getBoundingClientRect();
        const parent = el.closest(".game-shake-root") as HTMLElement | null;
        const pr = parent?.getBoundingClientRect();
        if (pr) setY(r.top - pr.top + r.height / 2);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fruit.id]);

  const dist = Math.max(0, groundY - y);
  const t = Math.min(1, dist / 500); // 0 = at ground, 1 = far up
  const scale = 1 - t * 0.55;
  const opacity = 0.45 - t * 0.35;
  const w = fruit.size * 1.1 * scale;
  return (
    <div
      className="pointer-events-none absolute z-[3]"
      style={{
        left: fruit.x + fruit.size / 2 - w / 2,
        top: groundY,
        width: w,
        height: w * 0.32,
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%)",
        opacity,
        filter: "blur(2px)",
      }}
    />
  );
}

function FgLeaf({ x, y, rot, scale, delay }: { x: string; y: string; rot: number; scale: number; delay: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 220 * scale,
        height: 140 * scale,
        // @ts-expect-error css var
        "--rot": `${rot}deg`,
        animation: `fgLeafSway 5.5s ease-in-out ${delay}s infinite`,
      }}
    >
      <svg viewBox="0 0 220 140" width="100%" height="100%">
        <defs>
          <linearGradient id={`lg-${rot}-${delay}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a8f3e" />
            <stop offset="100%" stopColor="#0f4a1a" />
          </linearGradient>
        </defs>
        <path
          d="M10 70 Q60 0 200 30 Q140 80 10 70 Z"
          fill={`url(#lg-${rot}-${delay})`}
        />
        <path d="M30 65 Q100 50 195 35" stroke="#0a3010" strokeWidth="2" fill="none" opacity="0.6" />
      </svg>
    </div>
  );
}

function DustParticles({ fieldW, fieldH }: { fieldW: number; fieldH: number }) {
  const particles = useRef<Array<{ x: number; y: number; dx: number; dy: number; size: number; dur: number; delay: number }>>([]);
  if (particles.current.length === 0) {
    particles.current = Array.from({ length: 28 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      dx: (Math.random() - 0.5) * 80,
      dy: -40 - Math.random() * 80,
      size: 2 + Math.random() * 3,
      dur: 6 + Math.random() * 6,
      delay: Math.random() * 6,
    }));
  }
  return (
    <div className="pointer-events-none absolute inset-0 z-[12]" style={{ width: fieldW, height: fieldH }}>
      {particles.current.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: "rgba(255,235,170,0.9)",
            boxShadow: "0 0 6px rgba(255,220,140,0.8)",
            // @ts-expect-error css vars
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
            animation: `bananaDust ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
