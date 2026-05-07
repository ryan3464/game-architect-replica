import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/settings";

interface ComboToastProps {
  show: boolean;
  count: number;
}

export function ComboToast({ show, count }: ComboToastProps) {
  const { t } = useSettings();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
          animate={{
            scale: [0.3, 1.4, 1],
            opacity: 1,
            rotate: [-8, 8, -4, 0],
          }}
          exit={{ scale: 0.6, opacity: 0, y: -40 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="pointer-events-none absolute inset-x-0 top-[28%] z-40 flex flex-col items-center"
        >
          <div
            className="px-7 py-4 rounded-3xl shadow-2xl"
            style={{
              background: "linear-gradient(135deg, oklch(0.7 0.25 30), oklch(0.78 0.22 60))",
              boxShadow: "0 0 40px oklch(0.78 0.22 60 / 0.6)",
            }}
          >
            <div className="font-display text-5xl font-extrabold text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.3)]">
              {t("combo")}
            </div>
            <div className="mt-1 text-center font-display text-sm font-bold text-white/90 tracking-widest">
              ×{count}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
