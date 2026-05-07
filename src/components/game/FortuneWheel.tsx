/**
 * 👕 VESTITO — Modale Ruota della Fortuna (stile AAA cartoon/steampunk).
 * Componente puramente visivo: riceve dati e callback, non gestisce stato.
 */
import { AnimatePresence, motion } from "framer-motion";
import { WHEEL_PRIZES, WHEEL_SPIN_DURATION_MS, type WheelPrize } from "@/config/gameConfig";
import { Play, Loader2 } from "lucide-react";

interface FortuneWheelProps {
  open: boolean;
  onClose: () => void;
  rotationDegrees: number;
  isSpinning: boolean;
  canSpin: boolean;
  canEarnBonusSpin: boolean;
  spinsLeft: number;
  maxSpins: number;
  msUntilReset: number;
  lastPrize: WheelPrize | null;
  showAdModal: boolean;
  adRemainingMs: number;
  adTotalMs: number;
  isWatchingRewardedAd: boolean;
  onSpin: () => void;
  onCancelAd: () => void;
  onDismissPrize: () => void;
  onWatchAdForSpin: () => void;
}

function formatHMS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SLICE_COLORS = [
  ["#fbbf24", "#d97706"], // 10 monete
  ["#fb923c", "#c2410c"], // 20 monete
  ["#f43f5e", "#9f1239"], // 50 monete
  ["#38bdf8", "#0369a1"], // scudo
  ["#facc15", "#a16207"], // 100 monete
  ["#a855f7", "#6b21a8"], // 200 monete
  ["#34d399", "#047857"], // big bucket
  ["#cbd5e1", "#475569"], // ghost skin
];

const RADIUS = 140;
const CENTER = 150;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function FortuneWheel(props: FortuneWheelProps) {
  const {
    open, onClose, rotationDegrees, isSpinning, canSpin, canEarnBonusSpin,
    spinsLeft, maxSpins, msUntilReset, lastPrize, showAdModal, adRemainingMs, adTotalMs,
    isWatchingRewardedAd,
    onSpin, onCancelAd, onDismissPrize, onWatchAdForSpin,
  } = props;

  const slice = 360 / WHEEL_PRIZES.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-black/70 via-indigo-950/70 to-black/80 backdrop-blur-md"
            onClick={isSpinning ? undefined : onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-100 to-amber-50 dark:from-amber-950/80 dark:to-zinc-900 p-5 shadow-2xl ring-4 ring-amber-500/70"
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              disabled={isSpinning}
              className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg ring-2 ring-white disabled:opacity-50"
              aria-label="Chiudi"
            >
              ✕
            </button>

            {/* Header (senza icone ruota/tv) */}
            <div className="text-center mb-3">
              <h2 className="font-display text-2xl font-extrabold text-amber-900 dark:text-amber-200 drop-shadow-sm">
                Ruota della Fortuna
              </h2>
              <p className="text-xs font-semibold text-amber-800/80 dark:text-amber-300/80">
                Giri rimasti oggi: {spinsLeft}/{maxSpins}
              </p>
            </div>

            {/* Wheel */}
            <div className="relative mx-auto" style={{ width: 300, height: 300 }}>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-700 shadow-[inset_0_4px_8px_rgba(255,255,255,0.6),inset_0_-6px_12px_rgba(0,0,0,0.4),0_10px_30px_rgba(0,0,0,0.45)]" />
              <div className="absolute inset-3 rounded-full bg-amber-900/30" />

              {/* Pointer */}
              <div className="absolute left-1/2 -top-2 z-20 -translate-x-1/2">
                <svg width="36" height="44" viewBox="0 0 36 44">
                  <polygon points="18,44 2,4 34,4" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />
                  <circle cx="18" cy="8" r="4" fill="#fde047" stroke="#7f1d1d" strokeWidth="2" />
                </svg>
              </div>

              <motion.svg
                viewBox="0 0 300 300"
                className="absolute inset-2 drop-shadow-xl"
                animate={{ rotate: rotationDegrees }}
                transition={{
                  duration: isSpinning ? WHEEL_SPIN_DURATION_MS / 1000 : 0,
                  ease: isSpinning ? [0.16, 1, 0.3, 1] : "linear",
                }}
                style={{ transformOrigin: "50% 50%" }}
              >
                {WHEEL_PRIZES.map((prize, i) => {
                  const start = i * slice;
                  const end = start + slice;
                  const p1 = polar(CENTER, CENTER, RADIUS, start);
                  const p2 = polar(CENTER, CENTER, RADIUS, end);
                  const largeArc = slice > 180 ? 1 : 0;
                  const d = `M${CENTER} ${CENTER} L${p1.x} ${p1.y} A${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
                  const [c1, c2] = SLICE_COLORS[i % SLICE_COLORS.length];
                  const labelPos = polar(CENTER, CENTER, RADIUS * 0.62, start + slice / 2);
                  return (
                    <g key={prize.id}>
                      <defs>
                        <radialGradient id={`grad-${prize.id}`} cx="50%" cy="50%" r="80%">
                          <stop offset="0%" stopColor={c1} />
                          <stop offset="100%" stopColor={c2} />
                        </radialGradient>
                      </defs>
                      <path d={d} fill={`url(#grad-${prize.id})`} stroke="#7c2d12" strokeWidth="2" />
                      <g transform={`translate(${labelPos.x} ${labelPos.y}) rotate(${start + slice / 2})`}>
                        {prize.iconImg ? (
                          <image
                            href={prize.iconImg}
                            x={-14}
                            y={-22}
                            width={28}
                            height={28}
                            style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))" }}
                          />
                        ) : (
                          <text
                            textAnchor="middle"
                            dy="-6"
                            fontSize="22"
                            style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))" }}
                          >
                            {prize.icon}
                          </text>
                        )}
                        <text
                          textAnchor="middle"
                          dy="14"
                          fontSize="13"
                          fontWeight="800"
                          fill="#fff"
                          style={{ paintOrder: "stroke", stroke: "#1f2937", strokeWidth: 3 }}
                        >
                          {prize.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
                {Array.from({ length: 12 }).map((_, i) => {
                  const p = polar(CENTER, CENTER, RADIUS - 6, (i * 360) / 12);
                  return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fde68a" stroke="#7c2d12" strokeWidth="1" />;
                })}
              </motion.svg>

              {/* Mozzo centrale + tasto GIRA */}
              <button
                type="button"
                onClick={onSpin}
                disabled={!canSpin}
                className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-gradient-to-br from-rose-400 via-rose-600 to-rose-800 font-display text-sm font-extrabold text-white shadow-[inset_0_3px_6px_rgba(255,255,255,0.5),inset_0_-4px_8px_rgba(0,0,0,0.4),0_4px_14px_rgba(0,0,0,0.5)] ring-4 ring-amber-200 transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSpinning ? <span className="text-[10px]">...</span> : <span>GIRA!</span>}
              </button>
            </div>

            {/* TASTO UNIFICATO: GIRA / GIRA GRATIS (ad) / GIRI FINITI */}
            <div className="mt-4 flex items-center justify-center">
              {canSpin ? (
                <button
                  type="button"
                  onClick={onSpin}
                  disabled={!canSpin}
                  className="h-14 w-full max-w-[260px] rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 px-4 font-display text-base font-extrabold text-white shadow-lg ring-2 ring-rose-200/80 transition active:scale-95 disabled:opacity-50"
                >
                  {isSpinning ? "..." : "GIRA"}
                </button>
              ) : canEarnBonusSpin ? (
                <button
                  type="button"
                  onClick={onWatchAdForSpin}
                  disabled={isWatchingRewardedAd || isSpinning}
                  className="flex h-14 w-full max-w-[260px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 px-4 font-display text-base font-extrabold text-white shadow-[0_6px_20px_-4px_rgba(245,158,11,0.7)] ring-2 ring-amber-200 transition active:scale-95 disabled:opacity-60"
                >
                  {isWatchingRewardedAd ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Caricamento…
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" fill="currentColor" /> GIRA GRATIS
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="h-14 w-full max-w-[260px] rounded-2xl bg-zinc-400 px-4 font-display text-base font-extrabold text-white shadow-inner ring-2 ring-zinc-300 opacity-80 cursor-not-allowed"
                >
                  GIRI FINITI
                </button>
              )}
            </div>

            <p className="mt-3 text-center text-[11px] font-semibold text-amber-900/70 dark:text-amber-200/70">
              {canSpin
                ? "Premi GIRA per tentare la fortuna!"
                : canEarnBonusSpin
                  ? "Guarda una pubblicità per recuperare 1 giro"
                  : `Nuovi giri tra: ${formatHMS(msUntilReset)}`}
            </p>
          </motion.div>

          {/* Modal pubblicità (per giro a pagamento) */}
          <AnimatePresence>
            {showAdModal && (
              <motion.div
                className="absolute inset-0 z-[70] flex items-center justify-center p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="absolute inset-0 bg-black/85" />
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="relative rounded-2xl bg-zinc-900 text-white p-6 max-w-xs w-full text-center ring-1 ring-white/10"
                >
                  <p className="font-display font-bold mb-2">Pubblicità in corso…</p>
                  <p className="text-xs text-white/70 mb-4">
                    {(adRemainingMs / 1000).toFixed(1)}s rimanenti
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full bg-emerald-400"
                      initial={false}
                      animate={{ width: `${100 - (adRemainingMs / adTotalMs) * 100}%` }}
                      transition={{ ease: "linear", duration: 0.1 }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onCancelAd}
                    className="mt-4 text-[11px] text-white/50 underline"
                  >
                    Annulla
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal premio vinto — GRANDE e celebrativo */}
          <AnimatePresence>
            {lastPrize && !isSpinning && (
              <motion.div
                className="absolute inset-0 z-[80] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="absolute inset-0 bg-black/80" onClick={onDismissPrize} />
                {/* Raggi di luce di sfondo */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  initial={{ rotate: 0, opacity: 0 }}
                  animate={{ rotate: 360, opacity: 0.35 }}
                  transition={{ rotate: { duration: 18, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.4 } }}
                >
                  <div
                    className="h-[160%] w-[160%]"
                    style={{
                      background:
                        "conic-gradient(from 0deg, rgba(253,224,71,0.0) 0deg, rgba(253,224,71,0.6) 12deg, rgba(253,224,71,0.0) 24deg, rgba(253,224,71,0.0) 60deg, rgba(253,224,71,0.6) 72deg, rgba(253,224,71,0.0) 84deg, rgba(253,224,71,0.0) 120deg, rgba(253,224,71,0.6) 132deg, rgba(253,224,71,0.0) 144deg, rgba(253,224,71,0.0) 180deg, rgba(253,224,71,0.6) 192deg, rgba(253,224,71,0.0) 204deg, rgba(253,224,71,0.0) 240deg, rgba(253,224,71,0.6) 252deg, rgba(253,224,71,0.0) 264deg, rgba(253,224,71,0.0) 300deg, rgba(253,224,71,0.6) 312deg, rgba(253,224,71,0.0) 324deg, rgba(253,224,71,0.0) 360deg)",
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 240, damping: 16 }}
                  className="relative w-full max-w-sm rounded-[2rem] bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 p-8 text-center shadow-[0_30px_80px_-10px_rgba(0,0,0,0.6)] ring-[6px] ring-amber-700/80"
                >
                  <motion.div
                    className="mx-auto mb-3 flex h-32 w-32 items-center justify-center rounded-full bg-white/40 ring-4 ring-white/70 shadow-inner"
                    animate={{ scale: [1, 1.08, 1], rotate: [0, -6, 6, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {/* Per i premi monete usa il vero asset CoinIcon del gioco;
                        per gadget/skin usa l'icona asset oppure l'emoji. */}
                    {lastPrize.iconImg ? (
                      <img
                        src={lastPrize.iconImg}
                        alt=""
                        className="h-24 w-24 object-contain drop-shadow"
                      />
                    ) : (
                      <span className="text-7xl">{lastPrize.icon}</span>
                    )}
                  </motion.div>
                  <p className="font-display text-sm font-bold uppercase tracking-widest text-amber-900/70">
                    Hai vinto!
                  </p>
                  <h3 className="mt-1 font-display text-3xl font-extrabold text-amber-950 leading-tight drop-shadow">
                    {lastPrize.prizeLabel}
                  </h3>
                  <p className="mt-2 text-xs font-semibold text-amber-900/70">
                    Aggiunto al tuo inventario ✨
                  </p>
                  <button
                    type="button"
                    onClick={onDismissPrize}
                    className="mt-5 w-full rounded-2xl bg-amber-900 py-3 font-display text-base font-extrabold text-amber-100 shadow-lg ring-2 ring-amber-700 active:scale-95"
                  >
                    Fantastico!
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
