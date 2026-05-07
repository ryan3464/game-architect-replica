import { AnimatePresence, motion } from "framer-motion";
import bucketImg from "@/assets/bucket-large.png";

interface ActiveGadget {
  key: string;
  icon: "magnet" | "slowmo" | "bucket";
  remainingMs: number;
}

interface Props {
  magnetRemainingMs: number;
  slowmoRemainingMs: number;
  largeBucketRemainingMs: number;
}

function fmt(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  return `${s}s`;
}

function GadgetIcon({ icon }: { icon: ActiveGadget["icon"] }) {
  if (icon === "bucket") {
    return <img src={bucketImg} alt="" className="h-4 w-4 object-contain" width={16} height={16} />;
  }
  if (icon === "magnet") return <span className="text-base leading-none">🧲</span>;
  return <span className="text-base leading-none">⏱️</span>;
}

export function ActiveGadgetsBadge({
  magnetRemainingMs,
  slowmoRemainingMs,
  largeBucketRemainingMs,
}: Props) {
  const items: ActiveGadget[] = [];
  if (magnetRemainingMs > 0) items.push({ key: "magnet", icon: "magnet", remainingMs: magnetRemainingMs });
  if (slowmoRemainingMs > 0) items.push({ key: "slowmo", icon: "slowmo", remainingMs: slowmoRemainingMs });
  if (largeBucketRemainingMs > 0) items.push({ key: "large_bucket", icon: "bucket", remainingMs: largeBucketRemainingMs });

  return (
    // Colonna ordinata SOTTO l'icona della ruota (left-3 + 64px wheel + gap)
    <div className="pointer-events-none absolute left-3 top-44 z-30 flex flex-col gap-1.5">
      <AnimatePresence>
        {items.map((it) => (
          <motion.div
            key={it.key}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="flex items-center gap-1.5 rounded-full bg-card/85 text-card-foreground backdrop-blur-md px-2.5 py-1 shadow-lg ring-1 ring-black/10"
          >
            <GadgetIcon icon={it.icon} />
            <span className="font-display text-[11px] font-bold tabular-nums text-foreground">
              {fmt(it.remainingMs)}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
