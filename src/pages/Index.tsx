import { FruitCatchMasterGame } from "@/components/game/FruitCatchMasterGame";
import { GameStateProvider } from "@/lib/game-state";
import { SettingsProvider } from "@/lib/settings";

/**
 * 🎼 IL DIRETTORE D'ORCHESTRA — root della pagina di gioco.
 * La Ruota della Fortuna NON è montata qui: vive dentro
 * `FruitCatchMasterGame` così è visibile SOLO durante il gameplay
 * (non nella schermata principale Home).
 */
const Index = () => (
  <SettingsProvider>
    <GameStateProvider>
      <FruitCatchMasterGame />
    </GameStateProvider>
  </SettingsProvider>
);

export default Index;
