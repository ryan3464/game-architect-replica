import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/sfx";

interface FrostOverlayProps {
  /** Active only when biome === "tundra" and game running. */
  active: boolean;
  /** Pause progression while modals are open. */
  paused?: boolean;
}

/**
 * 🧊 Strato di gelo che appanna lo schermo nel bioma polare.
 * Ogni 30–60s appare con opacità crescente; ogni clic/drag dell'utente la
 * abbassa del 20%. Quando arriva a 0 sparisce e riparte il timer.
 */
export function FrostOverlay({ active, paused = false }: FrostOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const lastWipeRef = useRef(0);

  // Schedule next frost wave.
  useEffect(() => {
    if (!active) {
      setVisible(false);
      setOpacity(0);
      return;
    }
    if (paused) return;
    if (visible) return;
    const delay = 30000 + Math.random() * 30000; // 30s..60s
    const id = window.setTimeout(() => {
      setOpacity(0.15);
      setVisible(true);
    }, delay);
    return () => clearTimeout(id);
  }, [active, paused, visible]);

  // Grow opacity over time while visible.
  useEffect(() => {
    if (!visible || paused) return;
    const id = window.setInterval(() => {
      setOpacity((o) => Math.min(0.85, +(o + 0.025).toFixed(2)));
    }, 600);
    return () => clearInterval(id);
  }, [visible, paused]);

  // Auto-hide once cleared.
  useEffect(() => {
    if (visible && opacity <= 0) setVisible(false);
  }, [visible, opacity]);

  const handleWipe = (e: React.PointerEvent) => {
    // throttle wipe SFX so dragging doesn't spam
    const now = performance.now();
    if (now - lastWipeRef.current > 80) {
      lastWipeRef.current = now;
      sfx.click();
    }
    setOpacity((o) => Math.max(0, +(o - 0.2).toFixed(2)));
    e.preventDefault();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="frost"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-[18]"
          style={{ touchAction: "none" }}
          onPointerDown={handleWipe}
          onPointerMove={(e) => {
            if (e.pressure > 0 || e.buttons > 0) handleWipe(e);
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(225,240,255,${opacity})`,
              backdropFilter: `blur(${Math.min(8, opacity * 9)}px)`,
              WebkitBackdropFilter: `blur(${Math.min(8, opacity * 9)}px)`,
              boxShadow: "inset 0 0 80px 20px rgba(180,220,255,0.6)",
              transition: "background-color 0.3s linear, backdrop-filter 0.3s linear",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
