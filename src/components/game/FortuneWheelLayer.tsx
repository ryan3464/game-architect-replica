/**
 * 🎼 Strato Ruota della Fortuna (DIRETTORE D'ORCHESTRA locale).
 * Collega l'hook (logica) al trigger e alla modale (UI).
 * Viene montato solo durante il gameplay (vedi FruitCatchMasterGame),
 * così l'icona NON spunta nella schermata principale Home.
 */
import { useEffect, useState } from "react";
import { WheelTrigger } from "@/components/ui/WheelTrigger";
import { FortuneWheel } from "@/components/game/FortuneWheel";
import { useFortuneWheel } from "@/hooks/useFortuneWheel";
import { acquireExternalPause, releaseExternalPause } from "@/lib/external-pause";

export function FortuneWheelLayer() {
  const [open, setOpen] = useState(false);
  // L'accredito del premio (monete/gadget/skin) è ora gestito dentro l'hook.
  const wheel = useFortuneWheel();

  // ⏸ Quando la modale ruota è aperta → metti il gioco in pausa globale.
  useEffect(() => {
    if (!open) return;
    acquireExternalPause();
    return () => releaseExternalPause();
  }, [open]);

  return (
    <>
      {/* Posizionata in alto a destra, sotto l'icona Impostazioni dell'HUD. */}
      {/* Posizionata in alto a destra, ben sotto l'icona Impostazioni dell'HUD,
          con margine chiaro così le due icone non si sovrappongono.
          NB: z-30 (sotto WeatherBanner z-20? no, banner è z-20) — la ruota
          deve stare sotto il banner meteo per non coprirlo. */}
      <div className="pointer-events-none fixed right-3 top-[140px] z-[15]">
        <WheelTrigger
          spinsLeft={wheel.spinsLeft}
          maxSpins={wheel.maxSpins}
          onClick={() => setOpen(true)}
        />
      </div>

      <FortuneWheel
        open={open}
        onClose={() => setOpen(false)}
        rotationDegrees={wheel.rotationDegrees}
        isSpinning={wheel.isSpinning}
        canSpin={wheel.canSpin}
        canEarnBonusSpin={wheel.canEarnBonusSpin}
        spinsLeft={wheel.spinsLeft}
        maxSpins={wheel.maxSpins}
        msUntilReset={wheel.msUntilReset}
        lastPrize={wheel.lastPrize}
        showAdModal={wheel.showAdModal}
        adRemainingMs={wheel.adRemainingMs}
        adTotalMs={wheel.adTotalMs}
        isWatchingRewardedAd={wheel.isWatchingRewardedAd}
        onSpin={wheel.startSpin}
        onCancelAd={wheel.cancelAd}
        onDismissPrize={wheel.dismissPrize}
        onWatchAdForSpin={wheel.watchAdForSpin}
      />
    </>
  );
}
