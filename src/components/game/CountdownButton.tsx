import { useEffect, useState } from "react";

interface CountdownButtonProps {
  show: boolean;
  delayMs?: number;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * Button that becomes clickable after `delayMs` from when `show` flips truthy.
 * Until then it shows a small countdown badge instead of a "blocked" cursor —
 * the button stays visually identical (no red cursor), it just refuses clicks.
 */
export function CountdownButton({
  show,
  delayMs = 1000,
  onClick,
  className = "",
  children,
}: CountdownButtonProps) {
  const [remaining, setRemaining] = useState(delayMs);

  useEffect(() => {
    if (!show) {
      setRemaining(delayMs);
      return;
    }
    setRemaining(delayMs);
    const start = performance.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, delayMs - (performance.now() - start));
      setRemaining(left);
      if (left <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [show, delayMs]);

  const ready = remaining <= 0;
  const seconds = Math.ceil(remaining / 1000);

  return (
    <button
      type="button"
      onClick={() => {
        if (ready) onClick();
      }}
      aria-disabled={!ready}
      className={`relative ${className}`}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {children}
        {!ready && (
          <span className="ml-1 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-black/30 px-1.5 text-xs font-bold tabular-nums text-white">
            {seconds}
          </span>
        )}
      </span>
    </button>
  );
}