/**
 * 📜 IL REGOLAMENTO DEL GIOCO (Config)
 * ------------------------------------------------------------------
 * Qui ci sono SOLO numeri e regole. Niente grafica, niente logica.
 * Cambia un valore qui e l'intero gioco si bilancia di conseguenza.
 *
 * Convenzione: tutti i tempi sono in millisecondi (MS),
 * tutte le probabilità sono numeri tra 0 e 1.
 */

import type { WeatherKind } from "@/components/game/WeatherEvent";
import coinImg from "@/assets/coin.png";
import bucketLargeImg from "@/assets/bucket-large.png";
import bucketGhostImg from "@/assets/bucket-modern.png";

// ===== Power-up & combo =====
export const MAGNET_DURATION_MS = 30_000;
export const COMBO_THRESHOLD = 15;
export const AUTO_SHAKE_MS = 5000;
export const COIN_TICK_MS = 5000;
export const GOLDEN_CHANCE = 0.05;
export const GOLDEN_MULTIPLIER = 10;

// ===== Eventi meteo casuali =====
export const WEATHER_CHECK_MS = 8000;
export const WEATHER_CHANCE_PER_CHECK = 0.15; // ~ in media uno ogni ~55s
export const WEATHER_MIN_MS = 30_000;
export const WEATHER_MAX_MS = 60_000;
export const WEATHER_KINDS: WeatherKind[] = ["rain", "wind", "sun", "bomb_storm"];
export const BOMB_STORM_DURATION_MS = 15_000;

// ===== Pioggia di fuoco (solo bioma vulcano) =====
export const FIRE_RAIN_DURATION_MS = 10_000;
export const FIRE_RAIN_VOLLEY_MS = 900;
export const FIRE_RAIN_MIN_GAP_MS = 60_000;
export const FIRE_RAIN_MAX_GAP_MS = 300_000;

// ===== Casse loot (airdrop) =====
export const CRATE_CHECK_MS = 30000;
export const CRATE_CHANCE_PER_CHECK = 0.1;

// ===== Pericoli di bioma =====
export const FREEZE_DURATION_MS = 5000;
export const METEORITE_CHECK_MS = 4500;
export const METEORITE_CHANCE = 0.55;
export const SNOWBALL_CHECK_MS = 5000;
export const SNOWBALL_CHANCE = 0.5;

// ===== Buchi neri =====
export const BLACKHOLE_CHECK_MS = 7000;
export const BLACKHOLE_CHANCE = 0.45;
export const BLACKHOLE_LIFE_MS = 6500;
export const BLACKHOLE_RADIUS = 110;
export const MAX_BLACKHOLES = 2;

// ===== Portali (bioma spazio) =====
export const PORTAL_CHECK_MS = 7000;
export const PORTAL_CHANCE = 0.7;
export const PORTAL_LIFE_MS = 7000;
export const PORTAL_HIT_RADIUS = 32;

// ===== Esplosioni palle di fuoco =====
export const FIREBALL_EXPLOSION_RADIUS = 130;
export const FIREBALL_EXPLOSION_PENALTY = 25;

// ===== Cubi di ghiaccio (bioma tundra) =====
export const ICE_CUBE_CHECK_MS = 7000;
export const ICE_CUBE_CHANCE = 0.85;
export const ICE_CUBE_TAPS_REQUIRED = 15;
/** Sciogli automaticamente se il giocatore non tocca abbastanza in fretta. */
export const ICE_CUBE_AUTO_THAW_MS = 10_000;

// ===== UX =====
/** Anti-click accidentale sui modal (level-up, bioma, meteo, loot). */
export const MODAL_CLOSE_DELAY_MS = 1000;
/** Tetto massimo di frutti contemporaneamente in caduta (anti-lag mobile). */
export const MAX_FALLING_FRUITS = 24;

// ===== 🎡 Ruota della Fortuna =====
/** Numero massimo di giri al giorno (1 gratis + 2 con pubblicità). */
export const WHEEL_MAX_SPINS_PER_DAY = 3;
/** Quanti giri sono gratuiti, gli altri richiedono un ad. */
export const WHEEL_FREE_SPINS = 1;
/** Durata simulata della pubblicità in millisecondi. */
export const WHEEL_AD_DURATION_MS = 5000;
/** Durata della rotazione della ruota in millisecondi. */
export const WHEEL_SPIN_DURATION_MS = 4500;
/** Numero minimo di rotazioni complete prima di fermarsi (per dramma). */
export const WHEEL_MIN_FULL_ROTATIONS = 5;

/**
 * I 8 spicchi della ruota. L'ordine è quello visivo (orario partendo da ore 12).
 * `weight` = probabilità relativa (più alto = più frequente).
 */
/** Durata simulata del Rewarded Ad (per ottenere +1 giro extra). */
export const WHEEL_REWARDED_AD_MS = 2000;

export type WheelPrizeType = "coins" | "gadget" | "skin";

export type WheelPrize = {
  id: string;
  /** Etichetta corta mostrata nello spicchio. */
  label: string;
  /** Emoji/simbolo mostrato nello spicchio (fallback se non c'è iconImg). */
  icon: string;
  /** Immagine asset coerente con il resto del gioco (Shop/HUD). Opzionale. */
  iconImg?: string;
  /** Tipo di premio per la logica di assegnazione. */
  type: WheelPrizeType;
  /** Quantità (monete o pezzi gadget). Per skin non usato. */
  amount: number;
  /** Per type="gadget": id del gadget (shield, large_bucket, ...). */
  gadgetId?: "magnet" | "slowmo" | "large_bucket" | "shield" | "shockwave" | "golden_heart";
  /** Per type="skin": id della skin cosmetica del secchio. */
  skinId?: "default" | "gold" | "cart" | "teacup" | "ghost";
  /** Etichetta lunga mostrata nel modal di vincita. */
  prizeLabel: string;
  /** Probabilità relativa (più alto = più frequente). */
  weight: number;
};

/**
 * 8 spicchi richiesti dall'utente (orario, partendo da ore 12):
 * 10 monete, 20 monete, 50 monete, 1 gadget Scudo,
 * 100 monete, 200 monete, 1 gadget Secchio Grande, 1 cosmetico Secchio Fantasma.
 * Le icone monete/secchio usano gli stessi asset dello Shop e dell'HUD.
 */
export const WHEEL_PRIZES: WheelPrize[] = [
  { id: "c10",     label: "10",    icon: "🪙", iconImg: coinImg,        type: "coins",  amount: 10,  prizeLabel: "10 Monete",                weight: 28 },
  { id: "c20",     label: "20",    icon: "🪙", iconImg: coinImg,        type: "coins",  amount: 20,  prizeLabel: "20 Monete",                weight: 22 },
  { id: "c50",     label: "50",    icon: "🪙", iconImg: coinImg,        type: "coins",  amount: 50,  prizeLabel: "50 Monete",                weight: 16 },
  { id: "shield",  label: "Scudo", icon: "🛡️",                          type: "gadget", amount: 1, gadgetId: "shield",       prizeLabel: "1 Gadget Scudo",      weight: 10 },
  // Cuore Dorato (raro): scudo extra prima dei cuori rossi.
  // Sovrascrive lo slot precedentemente usato per la skin "ghost" (cosmetico).
  { id: "c100",    label: "100",   icon: "🪙", iconImg: coinImg,        type: "coins",  amount: 100, prizeLabel: "100 Monete",               weight: 10 },
  { id: "c200",    label: "200",   icon: "🪙", iconImg: coinImg,        type: "coins",  amount: 200, prizeLabel: "200 Monete",               weight: 7  },
  { id: "bigbucket", label: "Big", icon: "🪣", iconImg: bucketLargeImg, type: "gadget", amount: 1, gadgetId: "large_bucket", prizeLabel: "1 Secchio Grande",    weight: 5  },
  { id: "ghost",   label: "Cuore", icon: "💛", type: "gadget", amount: 1, gadgetId: "golden_heart", prizeLabel: "1 Cuore Dorato",      weight: 2 },
];
