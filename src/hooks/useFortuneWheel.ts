/**
 * 🧠 LOGICA — Ruota della Fortuna
 * ------------------------------------------------------------------
 * Gestisce solo numeri/regole/stati. NON tocca la grafica.
 *  - Massimo N giri al giorno (config) + giri bonus tramite Rewarded Ad.
 *  - Il 1° giro è gratis, gli altri richiedono una "pubblicità" (timer simulato).
 *  - Reset giornaliero via localStorage.
 *  - Calcolo del premio pesato + angolo finale di rotazione.
 *  - Accredito automatico del premio al GameState (monete / gadget / skin).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  WHEEL_AD_DURATION_MS,
  WHEEL_MAX_SPINS_PER_DAY,
  WHEEL_MIN_FULL_ROTATIONS,
  WHEEL_PRIZES,
  WHEEL_REWARDED_AD_MS,
  WHEEL_SPIN_DURATION_MS,
  type WheelPrize,
} from "@/config/gameConfig";
import { useGameState } from "@/lib/game-state";

const STORAGE_KEY = "fcm.fortuneWheel.v2";

type Persisted = {
  date: string;       // YYYY-MM-DD
  spinsToday: number;
  bonusSpins: number; // ottenuti con rewarded ad
};

const todayKey = () => new Date().toISOString().slice(0, 10);

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Persisted;
      if (p.date === todayKey()) return { ...p, bonusSpins: p.bonusSpins ?? 0 };
    }
  } catch { /* ignore */ }
  return { date: todayKey(), spinsToday: 0, bonusSpins: 0 };
}

function savePersisted(p: Persisted) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

/** Estrae un premio in base ai pesi. */
function pickWeighted(prizes: WheelPrize[]): number {
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < prizes.length; i++) {
    r -= prizes[i].weight;
    if (r <= 0) return i;
  }
  return prizes.length - 1;
}

export interface UseFortuneWheelOptions {
  /** Callback opzionale chiamato a fine rotazione con il premio vinto (per VFX/UI). */
  onPrizeWon?: (prize: WheelPrize) => void;
}

export function useFortuneWheel({ onPrizeWon }: UseFortuneWheelOptions = {}) {
  const { addCoins, addGadget, ownedSkins, unlockSkin, equipSkin } = useGameState();

  const [persisted, setPersisted] = useState<Persisted>(() => loadPersisted());
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [lastPrize, setLastPrize] = useState<WheelPrize | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adRemainingMs, setAdRemainingMs] = useState(0);
  /** Stato del Rewarded Ad (per ottenere +1 giro). */
  const [isWatchingRewardedAd, setIsWatchingRewardedAd] = useState(false);
  /** Tick periodico per aggiornare il countdown reset (HH:MM:SS). */
  const [now, setNow] = useState(() => Date.now());

  const adTimerRef = useRef<number | null>(null);
  const spinTimerRef = useRef<number | null>(null);
  const rewardedTimerRef = useRef<number | null>(null);

  const updatePersisted = useCallback((updater: (p: Persisted) => Persisted) => {
    setPersisted((prev) => {
      const next = updater(prev);
      savePersisted(next);
      return next;
    });
  }, []);

  // Reset giornaliero passivo + tick countdown ogni secondo.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
      if (persisted.date !== todayKey()) {
        const fresh: Persisted = { date: todayKey(), spinsToday: 0, bonusSpins: 0 };
        savePersisted(fresh);
        setPersisted(fresh);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [persisted.date]);

  useEffect(() => () => {
    if (adTimerRef.current) clearInterval(adTimerRef.current);
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    if (rewardedTimerRef.current) clearTimeout(rewardedTimerRef.current);
  }, []);

  // 🛡️ CAP DURO: il totale di giri disponibili non supera mai WHEEL_MAX_SPINS_PER_DAY.
  // Modello: 1° giro gratuito + 2 successivi solo dopo Rewarded Ad → totale 3/giorno.
  const totalAvailable = WHEEL_MAX_SPINS_PER_DAY;
  const usedToday = persisted.spinsToday;
  const spinsLeft = Math.max(0, totalAvailable - usedToday);
  // Il 1° giro è gratis; i giri 2 e 3 richiedono di aver visto un Rewarded Ad.
  const requiresAd = usedToday >= 1 && spinsLeft > 0;
  const canSpin = !isSpinning && spinsLeft > 0 && !requiresAd;

  // Countdown al reset (mezzanotte locale).
  const msUntilReset = (() => {
    const d = new Date(now);
    const next = new Date(d);
    next.setHours(24, 0, 0, 0);
    return Math.max(0, next.getTime() - d.getTime());
  })();

  // Il pulsante "GIRA GRATIS (ad)" è visibile quando servono ad per il prossimo giro.
  const canEarnBonusSpin = requiresAd;

  /** Accredita realmente il premio al giocatore (monete, gadget, skin). */
  const grantPrize = useCallback((prize: WheelPrize) => {
    if (prize.type === "coins") {
      addCoins(prize.amount);
    } else if (prize.type === "gadget" && prize.gadgetId) {
      addGadget(prize.gadgetId, prize.amount);
    } else if (prize.type === "skin" && prize.skinId) {
      unlockSkin(prize.skinId);
      // Se il giocatore non ha mai equipaggiato questa skin, la equipaggiamo
      // automaticamente come bonus extra (cosmetic).
      if (!ownedSkins.includes(prize.skinId)) {
        equipSkin(prize.skinId);
      }
    }
  }, [addCoins, addGadget, unlockSkin, equipSkin, ownedSkins]);

  /** Esegue effettivamente la rotazione. */
  const performSpin = useCallback(() => {
    if (isSpinning) return;
    const prizeIndex = pickWeighted(WHEEL_PRIZES);
    const prize = WHEEL_PRIZES[prizeIndex];
    const slice = 360 / WHEEL_PRIZES.length;
    const targetAngle = prizeIndex * slice + slice / 2;
    const jitter = (Math.random() - 0.5) * (slice * 0.6);
    const finalRotation =
      rotationDegrees -
      (rotationDegrees % 360) +
      WHEEL_MIN_FULL_ROTATIONS * 360 +
      (360 - targetAngle) +
      jitter;

    setIsSpinning(true);
    setRotationDegrees(finalRotation);

    spinTimerRef.current = window.setTimeout(() => {
      setIsSpinning(false);
      setLastPrize(prize);
      updatePersisted((p) => ({ ...p, spinsToday: p.spinsToday + 1 }));
      grantPrize(prize);
      onPrizeWon?.(prize);
    }, WHEEL_SPIN_DURATION_MS);
  }, [isSpinning, onPrizeWon, rotationDegrees, updatePersisted, grantPrize]);

  /** Avvia il flusso: se serve un ad, mostra il modal; altrimenti gira subito. */
  const startSpin = useCallback(() => {
    if (!canSpin) return;
    if (requiresAd) {
      setShowAdModal(true);
      setAdRemainingMs(WHEEL_AD_DURATION_MS);
      const startedAt = Date.now();
      adTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, WHEEL_AD_DURATION_MS - elapsed);
        setAdRemainingMs(remaining);
        if (remaining <= 0) {
          if (adTimerRef.current) clearInterval(adTimerRef.current);
          adTimerRef.current = null;
          setShowAdModal(false);
          performSpin();
        }
      }, 100);
    } else {
      performSpin();
    }
  }, [canSpin, requiresAd, performSpin]);

  const cancelAd = useCallback(() => {
    if (adTimerRef.current) clearInterval(adTimerRef.current);
    adTimerRef.current = null;
    setShowAdModal(false);
    setAdRemainingMs(0);
  }, []);

  /**
   * Rewarded Ad: simula 2s di "video" e SUBITO DOPO esegue il giro a pagamento.
   * Non incrementa contatori extra: il giro normale verrà conteggiato in
   * performSpin (spinsToday++). Il cap 3/3 resta invalicabile.
   */
  const watchAdForSpin = useCallback(() => {
    if (isWatchingRewardedAd || isSpinning) return;
    if (spinsLeft <= 0) return;
    setIsWatchingRewardedAd(true);
    rewardedTimerRef.current = window.setTimeout(() => {
      setIsWatchingRewardedAd(false);
      performSpin();
    }, WHEEL_REWARDED_AD_MS);
  }, [isWatchingRewardedAd, isSpinning, spinsLeft, performSpin]);
  

  const dismissPrize = useCallback(() => setLastPrize(null), []);

  return useMemo(() => ({
    // stato
    spinsToday: persisted.spinsToday,
    bonusSpins: persisted.bonusSpins,
    spinsLeft,
    maxSpins: totalAvailable,
    isSpinning,
    canSpin,
    requiresAd,
    canEarnBonusSpin,
    msUntilReset,
    rotationDegrees,
    lastPrize,
    showAdModal,
    adRemainingMs,
    adTotalMs: WHEEL_AD_DURATION_MS,
    isWatchingRewardedAd,
    rewardedAdTotalMs: WHEEL_REWARDED_AD_MS,
    prizes: WHEEL_PRIZES,
    // azioni
    startSpin,
    cancelAd,
    dismissPrize,
    watchAdForSpin,
  }), [
    persisted, spinsLeft, totalAvailable, isSpinning, canSpin, requiresAd,
    canEarnBonusSpin, msUntilReset,
    rotationDegrees, lastPrize, showAdModal, adRemainingMs, isWatchingRewardedAd,
    startSpin, cancelAd, dismissPrize, watchAdForSpin,
  ]);
}

export type FortuneWheelApi = ReturnType<typeof useFortuneWheel>;
