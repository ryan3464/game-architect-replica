import { motion, useAnimation } from "framer-motion";
import { useImperativeHandle, forwardRef, useRef, useEffect } from "react";

export interface TreeHandle {
  shake: () => void;
  /** returns the rect of the canopy area (where fruit visually hangs) */
  getCanopyRect: () => DOMRect | null;
  /** trigger a continuous shake for `ms` milliseconds */
  autoShake: (ms: number) => void;
}

interface TreeProps {
  onClick: () => void;
  imgSrc: string;
  /** fires periodically while autoShake is active so caller can spawn fruit */
  onAutoShakeTick?: () => void;
  /** if true the canopy is rendered wider (used for the apple tree) */
  extraWide?: boolean;
  /** override the default tree height (default 105vh) */
  heightClass?: string;
  /** hides the rendered tree artwork while keeping the clickable canopy area alive */
  hiddenVisual?: boolean;
}

export const FruitTree = forwardRef<TreeHandle, TreeProps>(({ onClick, imgSrc, onAutoShakeTick, extraWide, heightClass, hiddenVisual }, ref) => {
  const controls = useAnimation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const autoShakeUntilRef = useRef(0);
  const tickRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    shake: () => {
      controls.start({
        rotate: [0, -5, 6, -4, 4, -2, 0],
        transition: { duration: 0.55, ease: "easeInOut" },
      });
    },
    getCanopyRect: () => {
      const r = imgRef.current?.getBoundingClientRect();
      if (!r) return null;
      // canopy is roughly the top half of the tree image
      return new DOMRect(r.left, r.top, r.width, r.height * 0.55);
    },
    autoShake: (ms: number) => {
      autoShakeUntilRef.current = performance.now() + ms;
      controls.start({
        rotate: [0, -6, 6, -5, 5, -4, 4, -3, 3, 0],
        transition: { duration: ms / 1000, ease: "easeInOut", repeat: 0 },
      });
    },
  }));

  // Auto-shake spawner tick (every ~180ms while active)
  useEffect(() => {
    const loop = () => {
      if (performance.now() < autoShakeUntilRef.current) {
        onAutoShakeTick?.();
      }
      tickRef.current = window.setTimeout(loop, 180);
    };
    tickRef.current = window.setTimeout(loop, 180);
    return () => {
      if (tickRef.current) clearTimeout(tickRef.current);
    };
  }, [onAutoShakeTick]);

  return (
    <div className="absolute left-1/2 bottom-[6%] z-10 -translate-x-1/2">
      <motion.button
        type="button"
        onClick={onClick}
        animate={controls}
        whileTap={{ scale: 0.97 }}
        style={{ originY: 1, originX: 0.5 }}
        className={`cursor-pointer select-none focus:outline-none ${hiddenVisual ? "opacity-0" : ""}`}
        aria-label="Shake the fruit tree"
      >
        <img
          ref={imgRef}
          src={imgSrc}
          alt=""
          className={`${heightClass ?? "w-[120vw] sm:w-[95vw] md:w-[75vw] max-h-[115vh]"} h-auto max-w-[1000px] origin-bottom ${
            extraWide ? "scale-110" : ""
          }`}
          style={{ filter: "drop-shadow(0 18px 12px rgba(0,0,0,0.22))" }}
          draggable={false}
          width={1024}
          height={1024}
        />
      </motion.button>
    </div>
  );
});

FruitTree.displayName = "FruitTree";
