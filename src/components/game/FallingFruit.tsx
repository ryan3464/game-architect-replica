import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export interface FruitState {
  id: number;
  img: string;
  size: number;
  x: number; // px from container left
  startY: number;
  endY: number; // ground y
  rotate: number;
  duration: number;
  status: "falling" | "caught" | "grounded" | "bounced";
  /** True for rotten fruit — catching it costs points. */
  rotten?: boolean;
  /** True for golden fruit — worth 10× points. */
  golden?: boolean;
  /** True for volcano lava hazard — heavier penalty than rotten. */
  lava?: boolean;
  /** True for space biome meteorite hazard. */
  meteorite?: boolean;
  /** True for tundra biome snowball hazard — freezes the bucket on hit. */
  snowball?: boolean;
  /** Optional horizontal slide (px) applied after landing — used for tundra ice. */
  slideDx?: number;
}

interface Props {
  fruit: FruitState;
  onComplete: (id: number) => void;
  onLanded: (id: number) => void;
  /** When true, freeze the falling animation in place (for shop / modal pause). */
  paused?: boolean;
}

export function FallingFruit({ fruit, onComplete, onLanded, paused = false }: Props) {
  const [phase, setPhase] = useState<"fall" | "rest" | "fade">("fall");

  // Controls for the falling motion — let us .stop() to freeze in place when paused.
  const fallControls = useAnimationControls();
  const hazardControls = useAnimationControls();
  const groundControls = useAnimationControls();

  // Track elapsed time so we can resume the fall with a shorter remaining duration.
  const startedAtRef = useRef<number | null>(null);
  const elapsedAtPauseRef = useRef(0);

  // After fall, sit on ground briefly, then fade — but pause timers if requested.
  useEffect(() => {
    if (fruit.status !== "grounded") return;
    if (paused) return;
    setPhase("rest");
    const t1 = setTimeout(() => setPhase("fade"), 1400);
    const t2 = setTimeout(() => onComplete(fruit.id), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fruit.status, fruit.id, onComplete, paused]);

  if (fruit.status === "caught") {
    onComplete(fruit.id);
    return null;
  }

  // Fireballs (volcano), meteorites (space) and snowballs (tundra) all share
  // the same straight-fall hazard behavior: no rotation, faster, with a trail,
  // and they pass through the bottom of the screen instead of landing.
  const isFireball = Boolean(fruit.lava);
  const isMeteorite = Boolean(fruit.meteorite);
  const isSnowball = Boolean(fruit.snowball);
  const isStraightHazard = isFireball || isMeteorite || isSnowball;

  if (isStraightHazard && fruit.status === "falling") {
    const fieldBottom = fruit.endY + 180;
    const fallDistance = fieldBottom - fruit.startY;
    const fireDuration = isMeteorite
      ? Math.max(0.4, fruit.duration * 0.5)
      : Math.max(0.55, (fruit.duration - 0.15) * 0.78);
    const trailGradient = isFireball
      ? "linear-gradient(to top, rgba(255,210,80,0.95) 0%, rgba(255,170,40,0.7) 25%, rgba(255,140,30,0.35) 55%, rgba(255,120,20,0) 100%)"
      : isMeteorite
        ? "linear-gradient(to top, rgba(255,180,120,0.95) 0%, rgba(220,120,80,0.7) 25%, rgba(120,80,80,0.3) 55%, rgba(80,40,40,0) 100%)"
        : "linear-gradient(to top, rgba(220,240,255,0.95) 0%, rgba(180,220,255,0.6) 25%, rgba(180,220,255,0.25) 55%, rgba(180,220,255,0) 100%)";
    const glow = isFireball
      ? "drop-shadow(0 0 14px rgba(255,170,40,0.95)) drop-shadow(0 0 26px rgba(255,90,20,0.6))"
      : isMeteorite
        ? "drop-shadow(0 0 12px rgba(255,160,100,0.85)) drop-shadow(0 0 22px rgba(180,80,40,0.55))"
        : "drop-shadow(0 0 10px rgba(220,240,255,0.95)) drop-shadow(0 0 20px rgba(160,200,255,0.6))";
    return (
      <HazardFalling
        key="hazard"
        fruit={fruit}
        paused={paused}
        fallDistance={fallDistance}
        fireDuration={fireDuration}
        trailGradient={trailGradient}
        glow={glow}
        controls={hazardControls}
        startedAtRef={startedAtRef}
        elapsedAtPauseRef={elapsedAtPauseRef}
        onComplete={onComplete}
      />
    );
  }

  if (fruit.status === "grounded" || fruit.status === "bounced") {
    const slideDx = fruit.slideDx ?? 0;
    return (
      <motion.img
        src={fruit.img}
        alt=""
        width={fruit.size}
        height={fruit.size}
        className="pointer-events-none absolute z-15 select-none"
        style={{
          left: fruit.x,
          top: fruit.endY,
          width: fruit.size,
          height: fruit.size,
        }}
        initial={false}
        animate={{
          opacity: phase === "fade" ? 0 : 1,
          scale: phase === "fade" ? 0.6 : 1,
          // 🌀 Mantieni l'angolo con cui è atterrato: niente rotazione finale.
          rotate: fruit.rotate,
          x: slideDx,
        }}
        transition={{
          opacity: { duration: phase === "fade" ? 0.6 : 0.3, ease: "easeOut" },
          scale: { duration: phase === "fade" ? 0.6 : 0.3, ease: "easeOut" },
          x: { duration: 1.4, ease: "easeOut" },
        }}
      />
    );
  }

  // Falling: drop with easing then bounce twice via keyframes
  const fallDistance = fruit.endY - fruit.startY;
  return (
    <NormalFalling
      fruit={fruit}
      fallDistance={fallDistance}
      paused={paused}
      controls={fallControls}
      startedAtRef={startedAtRef}
      elapsedAtPauseRef={elapsedAtPauseRef}
      onLanded={onLanded}
    />
  );
}

// ============================================================================
// Sub-components that own their pause/resume animation lifecycle.
// We split these out so we can use useEffect on `paused` without violating
// the rules-of-hooks branching in the parent.
// ============================================================================

interface NormalFallingProps {
  fruit: FruitState;
  fallDistance: number;
  paused: boolean;
  controls: ReturnType<typeof useAnimationControls>;
  startedAtRef: React.MutableRefObject<number | null>;
  elapsedAtPauseRef: React.MutableRefObject<number>;
  onLanded: (id: number) => void;
}

function NormalFalling({ fruit, fallDistance, paused, controls, startedAtRef, elapsedAtPauseRef, onLanded }: NormalFallingProps) {
  const totalDuration = fruit.duration + 0.45;

  useEffect(() => {
    let cancelled = false;
    const runFromElapsed = async (elapsedSec: number) => {
      const remain = Math.max(0.05, totalDuration - elapsedSec);
      const ratio = elapsedSec / totalDuration;
      // Compute current y/rotate at this elapsed point so we resume from there.
      // Approximate using piecewise lerp through the keyframe times.
      const yKeys = [0, fallDistance, fallDistance - 28, fallDistance, fallDistance - 10, fallDistance];
      const rKeys = [0, fruit.rotate, fruit.rotate + 20, fruit.rotate + 30, fruit.rotate + 35, fruit.rotate + 40];
      const times = [0, 0.7, 0.82, 0.9, 0.96, 1];
      let curY = yKeys[0];
      let curR = rKeys[0];
      for (let i = 0; i < times.length - 1; i++) {
        if (ratio >= times[i] && ratio <= times[i + 1]) {
          const seg = (ratio - times[i]) / (times[i + 1] - times[i] || 1);
          curY = yKeys[i] + (yKeys[i + 1] - yKeys[i]) * seg;
          curR = rKeys[i] + (rKeys[i + 1] - rKeys[i]) * seg;
          break;
        }
      }
      // Slice remaining keyframes from current position to end.
      const remainingY: number[] = [curY];
      const remainingR: number[] = [curR];
      const remainingTimes: number[] = [0];
      for (let i = 0; i < times.length; i++) {
        if (times[i] > ratio) {
          remainingY.push(yKeys[i]);
          remainingR.push(rKeys[i]);
          remainingTimes.push((times[i] - ratio) / (1 - ratio));
        }
      }
      try {
        startedAtRef.current = performance.now() - elapsedSec * 1000;
        await controls.start({
          y: remainingY,
          rotate: remainingR,
          opacity: 1,
          scale: 1,
          transition: {
            y: { duration: remain, times: remainingTimes, ease: "easeIn" },
            rotate: { duration: remain, ease: "linear" },
            opacity: { duration: 0.15 },
            scale: { duration: 0.15 },
          },
        });
        if (cancelled) return;
        if (fruit.status === "falling") onLanded(fruit.id);
      } catch {
        /* stopped */
      }
    };

    if (paused) {
      // Snapshot elapsed time, then stop.
      if (startedAtRef.current !== null) {
        elapsedAtPauseRef.current = (performance.now() - startedAtRef.current) / 1000;
      }
      controls.stop();
    } else {
      runFromElapsed(elapsedAtPauseRef.current);
    }
    return () => {
      cancelled = true;
    };
  }, [paused, controls, fallDistance, fruit.duration, fruit.rotate, fruit.status, fruit.id, totalDuration, onLanded, startedAtRef, elapsedAtPauseRef]);

  return (
    <motion.img
      id={`fruit-${fruit.id}`}
      src={fruit.img}
      alt=""
      width={fruit.size}
      height={fruit.size}
      draggable={false}
      className="pointer-events-none absolute z-20 select-none"
      style={{
        left: fruit.x,
        top: fruit.startY,
        width: fruit.size,
        height: fruit.size,
        filter: fruit.golden
          ? "drop-shadow(0 0 14px rgba(255,200,40,0.95))"
          : undefined,
      }}
      initial={{ y: 0, rotate: 0, opacity: 0, scale: 0.5 }}
      animate={controls}
    />
  );
}

interface HazardFallingProps {
  fruit: FruitState;
  paused: boolean;
  fallDistance: number;
  fireDuration: number;
  trailGradient: string;
  glow: string;
  controls: ReturnType<typeof useAnimationControls>;
  startedAtRef: React.MutableRefObject<number | null>;
  elapsedAtPauseRef: React.MutableRefObject<number>;
  onComplete: (id: number) => void;
}

function HazardFalling({ fruit, paused, fallDistance, fireDuration, trailGradient, glow, controls, startedAtRef, elapsedAtPauseRef, onComplete }: HazardFallingProps) {
  useEffect(() => {
    let cancelled = false;
    const runFromElapsed = async (elapsedSec: number) => {
      const remain = Math.max(0.05, fireDuration - elapsedSec);
      const ratio = elapsedSec / fireDuration;
      const curY = fallDistance * ratio * ratio; // easeIn approx
      const targetX = fruit.slideDx ?? 0;
      const curX = targetX * ratio;
      try {
        startedAtRef.current = performance.now() - elapsedSec * 1000;
        await controls.start({
          x: targetX,
          y: fallDistance,
          opacity: 1,
          rotate: 0,
          transition: {
            x: { duration: remain, ease: "linear", from: curX },
            y: { duration: remain, ease: "easeIn", from: curY },
            opacity: { duration: 0.05 },
          },
        });
        if (cancelled) return;
        if (fruit.status === "falling") onComplete(fruit.id);
      } catch {
        /* stopped */
      }
    };

    if (paused) {
      if (startedAtRef.current !== null) {
        elapsedAtPauseRef.current = (performance.now() - startedAtRef.current) / 1000;
      }
      controls.stop();
    } else {
      runFromElapsed(elapsedAtPauseRef.current);
    }
    return () => {
      cancelled = true;
    };
  }, [paused, controls, fallDistance, fireDuration, fruit.slideDx, fruit.status, fruit.id, onComplete, startedAtRef, elapsedAtPauseRef]);

  return (
    <div
      className="pointer-events-none absolute z-20 select-none"
      style={{ left: fruit.x, top: fruit.startY, width: fruit.size, height: fruit.size }}
    >
      <motion.div
        id={`fruit-${fruit.id}`}
        initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
        animate={controls}
        style={{
          width: fruit.size,
          height: fruit.size,
          position: "relative",
          transformOrigin: "50% 50%",
        }}
      >
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: "55%",
            width: fruit.size * 0.55,
            height: fruit.size * 2.6,
            background: trailGradient,
            filter: "blur(3px)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <img
          src={fruit.img}
          alt=""
          width={fruit.size}
          height={fruit.size}
          draggable={false}
          style={{
            width: fruit.size,
            height: fruit.size,
            filter: glow,
          }}
        />
      </motion.div>
    </div>
  );
}
