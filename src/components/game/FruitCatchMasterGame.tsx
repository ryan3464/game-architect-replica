import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { FruitTree, type TreeHandle } from "@/components/game/FruitTree";
import { Bucket, type BucketHandle, type BucketFruit } from "@/components/game/Bucket";
import { FallingFruit, type FruitState } from "@/components/game/FallingFruit";
import { HUD } from "@/components/game/HUD";
import { StartScreen } from "@/components/game/StartScreen";
import { SettingsPanel } from "@/components/game/SettingsPanel";
import { LevelUpModal } from "@/components/game/LevelUpModal";
import { Shop } from "@/components/game/Shop";
import { LevelMap } from "@/components/game/LevelMap";
import { LevelLoader } from "@/components/game/LevelLoader";
import { ActiveGadgetsBadge } from "@/components/game/ActiveGadgetsBadge";
import { CountdownButton } from "@/components/game/CountdownButton";
import { FortuneWheelLayer } from "@/components/game/FortuneWheelLayer";
import { HealthBar } from "@/components/game/HealthBar";
import { GameOverModal } from "@/components/game/GameOverModal";
import { Play } from "lucide-react";

const MAX_HEARTS = 3;
const REVIVE_AD_MS = 2000;

import { ComboToast } from "@/components/game/ComboToast";
import { GoldenBurst } from "@/components/game/GoldenBurst";
import { AchievementsPanel } from "@/components/game/AchievementsPanel";
import { QuestsPanel } from "@/components/game/QuestsPanel";
import { AchievementWatcher } from "@/components/game/AchievementWatcher";
import { WeatherEvent, WeatherBanner, type WeatherKind } from "@/components/game/WeatherEvent";
import { LootCrate, LootBurst, type CrateState, type LootDrop, type LootKind } from "@/components/game/LootCrate";
import { BiomeOverlay } from "@/components/game/BiomeOverlay";
import { BlackHole, type BlackHoleState } from "@/components/game/BlackHole";
import { LightningStrike } from "@/components/game/LightningStrike";
import { MeteoriteHazard, type MeteoriteState } from "@/components/game/MeteoriteHazard";
import { FrostOverlay } from "@/components/game/FrostOverlay";
import { AshRain } from "@/components/game/AshRain";
import { ShadowCemeteryLayer } from "@/components/game/ShadowCemeteryLayer";
import { BananaBiomeLayer } from "@/components/game/BananaBiomeLayer";
import { sfx } from "@/lib/sfx";
import { LEVELS, getLevel } from "@/lib/levels";
import { useSettings } from "@/lib/settings";
import { useGameState, BUCKET_WIDTHS, SLOWMO_DURATION_MS, type BucketSkinId } from "@/lib/game-state";
// 📜 Tutti i numeri/regole vivono nel "regolamento" (config)
import {
  MAGNET_DURATION_MS,
  COMBO_THRESHOLD,
  AUTO_SHAKE_MS,
  COIN_TICK_MS,
  GOLDEN_CHANCE,
  GOLDEN_MULTIPLIER,
  WEATHER_CHECK_MS,
  WEATHER_CHANCE_PER_CHECK,
  WEATHER_MIN_MS,
  WEATHER_MAX_MS,
  WEATHER_KINDS,
  BOMB_STORM_DURATION_MS,
  FIRE_RAIN_DURATION_MS,
  FIRE_RAIN_VOLLEY_MS,
  FIRE_RAIN_MIN_GAP_MS,
  FIRE_RAIN_MAX_GAP_MS,
  CRATE_CHECK_MS,
  CRATE_CHANCE_PER_CHECK,
  FREEZE_DURATION_MS,
  METEORITE_CHECK_MS,
  METEORITE_CHANCE,
  SNOWBALL_CHECK_MS,
  SNOWBALL_CHANCE,
  BLACKHOLE_CHECK_MS,
  BLACKHOLE_CHANCE,
  BLACKHOLE_LIFE_MS,
  BLACKHOLE_RADIUS,
  MAX_BLACKHOLES,
  PORTAL_CHECK_MS,
  PORTAL_CHANCE,
  PORTAL_LIFE_MS,
  PORTAL_HIT_RADIUS,
  FIREBALL_EXPLOSION_RADIUS,
  FIREBALL_EXPLOSION_PENALTY,
  ICE_CUBE_CHECK_MS,
  ICE_CUBE_CHANCE,
  ICE_CUBE_TAPS_REQUIRED,
  ICE_CUBE_AUTO_THAW_MS,
  MODAL_CLOSE_DELAY_MS,
  MAX_FALLING_FRUITS,
} from "@/config/gameConfig";
// Biome-specific hazard images (used directly, not via level.fruitRottenImg)
import meteoriteImg from "@/assets/hazard-meteorite.png";
import snowballImg from "@/assets/hazard-snowball.png";
import { vibrate } from "@/lib/haptics";
import { useDelayedEnable } from "@/hooks/useDelayedEnable";
import { subscribeExternalPause } from "@/lib/external-pause";

function FruitCatchMasterGame() {
  const { t, theme, screenShake } = useSettings();
  const {
    coins,
    addCoins,
    equippedBucket,
    equippedSkin,
    inventory,
    consumeGadget,
    addGadget,
    goldenPackOwned,
    goldenPackEquipped,
    progressQuest,
    bumpStat,
    setBest,
    stats,
    ownedSkins,
    unlockSkin,
    activateLargeBucket,
    largeBucketRemainingMs,
    deactivateLargeBucket,
  } = useGameState();
  const fieldRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<TreeHandle>(null);
  const bucketRef = useRef<BucketHandle>(null);
  const fieldControls = useAnimation();
  const screenShakeRef = useRef(true);
  useEffect(() => { screenShakeRef.current = screenShake; }, [screenShake]);
  const shake = useCallback((opts: Parameters<typeof fieldControls.start>[0]) => {
    if (!screenShakeRef.current) return;
    fieldControls.start(opts);
  }, [fieldControls]);

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  // ❤️ Sistema vite (3 cuori). Le bombe tolgono 1 cuore invece di togliere punti.
  // Supporta mezzi cuori (es. fire trail / pozzanghere elettriche tolgono 0.5).
  const [hearts, setHearts] = useState<number>(MAX_HEARTS);
  const [gameOver, setGameOver] = useState(false);
  const [isWatchingReviveAd, setIsWatchingReviveAd] = useState(false);
  const reviveTimerRef = useRef<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [levelId, setLevelId] = useState(1);
  // Track the highest level the player has ever reached (persisted)
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(() => {
    if (typeof window === "undefined") return 1;
    try {
      const saved = localStorage.getItem("ctf-max-unlocked-level");
      return saved ? Math.max(1, parseInt(saved, 10)) : 1;
    } catch { return 1; }
  });
  const [fruits, setFruits] = useState<FruitState[]>([]);
  const [bucketFruits, setBucketFruits] = useState<BucketFruit[]>([]);
  const [collected, setCollected] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [floats, setFloats] = useState<
    Array<{ id: number; x: number; y: number; text: string; color: "good" | "bad" }>
  >([]);
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [comboCount, setComboCount] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [magnetEndAt, setMagnetEndAt] = useState(0);
  const [magnetRemaining, setMagnetRemaining] = useState(0);
  const [slowmoEndAt, setSlowmoEndAt] = useState(0);
  const [slowmoRemaining, setSlowmoRemaining] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [pendingLevelId, setPendingLevelId] = useState<number | null>(null);
  const [biomeIntro, setBiomeIntro] = useState<null | "volcano" | "tundra" | "stormpeak" | "space" | "shadowcemetery">(null);
  const [weatherIntro, setWeatherIntro] = useState<WeatherKind | null>(null);

  // Weather event system
  const [weather, setWeather] = useState<WeatherKind | null>(null);
  const [weatherEndsAt, setWeatherEndsAt] = useState(0);
  const [weatherSecondsLeft, setWeatherSecondsLeft] = useState(0);
  const [windDirection, setWindDirection] = useState<1 | -1>(1);

  // Loot crates
  const [crates, setCrates] = useState<CrateState[]>([]);
  const [lootBursts, setLootBursts] = useState<
    Array<{ id: number; loot: LootDrop; x: number; y: number; label: string; tierLabel: string }>
  >([]);

  // Black holes (space biome) — kept for backward-compat but no longer spawned
  const [blackHoles, setBlackHoles] = useState<BlackHoleState[]>([]);
  // Space biome: teleport portal pairs.
  // - entry: always horizontal (angle 0). Catches falling items that pass through.
  // - exit: random angle. Items re-enter falling from this position, drifting in
  //   the direction the exit "points" (its angle).
  type PortalPair = {
    id: number;
    bornAt: number;
    entry: { x: number; y: number; w: number; angle: number };
    exit: { x: number; y: number; w: number; angle: number };
  };
  const [portals, setPortals] = useState<PortalPair[]>([]);
  // Bucket freeze timer (tundra snowball)
  const [frozenUntil, setFrozenUntil] = useState(0);
  const [frozenNow, setFrozenNow] = useState(false);
  // Tundra ice cube — encases the bucket and requires tap-to-break
  const [iceCube, setIceCube] = useState<{ id: number; x: number; startY: number; endY: number } | null>(null);
  const [iceEncased, setIceEncased] = useState(false);
  const iceEncasedRef = useRef(false);
  useEffect(() => { iceEncasedRef.current = iceEncased; }, [iceEncased]);
  const [iceTapsLeft, setIceTapsLeft] = useState(0);
  // 💥 Esplosione del cubo di ghiaccio in piccoli frammenti quando si rompe.
  const [iceShatter, setIceShatter] = useState<{ id: number } | null>(null);
  // Snowball bounce VFX (when a snowball hits the ice cube around the bucket)
  const [snowballBounces, setSnowballBounces] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  // Shield gadget — absorbs one hazard hit
  const [shieldActive, setShieldActive] = useState(false);
  const shieldActiveRef = useRef(false);
  useEffect(() => { shieldActiveRef.current = shieldActive; }, [shieldActive]);
  // 💛 Cuore Dorato — scudo extra "morbido" che assorbe danno PRIMA dei
  // cuori rossi. Supporta mezzi: 1 = pieno, 0.5 = metà, 0 = nessuno.
  const [goldenHeartValue, setGoldenHeartValue] = useState(0);
  const goldenHeartValueRef = useRef(0);
  useEffect(() => { goldenHeartValueRef.current = goldenHeartValue; }, [goldenHeartValue]);
  const goldenHeartActive = goldenHeartValue > 0;
  // 🛡️ Invulnerability frames — dopo qualsiasi danno il giocatore è
  // invulnerabile per 1s.
  const invulnUntilRef = useRef(0);
  // Bumped each time the shield is broken — drives Bucket's break animation.
  const [shieldBreakKey, setShieldBreakKey] = useState(0);
  // Fireball explosion ripples (volcano)
  const [explosions, setExplosions] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  // Red flash overlay (meteorite direct hit)
  const [redFlash, setRedFlash] = useState(false);
  // Volcano: fire patches on the ground (fireballs that landed)
  const [firePatches, setFirePatches] = useState<
    Array<{ id: number; x: number; w: number; bornAt: number }>
  >([]);
  // Tundra: ice-floor cracks that warn, then become solid floor obstacles
  // for ~5s before the floor "heals" again (with a freeze-back animation).
  const [iceCracks, setIceCracks] = useState<
    Array<{ id: number; x: number; w: number; phase: "warning" | "broken" | "healing" }>
  >([]);
  // Stormpeak: lightning bolts.
  // Each strike has two phases:
  //  - "warning": cloud charging + thin laser beam pointing at the impact x (1s)
  //  - "strike": the bolt visibly hits the ground (~0.4s)
  const [lightnings, setLightnings] = useState<
    Array<{ id: number; x: number; w: number; phase: "warning" | "strike" }>
  >([]);
  const [stunUntil, setStunUntil] = useState(0);
  const [stunNow, setStunNow] = useState(false);
  // Stormpeak: electric puddles left on the ground after a lightning strike.
  // Damage the bucket (-10) + brief stun if it overlaps them. Last ~3s.
  const [electricPuddles, setElectricPuddles] = useState<
    Array<{ id: number; x: number; w: number; bornAt: number }>
  >([]);
  // Space: physical CSS meteorites (fall → land as obstacle → fade).
  const [meteorites, setMeteorites] = useState<MeteoriteState[]>([]);
  /** Meteorites that have landed and currently act as floor obstacles. */
  const [landedMeteorites, setLandedMeteorites] = useState<Array<{ id: number; x: number; w: number }>>([]);

  const nextIdRef = useRef(1);
  const caughtIdsRef = useRef<Set<number>>(new Set());
  const streakRef = useRef(0);
  /** Levels already counted toward quests/stats in this session (anti-exploit). */
  const completedLevelsRef = useRef<Set<number>>(new Set());
  /** Per-level perfect-run trackers — reset every time a level starts. */
  const droppedAnyFruitRef = useRef(false);
  const hitAnyBombRef = useRef(false);
  /** Biomes for which the intro modal has already been shown (persisted). */
  const seenBiomesRef = useRef<Set<string>>(new Set());
  /** Weather kinds for which the first-time intro has been shown (persisted). */
  const seenWeathersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Bumped reset key v5 — wipes "first time seen" markers so the player
      // re-experiences all intro modals (biomes / weather) like a fresh install.
      const RESET_FLAG = "ctf-reset-v6";
      if (!localStorage.getItem(RESET_FLAG)) {
        localStorage.removeItem("ctf-seen-biomes");
        localStorage.removeItem("ctf-seen-weathers");
        localStorage.setItem(RESET_FLAG, "1");
      }
      const raw = localStorage.getItem("ctf-seen-biomes");
      if (raw) seenBiomesRef.current = new Set(JSON.parse(raw));
      const raw2 = localStorage.getItem("ctf-seen-weathers");
      if (raw2) seenWeathersRef.current = new Set(JSON.parse(raw2));
    } catch { /* ignore */ }
  }, []);
  const markBiomeSeen = useCallback((b: string) => {
    seenBiomesRef.current.add(b);
    try {
      localStorage.setItem("ctf-seen-biomes", JSON.stringify([...seenBiomesRef.current]));
    } catch { /* ignore */ }
  }, []);
  const markWeatherSeen = useCallback((w: string) => {
    seenWeathersRef.current.add(w);
    try {
      localStorage.setItem("ctf-seen-weathers", JSON.stringify([...seenWeathersRef.current]));
    } catch { /* ignore */ }
  }, []);

  // ============== Pause coordination ==============
  // The game must be paused whenever EITHER:
  //   - the tab is hidden (otherwise framer-motion keeps animating off-screen
  //     and items pile up at the bottom), OR
  //   - any modal/overlay is open (settings, shop, map, achievements, quests,
  //     biome intro, weather intro, level-up, transitioning).
  // Both conditions must be evaluated together: returning from a hidden tab
  // while a modal is still open must NOT resume gameplay.
  // We do NOT clear in-flight fruits/hazards on pause — the player should find
  // the game exactly where they left it (no auto-cleanup that could be abused
  // to dodge bombs by opening the shop).
  const [docHidden, setDocHidden] = useState(false);
  useEffect(() => {
    const onVisibility = () => setDocHidden(document.hidden);
    setDocHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // External pause sources (Fortune Wheel modal, Airdrop / LootBurst modals).
  const [externalPauseCount, setExternalPauseCount] = useState(0);
  useEffect(() => subscribeExternalPause(setExternalPauseCount), []);

  const anyModalOpen =
    settingsOpen ||
    shopOpen ||
    mapOpen ||
    achievementsOpen ||
    questsOpen ||
    biomeIntro !== null ||
    weatherIntro !== null ||
    showLevelUp ||
    transitioning ||
    paused ||
    externalPauseCount > 0 ||
    gameOver;

  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = docHidden || anyModalOpen || gameOver;
  }, [docHidden, anyModalOpen, gameOver]);

  // Drive frozen state from frozenUntil
  useEffect(() => {
    if (frozenUntil === 0) {
      setFrozenNow(false);
      return;
    }
    const tick = () => {
      const remain = frozenUntil - performance.now();
      if (remain <= 0) {
        setFrozenNow(false);
        setFrozenUntil(0);
      } else {
        setFrozenNow(true);
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => clearInterval(id);
  }, [frozenUntil]);

  // Drive stun state from stunUntil (stormpeak lightning)
  useEffect(() => {
    if (stunUntil === 0) {
      setStunNow(false);
      return;
    }
    const tick = () => {
      const remain = stunUntil - performance.now();
      if (remain <= 0) {
        setStunNow(false);
        setStunUntil(0);
      } else {
        setStunNow(true);
      }
    };
    tick();
    const id = window.setInterval(tick, 150);
    return () => clearInterval(id);
  }, [stunUntil]);

  const level = getLevel(levelId);
  const fruitName = t(`fruit_${level.fruitKey}_plural`);
  const bucketWidth = BUCKET_WIDTHS[equippedBucket];

  // Coin generation while playing (sun weather → +50%)
  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      addCoins(weather === "sun" ? 2 : 1);
    }, COIN_TICK_MS);
    return () => clearInterval(id);
  }, [started, addCoins, weather]);

  // Spawn one fruit from canopy (NEVER spawns bombs/hazards anymore — those
  // come from the dedicated bomb scheduler so they're independent of clicks).
  const spawnFruit = useCallback(() => {
    if (pausedRef.current) return;
    if (fruitsRef.current.filter((f) => f.status === "falling").length >= MAX_FALLING_FRUITS) return;
    const field = fieldRef.current;
    const canopy = treeRef.current?.getCanopyRect();
    if (!field || !canopy) return;
    const rect = field.getBoundingClientRect();
    const startXAbs = canopy.left + canopy.width * (0.15 + Math.random() * 0.7);
    const startYAbs = canopy.top + canopy.height * (0.4 + Math.random() * 0.5);
    const startX = startXAbs - rect.left - level.fruitSize / 2;
    const startY = startYAbs - rect.top - level.fruitSize / 2;
    const endY = rect.height - 64;
    const id = nextIdRef.current++;
    const isGolden = goldenPackOwned && goldenPackEquipped && Math.random() < GOLDEN_CHANCE;

    const slowmoActive = performance.now() < slowmoEndAt;
    const baseDuration = 1.2 + Math.random() * 0.5;
    const gravityMult = level.gravityMultiplier ?? 1;
    // 🎢 Difficoltà dinamica: ogni 20 punti +5% velocità (cap a 60% più veloce).
    const speedBoost = Math.min(0.6, Math.floor(collected / 20) * 0.05);
    const dynamicMult = 1 - speedBoost;
    const duration = (slowmoActive ? baseDuration * 2 : baseDuration) * gravityMult * dynamicMult;

    setFruits((prev) => [
      ...prev,
      {
        id,
        img: isGolden ? level.fruitGoldImg : level.fruitImg,
        size: isGolden ? level.fruitSize + 8 : level.fruitSize,
        x: Math.max(8, Math.min(rect.width - level.fruitSize - 8, startX)),
        startY,
        endY,
        rotate: (Math.random() - 0.5) * 360,
        duration,
        status: "falling",
        rotten: false,
        golden: isGolden,
        lava: false,
        slideDx: level.biome === "tundra" ? (Math.random() - 0.5) * 140 : 0,
        windSway: level.fruitKey === "banana",
      },
    ]);
  }, [level, goldenPackOwned, goldenPackEquipped, slowmoEndAt, collected]);

  // Refs for values read inside rAF tick without restarting the loop
  const weatherRef = useRef<WeatherKind | null>(null);
  const windDirRef = useRef<1 | -1>(1);
  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);
  useEffect(() => {
    windDirRef.current = windDirection;
  }, [windDirection]);

  // Per-frame collision check + magnet attraction + wind drift
  // We keep a ref to current fruits so the rAF loop never restarts on each
  // state change (which would otherwise cancel/re-create the loop every tick).
  const fruitsRef = useRef<FruitState[]>([]);
  useEffect(() => {
    fruitsRef.current = fruits;
  }, [fruits]);

  // Mirror black holes in a ref so the per-frame pull loop reads fresh data
  // without restarting on every state change.
  const blackHolesRef = useRef<BlackHoleState[]>([]);
  useEffect(() => {
    blackHolesRef.current = blackHoles;
  }, [blackHoles]);

  useEffect(() => {
    if (!started) return;
    let raf = 0;
    let frame = 0;

    const tick = () => {
      frame++;
      // Skip frames when nothing is in the air — saves a lot of work on idle.
      const hasFalling = fruitsRef.current.some((f) => f.status === "falling");
      if (!hasFalling) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      const magnetActive = now < magnetEndAt;
      const innerRect = bucketRef.current?.getInnerRect();
      const fieldRect = fieldRef.current?.getBoundingClientRect();
      const isWindy = weatherRef.current === "wind";
      const windDir = windDirRef.current;

      // Magnet/wind drift: only run every other frame to halve the per-frame
      // setState churn on lower-end devices.
      if ((frame & 1) === 0) {
        if (magnetActive && innerRect && fieldRect) {
          const mouthCenterX = innerRect.left + innerRect.width / 2 - fieldRect.left;
          setFruits((prev) => {
            let any = false;
            const next = prev.map((f) => {
              if (f.status !== "falling") return f;
              if (f.rotten) return f;
              const fruitCenter = f.x + f.size / 2;
              const dx = mouthCenterX - fruitCenter;
              if (Math.abs(dx) < 0.5) return f;
              any = true;
              const step = Math.max(-9, Math.min(9, dx * 0.07));
              return { ...f, x: f.x + step };
            });
            return any ? next : prev;
          });
        } else if (isWindy && fieldRect) {
          setFruits((prev) => {
            let any = false;
            const next = prev.map((f) => {
              if (f.status !== "falling") return f;
              const drift = windDir * 1.4;
              const newX = Math.max(8, Math.min(fieldRect.width - f.size - 8, f.x + drift));
              if (newX === f.x) return f;
              any = true;
              return { ...f, x: newX };
            });
            return any ? next : prev;
          });
        }
      }

      if (innerRect && fieldRect) {
        const mouthTop = innerRect.top;
        const mouthBottom = innerRect.bottom + 6;
        const mouthLeft = innerRect.left;
        const mouthRight = innerRect.right;

        setFruits((prev) => {
          let changed = false;
          const next = prev.map((f) => {
            if (f.status !== "falling") return f;
            if (caughtIdsRef.current.has(f.id)) return f;
            const el = document.getElementById(`fruit-${f.id}`);
            if (!el) return f;
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            // Quick reject: skip full collision check until fruit is near bucket Y.
            if (cy < mouthTop - 80) return f;
            if (cy >= mouthTop && cy <= mouthBottom && cx >= mouthLeft && cx <= mouthRight) {
              changed = true;
              caughtIdsRef.current.add(f.id);
              const localX = cx - fieldRect.left;
              const localY = cy - fieldRect.top;
              const fid = nextIdRef.current++;

              if (f.rotten) {
                const isLavaHit = f.lava;
                const isSnowballHit = f.snowball;
                const isMeteoriteHit = f.meteorite;
                // Ice cube encasement: snowballs bounce off harmlessly with a small VFX.
                if (isSnowballHit && iceEncasedRef.current) {
                  sfx.click();
                  vibrate(15);
                  const bid = nextIdRef.current++;
                  setSnowballBounces((prev) => [...prev, { id: bid, x: localX, y: localY }]);
                  setTimeout(() => {
                    setSnowballBounces((prev) => prev.filter((b) => b.id !== bid));
                  }, 600);
                  return { ...f, status: "caught" as const };
                }
                // Shield gadget absorbs one hazard hit, then vanishes with no damage.
                if (shieldActiveRef.current) {
                  shieldActiveRef.current = false;
                  setShieldActive(false);
                  setShieldBreakKey((k) => k + 1);
                  sfx.click();
                  vibrate([20, 20, 20]);
                  return { ...f, status: "caught" as const };
                }
                sfx.rotten();
                vibrate(isLavaHit ? [40, 40, 80, 40, 80] : 80);
                // Track per-level "no bomb hit" achievement progress.
                hitAnyBombRef.current = true;
                // ❤️ Niente più punti persi: ogni hazard toglie cuori.
                // Meteoriti piccoli = 0.5, grandi = 1. Bombe / fuoco / ghiaccio = 1.
                const dmg = isMeteoriteHit ? (f.size <= 60 ? 0.5 : 1) : 1;
                applyDamage(dmg);
                setFloats((fs) => [
                  ...fs,
                  { id: fid, x: localX, y: localY, text: dmg === 0.5 ? `-½ ❤️` : `-1 ❤️`, color: "bad" },
                ]);
                streakRef.current = 0;
                setComboCount(0);
                // Meteorite direct hit: red flash + heavy screen shake
                if (isMeteoriteHit) {
                  setRedFlash(true);
                  setTimeout(() => setRedFlash(false), 300);
                  shake({
                    x: [0, -12, 14, -10, 8, -4, 0],
                    y: [0, 6, -6, 4, -3, 0],
                    transition: { duration: 0.35, ease: "easeOut" },
                  });
                }
                // Generic bomb hit (no biome hazard) → light screen shake so the
                // player physically feels they were hit.
                if (!isLavaHit && !isSnowballHit && !isMeteoriteHit) {
                  shake({
                    x: [0, -10, 10, -7, 7, -3, 3, 0],
                    y: [0, 4, -4, 3, -3, 0],
                    transition: { duration: 0.4, ease: "easeOut" },
                  });
                }
                // Fireball explosion VFX (volcano)
                if (isLavaHit) {
                  const eid = nextIdRef.current++;
                  setExplosions((prev) => [...prev, { id: eid, x: localX, y: localY }]);
                  setTimeout(() => {
                    setExplosions((prev) => prev.filter((e) => e.id !== eid));
                  }, 700);
                }
                // Snowball freezes the bucket for 5s (tundra)
                if (isSnowballHit) {
                  setFrozenUntil(performance.now() + FREEZE_DURATION_MS);
                  vibrate([60, 30, 60]);
                }
              } else {
                sfx.catch();
                bucketRef.current?.squash();
                const points = f.golden ? GOLDEN_MULTIPLIER : 1;
                setBucketFruits((bf) => [
                  ...bf,
                  { id: nextIdRef.current++, img: f.img, x: 0, rot: (Math.random() - 0.5) * 60, bornAt: now },
                ]);
                setCollected((c) => c + points);
                setFloats((fs) => [
                  ...fs,
                  { id: fid, x: localX, y: localY, text: f.golden ? `+${GOLDEN_MULTIPLIER}` : "+1", color: "good" },
                ]);
                // Stats & quests
                bumpStat("totalFruits", 1);
                progressQuest("catch_fruits", 1);
                if (f.golden) {
                  bumpStat("totalGolden", 1);
                  progressQuest("catch_golden", 1);
                  // Particle burst on golden catch
                  setBursts((bs) => [...bs, { id: fid, x: localX, y: localY }]);
                  setTimeout(() => {
                    setBursts((bs) => bs.filter((b) => b.id !== fid));
                  }, 800);
                  vibrate([20, 30, 40]);
                }
                streakRef.current += 1;
                setBest("bestCombo", streakRef.current);
                if (streakRef.current > 0 && streakRef.current % COMBO_THRESHOLD === 0) {
                  triggerCombo();
                }
              }
              setTimeout(() => {
                setFloats((fs) => fs.filter((x) => x.id !== fid));
              }, 700);
              return { ...f, status: "caught" as const };
            }
            return f;
          });
          return changed ? next : prev;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, magnetEndAt]);

  useEffect(() => {
    if (magnetEndAt === 0) {
      setMagnetRemaining(0);
      return;
    }
    const id = window.setInterval(() => {
      const remaining = Math.max(0, magnetEndAt - performance.now());
      setMagnetRemaining(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [magnetEndAt]);

  useEffect(() => {
    if (slowmoEndAt === 0) {
      setSlowmoRemaining(0);
      return;
    }
    const id = window.setInterval(() => {
      const remaining = Math.max(0, slowmoEndAt - performance.now());
      setSlowmoRemaining(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [slowmoEndAt]);

  const triggerCombo = useCallback(() => {
    sfx.combo();
    vibrate([40, 30, 80]);
    setComboCount(streakRef.current);
    setShowCombo(true);
    addCoins(5);
    progressQuest("combo", 1);
    // Screen shake
    shake({
      x: [0, -8, 8, -6, 6, -3, 3, 0],
      y: [0, 4, -4, 3, -3, 2, -2, 0],
      transition: { duration: 0.45, ease: "easeOut" },
    });
    setTimeout(() => setShowCombo(false), 1600);
    treeRef.current?.autoShake(AUTO_SHAKE_MS);
  }, [addCoins, progressQuest, shake]);

  const handleTreeClick = useCallback(() => {
    if (!started) return;
    sfx.click();
    vibrate(15);
    treeRef.current?.shake();
    // For levels where the tree is part of the background art, the invisible
    // FruitTree shake isn't visible — give a subtle field shake so the player
    // gets feedback that the tap registered.
    if (level.integratedTreeInBackground) {
      shake({
        x: [0, -4, 4, -3, 3, 0],
        y: [0, 2, -2, 1, -1, 0],
        transition: { duration: 0.35, ease: "easeOut" },
      });
    }
    if (Math.random() > level.fallChance) return;
    spawnFruit();
  }, [started, level, spawnFruit, shake]);

  const handleFruitLanded = useCallback((id: number) => {
    setFruits((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f && !f.rotten) {
        streakRef.current = 0;
        setComboCount(0);
        // Track per-level "no fruit dropped" achievement.
        droppedAnyFruitRef.current = true;
      }
      return prev.map((x) => (x.id === id ? { ...x, status: "grounded" as const } : x));
    });
  }, []);

  const handleFruitComplete = useCallback((id: number) => {
    setFruits((prev) => {
      const f = prev.find((x) => x.id === id);
      // Fireball that reached the ground without being caught: trigger an
      // air-burst explosion at the impact point AND leave a short-lived fire patch.
      if (f && f.lava && f.status === "falling") {
        const fieldRect = fieldRef.current?.getBoundingClientRect();
        const el = document.getElementById(`fruit-${id}`);
        if (fieldRect && el) {
          const r = el.getBoundingClientRect();
          const localX = r.left + r.width / 2 - fieldRect.left;
          const localY = r.top + r.height / 2 - fieldRect.top;
          const eid = nextIdRef.current++;
          // 🔇 Niente SFX qui: la palla di fuoco a terra è silenziosa
          // se non colpisce il secchio.
          setExplosions((prev2) => [...prev2, { id: eid, x: localX, y: localY }]);
          setTimeout(() => {
            setExplosions((prev2) => prev2.filter((e) => e.id !== eid));
          }, 700);
          // Spawn a short, flat fire patch on the ground (lasts 1s).
          const patchId = nextIdRef.current++;
          const patchW = 70 + Math.random() * 30;
          const bornAt = performance.now();
          setFirePatches((prev2) => [...prev2, { id: patchId, x: localX - patchW / 2, w: patchW, bornAt }]);
          setTimeout(() => {
            setFirePatches((prev2) => prev2.filter((p) => p.id !== patchId));
          }, 1000);
        }
      }
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  // Watch for level completion
  useEffect(() => {
    if (!started) return;
    if (collected >= level.target && !showLevelUp) {
      sfx.levelUp();
      vibrate([60, 40, 120]);
      addCoins(20);
      // Anti-exploit: only count each level once per session toward stats/quests
      if (!completedLevelsRef.current.has(levelId)) {
        completedLevelsRef.current.add(levelId);
        bumpStat("totalLevelsDone", 1);
        progressQuest("complete_levels", 1);
        // Per-level perfect-run achievements
        if (!droppedAnyFruitRef.current) {
          bumpStat("perfectNoDropLevels", 1);
        }
        if (!hitAnyBombRef.current) {
          bumpStat("perfectNoBombLevels", 1);
        }
      }
      // Update max unlocked level
      const nextLevelId = levelId >= LEVELS.length ? levelId : levelId + 1;
      if (nextLevelId > maxUnlockedLevel) {
        setMaxUnlockedLevel(nextLevelId);
        try { localStorage.setItem("ctf-max-unlocked-level", String(nextLevelId)); } catch {}
      }
      setShowLevelUp(true);
    }
  }, [collected, level.target, showLevelUp, addCoins, bumpStat, progressQuest, levelId, started]);

  // Centralised level transition: shows a loader so the player never sees the
  // previous tree/background swap to the next one mid-frame.
  const goToLevel = useCallback((targetId: number) => {
    setShowLevelUp(false);
    // Clear active gameplay state immediately
    setBucketFruits([]);
    setFruits([]);
    caughtIdsRef.current = new Set();
    streakRef.current = 0;
    setComboCount(0);
    setCollected(0);
    setBlackHoles([]);
    setExplosions([]);
    setFirePatches([]);
    setElectricPuddles([]);
    setFrozenUntil(0);
    // Auto-thaw: if the player completed the level while encased, the next
    // level should start free.
    setIceCube(null);
    setIceEncased(false);
    setIceTapsLeft(0);
    setLightnings([]);
    setMeteorites([]);
    setLandedMeteorites([]);
    setStunUntil(0);
    invulnUntilRef.current = 0;
    // Reset per-level perfect-run trackers for the upcoming level.
    droppedAnyFruitRef.current = false;
    hitAnyBombRef.current = false;
    setHearts(MAX_HEARTS);
    setGameOver(false);
    // Show loader, swap level after a short delay so React paints the loader
    // first and the new tree/background mounts behind it.
    setPendingLevelId(targetId);
    setTransitioning(true);
    const nextLvl = getLevel(targetId);
    // Preload next level's background + tree images so we don't reveal a
    // half-painted scene when the loader fades.
    const preload = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });
    Promise.all([preload(nextLvl.bgImg), preload(nextLvl.treeImg)]).then(() => {
      window.setTimeout(() => {
        setLevelId(targetId);
        // Keep loader visible long enough for the new tree to mount + paint
        window.setTimeout(() => {
          setTransitioning(false);
          setPendingLevelId(null);
          if (nextLvl.biome && !seenBiomesRef.current.has(nextLvl.biome)) {
            setBiomeIntro(nextLvl.biome);
            markBiomeSeen(nextLvl.biome);
          }
        }, 900);
      }, 80);
    });
  }, [markBiomeSeen]);

  const handleContinue = useCallback(() => {
    const next = levelId >= LEVELS.length ? 1 : levelId + 1;
    goToLevel(next);
  }, [levelId, goToLevel]);

  const handleUseMagnet = useCallback(() => {
    if (magnetEndAt > performance.now()) return;
    if (!consumeGadget("magnet")) return;
    setMagnetEndAt(performance.now() + MAGNET_DURATION_MS);
  }, [consumeGadget, magnetEndAt]);

  const handleUseSlowmo = useCallback(() => {
    if (slowmoEndAt > performance.now()) return;
    if (!consumeGadget("slowmo")) return;
    sfx.slowmo();
    vibrate([20, 20, 20, 20, 20]);
    setSlowmoEndAt(performance.now() + SLOWMO_DURATION_MS);
  }, [consumeGadget, slowmoEndAt]);

  const handleUseLargeBucket = useCallback(() => {
    if (largeBucketRemainingMs > 0) return;
    if (!consumeGadget("large_bucket")) return;
    sfx.click();
    vibrate(20);
    activateLargeBucket(5 * 60 * 1000);
  }, [consumeGadget, activateLargeBucket, largeBucketRemainingMs]);

  const handleUseShield = useCallback(() => {
    if (shieldActive) return;
    if (!consumeGadget("shield")) return;
    sfx.click();
    vibrate(20);
    setShieldActive(true);
  }, [consumeGadget, shieldActive]);

  const handleUnequipShield = useCallback(() => {
    setShieldActive(false);
  }, []);

  // 💛 Cuore Dorato — usalo dall'inventario per attivarlo come scudo soft.
  const handleUseGoldenHeart = useCallback(() => {
    if (goldenHeartActive) return;
    if (!consumeGadget("golden_heart")) return;
    sfx.click();
    vibrate(20);
    setGoldenHeartValue(1);
  }, [consumeGadget, goldenHeartActive]);

  const handleUnequipGoldenHeart = useCallback(() => {
    setGoldenHeartValue(0);
  }, []);

  /**
   * 💔 Applica un danno ai cuori con i-frames + cuore dorato frazionato.
   * - Se invulnerabile (i-frames attivi) → ignora.
   * - Se cuore dorato presente, viene scalato per primo (anche di 0.5).
   * - Eventuale eccedenza va sui cuori rossi.
   * - Dopo qualsiasi danno → 1s di invulnerabilità.
   */
  const applyDamage = useCallback((amount: number) => {
    const now = performance.now();
    if (now < invulnUntilRef.current) return;
    invulnUntilRef.current = now + 1000;
    let remaining = amount;
    if (goldenHeartValueRef.current > 0) {
      const absorbed = Math.min(goldenHeartValueRef.current, remaining);
      const nextGold = +(goldenHeartValueRef.current - absorbed).toFixed(1);
      goldenHeartValueRef.current = nextGold;
      setGoldenHeartValue(nextGold);
      remaining = +(remaining - absorbed).toFixed(1);
      if (remaining <= 0) return;
    }
    setHearts((h) => {
      const next = Math.max(0, +(h - remaining).toFixed(1));
      if (next <= 0) setGameOver(true);
      return next;
    });
  }, []);

  // Shockwave: clear all bomb / hazard items currently on screen with a flashy ring.
  // The animation is QUEUED — it actually fires when the player returns to the
  // game (i.e. when no modal is open) so they can see the effect.
  const [shockwaveBursts, setShockwaveBursts] = useState<Array<{ id: number }>>([]);
  const [shockwavePending, setShockwavePending] = useState(false);
  const handleUseShockwave = useCallback(() => {
    if (!consumeGadget("shockwave")) return;
    sfx.click();
    vibrate([30, 20, 30]);
    setShockwavePending(true);
  }, [consumeGadget]);

  // When no modal is open and a shockwave is pending → play it now.
  useEffect(() => {
    if (!shockwavePending) return;
    if (anyModalOpen || docHidden) return;
    setShockwavePending(false);
    const burstId = nextIdRef.current++;
    setShockwaveBursts((prev) => [...prev, { id: burstId }]);
    setTimeout(() => {
      setShockwaveBursts((prev) => prev.filter((b) => b.id !== burstId));
    }, 900);
    // Remove every hazard a moment after the rings start expanding so the
    // player visibly sees them get vaporised.
    setTimeout(() => {
      setFruits((prev) =>
        prev.filter((f) => !(f.rotten || f.lava || f.meteorite || f.snowball)),
      );
    }, 250);
  }, [shockwavePending, anyModalOpen, docHidden]);

  // Unequip / cancel-active handlers — refund inventory NOT applied (player chose to cancel)
  const handleUnequipMagnet = useCallback(() => {
    setMagnetEndAt(0);
    setMagnetRemaining(0);
  }, []);
  const handleUnequipSlowmo = useCallback(() => {
    setSlowmoEndAt(0);
    setSlowmoRemaining(0);
  }, []);
  const handleUnequipLargeBucket = useCallback(() => {
    deactivateLargeBucket();
  }, [deactivateLargeBucket]);

  const startGame = useCallback(() => {
    // Show the level-1 loader first so the tree/background have time to mount
    // and paint before the player sees the field — same UX as level transitions.
    const startLevel = getLevel(levelId);
    setPendingLevelId(levelId);
    setTransitioning(true);
    setCollected(0);
    setFruits([]);
    setBucketFruits([]);
    caughtIdsRef.current = new Set();
    streakRef.current = 0;
    setComboCount(0);
    setWeather(null);
    setWeatherEndsAt(0);
    setCrates([]);
    setLootBursts([]);
    setBlackHoles([]);
    setExplosions([]);
    setFirePatches([]);
    setElectricPuddles([]);
    setIceCracks([]);
    setIceCube(null);
    setIceEncased(false);
    setIceTapsLeft(0);
    setFrozenUntil(0);
    setLightnings([]);
    setMeteorites([]);
    setLandedMeteorites([]);
    setStunUntil(0);
    invulnUntilRef.current = 0;
    goldenHeartValueRef.current = 0;
    setGoldenHeartValue(0);
    droppedAnyFruitRef.current = false;
    hitAnyBombRef.current = false;
    setHearts(MAX_HEARTS);
    setGameOver(false);

    const preload = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });
    Promise.all([preload(startLevel.bgImg), preload(startLevel.treeImg)]).then(() => {
      window.setTimeout(() => {
        setStarted(true);
        // Keep the loader visible long enough for the new tree to mount + paint.
        window.setTimeout(() => {
          setTransitioning(false);
          setPendingLevelId(null);
          if (startLevel.biome && !seenBiomesRef.current.has(startLevel.biome)) {
            setBiomeIntro(startLevel.biome);
            markBiomeSeen(startLevel.biome);
          }
        }, 900);
      }, 80);
    });
  }, [levelId, markBiomeSeen]);

  // ❤️ Revive: simula 2s di video pubblicità, poi +1 cuore e riprende il gioco.
  const handleRevive = useCallback(() => {
    if (isWatchingReviveAd) return;
    setIsWatchingReviveAd(true);
    if (reviveTimerRef.current) clearTimeout(reviveTimerRef.current);
    reviveTimerRef.current = window.setTimeout(() => {
      setIsWatchingReviveAd(false);
      setHearts(1);
      setGameOver(false);
    }, REVIVE_AD_MS);
  }, [isWatchingReviveAd]);

  // Restart partita corrente (stesso livello, score 0, cuori pieni).
  const handleRestartAfterGameOver = useCallback(() => {
    setIsWatchingReviveAd(false);
    if (reviveTimerRef.current) clearTimeout(reviveTimerRef.current);
    setGameOver(false);
    setHearts(MAX_HEARTS);
    setCollected(0);
    setFruits([]);
    setBucketFruits([]);
    caughtIdsRef.current = new Set();
    streakRef.current = 0;
    setComboCount(0);
    // 🔄 Cleanup completo di tutti gli ostacoli/hazard a schermo: cubi di
    // ghiaccio, fulmini, scie di fuoco, pozzanghere, meteoriti, ecc.
    setIceCube(null);
    setIceEncased(false);
    setIceTapsLeft(0);
    setIceCracks([]);
    setLightnings([]);
    setFirePatches([]);
    setElectricPuddles([]);
    setExplosions([]);
    setMeteorites([]);
    setLandedMeteorites([]);
    setFrozenUntil(0);
    setStunUntil(0);
    invulnUntilRef.current = 0;
    goldenHeartValueRef.current = 0;
    setGoldenHeartValue(0);
  }, []);

  useEffect(() => () => {
    if (reviveTimerRef.current) clearTimeout(reviveTimerRef.current);
  }, []);

  const exitToMenu = useCallback(() => {
    setStarted(false);
    setPaused(false);
    setWeather(null);
    setCrates([]);
    setLootBursts([]);
    setBlackHoles([]);
    setExplosions([]);
    setFirePatches([]);
    setElectricPuddles([]);
    setIceCracks([]);
    setFrozenUntil(0);
  }, []);

  // ============== Weather scheduler ==============
  useEffect(() => {
    if (!started) return;
    // No weather in the new biomes (volcano / tundra / space)
    if (level.biome === "space" || level.biome === "volcano" || level.biome === "tundra" || level.biome === "stormpeak") {
      if (weather) setWeather(null);
      if (weatherEndsAt) setWeatherEndsAt(0);
      return;
    }
    const id = window.setInterval(() => {
      const now = performance.now();
      if (weatherEndsAt > 0 && now >= weatherEndsAt) {
        setWeather(null);
        setWeatherEndsAt(0);
        return;
      }
      if (weatherEndsAt > 0) return;
      if (Math.random() < WEATHER_CHANCE_PER_CHECK) {
        const kind = WEATHER_KINDS[Math.floor(Math.random() * WEATHER_KINDS.length)];
        const dur =
          kind === "bomb_storm"
            ? BOMB_STORM_DURATION_MS
            : WEATHER_MIN_MS + Math.random() * (WEATHER_MAX_MS - WEATHER_MIN_MS);
        setWeather(kind);
        setWeatherEndsAt(now + dur);
        if (kind === "wind") setWindDirection(Math.random() < 0.5 ? 1 : -1);
        sfx.weather();
        // First-time intro: pause game until the player closes the modal.
        if (!seenWeathersRef.current.has(kind)) {
          setWeatherIntro(kind);
          markWeatherSeen(kind);
        }
      }
    }, WEATHER_CHECK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, weatherEndsAt, level.biome]);

  // Weather countdown display
  useEffect(() => {
    if (weatherEndsAt === 0) {
      setWeatherSecondsLeft(0);
      return;
    }
    const id = window.setInterval(() => {
      const remaining = Math.max(0, weatherEndsAt - performance.now());
      setWeatherSecondsLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [weatherEndsAt]);

  // Rain → extra auto-shake spawning
  useEffect(() => {
    if (!started || weather !== "rain") return;
    const id = window.setInterval(() => {
      spawnFruit();
    }, 700);
    return () => clearInterval(id);
  }, [started, weather, spawnFruit]);

  // ============== Bomb scheduler (canopy-area, random, ~every 3s) ==============
  // Bombs now drop from the area starting at the tree's leaves (canopy bottom)
  // so they look like they fall from / around the tree, not from the sky.
  // They are completely independent of clicks — about one every ~3 seconds
  // with random jitter, and the rate is tripled while the "Bomb Storm"
  // weather event is active. Volcano fireballs / tundra snowballs / space
  // meteorites still come from the sky via their own dedicated schedulers.
  useEffect(() => {
    if (!started) return;
    if (level.biome === "volcano" || level.biome === "stormpeak") return;
    if (level.rottenChance <= 0) return;

    let cancelled = false;
    let timeoutId: number | undefined;

    const scheduleNext = () => {
      const isStorm = weatherRef.current === "bomb_storm";
      // Bomb frequency doubled: average ~1.5s between drops (was ~3s), and
      // ~500ms during the Bomb Storm weather event (was ~1s).
      const base = isStorm ? 500 : 1500;
      const jitter = isStorm ? 250 : 750;
      const delay = Math.max(200, base + (Math.random() - 0.5) * 2 * jitter);

      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        if (pausedRef.current) {
          scheduleNext();
          return;
        }
        if (fruitsRef.current.filter((f) => f.status === "falling").length < MAX_FALLING_FRUITS) {
          const field = fieldRef.current;
          const canopy = treeRef.current?.getCanopyRect();
          if (field && canopy) {
            const rect = field.getBoundingClientRect();
            const size = level.fruitSize;
            const startXAbs = canopy.left + canopy.width * (0.1 + Math.random() * 0.8);
            // For tall trees (integrated-in-background biomes) bombs should
            // also be able to spawn from the upper part of the canopy — same
            // y-range as falling fruit — so the player has to watch the whole
            // tree, not just the lower leaves.
            // Bombs always spawn from the canopy/leaves area (never from the
            // trunk), matching where real fruit grows.
            const startYAbs = canopy.top + canopy.height * (0.1 + Math.random() * 0.7);
            const x = Math.max(8, Math.min(rect.width - size - 8, startXAbs - rect.left - size / 2));
            const startY = startYAbs - rect.top - size / 2;
            const endY = rect.height - 64;
            const fid = nextIdRef.current++;
            const slowmoActive = performance.now() < slowmoEndAt;
            const baseDuration = 1.1 + Math.random() * 0.4;
            const gravityMult = level.gravityMultiplier ?? 1;
            const duration = (slowmoActive ? baseDuration * 2 : baseDuration) * gravityMult;
            setFruits((prev) => [
              ...prev,
              {
                id: fid,
                img: level.fruitRottenImg,
                size,
                x,
                startY,
                endY,
                rotate: (Math.random() - 0.5) * 360,
                duration,
                status: "falling",
                rotten: true,
                golden: false,
                lava: false,
              },
            ]);
          }
        }
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [started, level, slowmoEndAt]);

  // ============== Loot crate scheduler ==============
  useEffect(() => {
    if (!started) return;
    // No airdrops in volcano / tundra / space biomes — keep them focused.
    if (level.biome === "volcano" || level.biome === "tundra" || level.biome === "space" || level.biome === "stormpeak") return;
    const id = window.setInterval(() => {
      if (Math.random() >= CRATE_CHANCE_PER_CHECK) return;
      const fieldRect = fieldRef.current?.getBoundingClientRect();
      if (!fieldRect) return;
      const cid = nextIdRef.current++;
      const x = 60 + Math.random() * Math.max(40, fieldRect.width - 160);
      // Roll loot — tier-based rarity (skin is the rarest)
      const roll = Math.random();
      let loot: LootDrop;
      if (roll < 0.5) {
        // Common: coins
        loot = { kind: "coins", amount: 20 + Math.floor(Math.random() * 41), tier: "common" };
      } else if (roll < 0.78) {
        // Rare: gadget
        loot = {
          kind: Math.random() < 0.5 ? "magnet" : "slowmo",
          amount: 1,
          tier: "rare",
        };
      } else if (roll < 0.97) {
        // Epic: golden fruits
        loot = {
          kind: "golden_fruits",
          amount: 1 + Math.floor(Math.random() * 3),
          tier: "epic",
        };
      } else {
        // Legendary: bucket skin (only if there's still one to unlock)
        const ALL_SKINS: BucketSkinId[] = ["gold", "cart", "teacup", "ghost"];
        const lockedSkins = ALL_SKINS.filter((s) => !ownedSkins.includes(s));
        if (lockedSkins.length > 0) {
          const skinId = lockedSkins[Math.floor(Math.random() * lockedSkins.length)];
          loot = {
            kind: "skin",
            amount: 1,
            tier: "legendary",
            skinName: t(`skin_${skinId}`),
            // store the skin id inside skinName lookup; we also need the raw id, encode in amount? cleanest: extend type
          };
          // attach id via a closure trick — use a side-channel map
          (loot as LootDrop & { skinId?: BucketSkinId }).skinId = skinId;
        } else {
          // Fallback: coins jackpot
          loot = { kind: "coins", amount: 200, tier: "legendary" };
        }
      }
      setCrates((prev) => [
        ...prev,
        {
          id: cid,
          x,
          startY: -110,
          endY: fieldRect.height - 180,
          loot,
        },
      ]);
      setTimeout(() => sfx.crateLand(), 4200);
    }, CRATE_CHECK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, ownedSkins, level.biome]);

  const handleCrateTap = useCallback(
    (id: number, loot: LootDrop, x: number, y: number) => {
      sfx.crateOpen();
      vibrate([20, 30, 60]);
      // Apply loot
      if (loot.kind === "coins") {
        addCoins(loot.amount);
      } else if (loot.kind === "magnet") {
        addGadget("magnet", loot.amount);
      } else if (loot.kind === "slowmo") {
        addGadget("slowmo", loot.amount);
      } else if (loot.kind === "golden_fruits") {
        for (let i = 0; i < loot.amount; i++) {
          setTimeout(() => spawnGoldenBonus(), i * 180);
        }
      } else if (loot.kind === "skin") {
        const skinId = (loot as LootDrop & { skinId?: BucketSkinId }).skinId;
        if (skinId) unlockSkin(skinId);
      }
      const labelMap: Record<LootKind, string> = {
        coins: t("loot_coins"),
        magnet: t("loot_magnet"),
        slowmo: t("loot_slowmo"),
        golden_fruits: t("loot_golden_fruits"),
        skin: t("loot_skin"),
      };
      const tier = loot.tier ?? "common";
      const tierLabel = t(`loot_tier_${tier}`);
      const burstId = nextIdRef.current++;
      setLootBursts((prev) => [
        ...prev,
        { id: burstId, loot, x, y, label: labelMap[loot.kind], tierLabel },
      ]);
      setCrates((prev) => prev.filter((c) => c.id !== id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addCoins, addGadget, t, unlockSkin],
  );

  const handleCrateExpire = useCallback((id: number) => {
    setCrates((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ============== Biome hazard helpers ==============
  /** Spawn a straight-falling hazard (meteorite or snowball) from the top of the field. */
  const spawnStraightHazard = useCallback(
    (kind: "meteorite" | "snowball") => {
      if (pausedRef.current) return;
      if (fruitsRef.current.filter((f) => f.status === "falling").length >= MAX_FALLING_FRUITS) return;
      const field = fieldRef.current;
      if (!field) return;
      const rect = field.getBoundingClientRect();
      // Meteorites come in 3 sizes: 60% small, 30% medium, 10% large (up to 3x).
      let size: number;
      if (kind === "meteorite") {
        const r = Math.random();
        if (r < 0.6) size = 50;          // small
        else if (r < 0.9) size = 95;     // medium
        else size = 160;                 // large (~3x)
      } else {
        size = 50;
      }
      const x = 16 + Math.random() * Math.max(40, rect.width - size - 32);
      const startY = -size - 20;
      const endY = rect.height - 64;
      const id = nextIdRef.current++;
      setFruits((prev) => [
        ...prev,
        {
          id,
          img: kind === "meteorite" ? meteoriteImg : snowballImg,
          size,
          x,
          startY,
          endY,
          rotate: 0,
          // Bigger meteorites fall a touch slower so they're still readable.
          duration:
            kind === "meteorite"
              ? (size >= 160 ? 1.4 : size >= 95 ? 1.2 : 1.0) + Math.random() * 0.3
              : 1.3 + Math.random() * 0.4,
          status: "falling",
          rotten: true,
          golden: false,
          lava: false,
          meteorite: kind === "meteorite",
          snowball: kind === "snowball",
          // Meteorites fall diagonally
          slideDx: kind === "meteorite" ? (Math.random() - 0.5) * 200 : 0,
        },
      ]);
    },
    [],
  );

  // Volcano: fireballs come from the SKY (not from the tree). Only normal
  // bombs drop from the canopy — every other hazard (fireballs, snowballs,
  // meteorites) spawns from the top of the screen.
  // NOTE: while the "fire_rain" weather event is active, this regular
  // spawner pauses so the event's grouped volleys are clearly distinct
  // from baseline volcano gameplay.
  useEffect(() => {
    if (!started || level.biome !== "volcano") return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      if (weatherRef.current === "fire_rain") return;
      if (fruitsRef.current.filter((f) => f.status === "falling").length >= MAX_FALLING_FRUITS) return;
      const field = fieldRef.current;
      if (!field) return;
      const rect = field.getBoundingClientRect();
      const size = 56;
      // Spawn from sky (top of field), full width
      const x = 16 + Math.random() * Math.max(40, rect.width - size - 32);
      const startY = -size - 20;
      const endY = rect.height - 64;
      const fid = nextIdRef.current++;
      // Mild slide so they don't all fall perfectly straight
      const slideDx = (Math.random() - 0.5) * 80;
      setFruits((prev) => [
        ...prev,
        {
          id: fid,
          img: level.fruitRottenImg,
          size,
          x,
          startY,
          endY,
          rotate: 0,
          duration: 1.2 + Math.random() * 0.3,
          status: "falling",
          rotten: true,
          lava: true,
          slideDx,
        },
      ]);
    }, 1000);
    return () => clearInterval(id);
  }, [started, level.biome, level.fruitRottenImg]);

  // Space: physical meteorites (sprite + glow, persistent obstacles).
  const landedMeteoritesRef = useRef<Array<{ id: number; x: number; w: number }>>([]);
  useEffect(() => { landedMeteoritesRef.current = landedMeteorites; }, [landedMeteorites]);
  useEffect(() => {
    if (!started || level.biome !== "space") return;
    const spawn = () => {
      if (pausedRef.current) return;
      const field = fieldRef.current;
      if (!field) return;
      const rect = field.getBoundingClientRect();
      // Try up to 6 candidate landing spots and pick the first that doesn't
      // overlap any meteorite already sitting on the floor — so they don't
      // pile up in the same column.
      const r = Math.random();
      const size = r < 0.6 ? 50 : r < 0.9 ? 90 : 140;
      const w = size * 0.8;
      const PAD = 16; // extra px gap so they're clearly separated
      let chosen: { x: number; slideDx: number } | null = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const slideDx = (Math.random() - 0.5) * 200;
        const x = 16 + Math.random() * Math.max(40, rect.width - size - 32 - Math.abs(slideDx));
        const landingCx = x + slideDx + (size - w) / 2;
        const overlaps = landedMeteoritesRef.current.some((m) =>
          landingCx < m.x + m.w + PAD && landingCx + w + PAD > m.x,
        );
        if (!overlaps) { chosen = { x, slideDx }; break; }
      }
      if (!chosen) return; // skip this tick — floor is too crowded
      const id = nextIdRef.current++;
      setMeteorites((prev) => [
        ...prev,
        {
          id,
          x: chosen.x,
          startY: -size - 20,
          endY: rect.height - 64 - size,
          size,
          slideDx: chosen.slideDx,
          fallDuration: (size >= 140 ? 1.4 : size >= 90 ? 1.2 : 1.0) + Math.random() * 0.3,
        },
      ]);
    };
    const id = window.setInterval(spawn, 1500);
    return () => clearInterval(id);
  }, [started, level.biome]);

  // Reset meteorites when leaving space
  useEffect(() => {
    if (level.biome !== "space") {
      setMeteorites([]);
      setLandedMeteorites([]);
    }
  }, [level.biome]);

  const handleMeteoriteLanded = useCallback(
    (_id: number) => {
      // ⛔ Funzione "ostacoli permanenti" temporaneamente disattivata:
      // i meteoriti spariscono dopo l'atterraggio senza bloccare il pavimento.
    },
    [],
  );

  const handleMeteoriteExpire = useCallback((id: number) => {
    setMeteorites((prev) => prev.filter((m) => m.id !== id));
    setLandedMeteorites((prev) => prev.filter((m) => m.id !== id));
  }, []);


  // Tundra: snowball hazards
  useEffect(() => {
    if (!started || level.biome !== "tundra") return;
    const id = window.setInterval(() => {
      spawnStraightHazard("snowball");
    }, 750); // slightly faster snowball cadence
    return () => clearInterval(id);
  }, [started, level.biome, spawnStraightHazard]);

  // Tundra: occasional huge ice cube — encases the bucket on contact and
  // requires the player to tap the screen rapidly to break free.
  useEffect(() => {
    if (!started || level.biome !== "tundra") return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      if (iceCube || iceEncased) return;
      if (Math.random() >= ICE_CUBE_CHANCE) return;
      const field = fieldRef.current;
      if (!field) return;
      const rect = field.getBoundingClientRect();
      const cubeSize = BUCKET_WIDTHS[equippedBucket];
      const x = 16 + Math.random() * Math.max(40, rect.width - cubeSize - 32);
      setIceCube({
        id: nextIdRef.current++,
        x,
        startY: -cubeSize - 20,
        endY: rect.height - 64 - cubeSize * 0.3,
      });
    }, ICE_CUBE_CHECK_MS);
    return () => clearInterval(id);
  }, [started, level.biome, iceCube, iceEncased, equippedBucket]);

  // While the bucket is encased, every tap on the field breaks one chunk of ice.
  const handleIceTap = useCallback(() => {
    if (!iceEncased) return;
    sfx.click();
    vibrate(8);
    setIceTapsLeft((n) => {
      const next = Math.max(0, n - 1);
      if (next === 0) {
        setIceEncased(false);
        setFrozenUntil(0);
        // 💥 Esplosione finale: spawna i frammenti di ghiaccio.
        const sid = nextIdRef.current++;
        setIceShatter({ id: sid });
        window.setTimeout(() => {
          setIceShatter((s) => (s && s.id === sid ? null : s));
        }, 700);
      }
      return next;
    });
  }, [iceEncased]);

  // Auto-thaw safety net — releases the bucket after ICE_CUBE_AUTO_THAW_MS even
  // if the player never taps.
  useEffect(() => {
    if (!iceEncased) return;
    const id = window.setTimeout(() => {
      setIceEncased(false);
      setIceTapsLeft(0);
      setFrozenUntil(0);
    }, ICE_CUBE_AUTO_THAW_MS);
    return () => clearTimeout(id);
  }, [iceEncased]);

  // Detect ice cube collision with the bucket (uses simple x overlap when the
  // cube reaches its endY position).
  useEffect(() => {
    if (!iceCube) return;
    // Cube fall duration ≈ 1.1s — at that point we check overlap with bucket.
    const t = window.setTimeout(() => {
      const innerRect = bucketRef.current?.getInnerRect();
      const fieldRect = fieldRef.current?.getBoundingClientRect();
      if (!innerRect || !fieldRect) {
        setIceCube(null);
        return;
      }
      const bucketCenterX = innerRect.left + innerRect.width / 2 - fieldRect.left;
      const cubeSize = BUCKET_WIDTHS[equippedBucket];
      const cubeCenterX = iceCube.x + cubeSize / 2;
      const overlap = Math.abs(bucketCenterX - cubeCenterX) < cubeSize * 0.55;
      if (overlap) {
        setIceEncased(true);
        setIceTapsLeft(ICE_CUBE_TAPS_REQUIRED);
        setFrozenUntil(performance.now() + ICE_CUBE_AUTO_THAW_MS);
        // ❄️ Cubo di ghiaccio: -1 cuore intero.
        applyDamage(1);
        vibrate([60, 40, 80, 40, 80]);
        sfx.rotten();
      }
      setIceCube(null);
    }, 1100);
    return () => clearTimeout(t);
  }, [iceCube, equippedBucket]);

  // Reset fire patches when leaving volcano biome
  useEffect(() => {
    if (level.biome !== "volcano") setFirePatches([]);
    setElectricPuddles([]);
  }, [level.biome]);

  // Volcano: fire patch damage — per-frame collision so even quick passes
  // still register the hit. Each patch can damage the bucket at most once
  // per ~0.4s while the bucket is overlapping it.
  const firePatchHitsRef = useRef<Map<number, number>>(new Map());
  useEffect(() => {
    if (!started || level.biome !== "volcano") return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (pausedRef.current) return;
      const innerRect = bucketRef.current?.getInnerRect();
      const fieldRect = fieldRef.current?.getBoundingClientRect();
      if (!innerRect || !fieldRect) return;
      const bxLeft = innerRect.left - fieldRect.left;
      const bxRight = innerRect.right - fieldRect.left;
      const now = performance.now();
      for (const p of firePatches) {
        // Tighten the hitbox to the inner area where flames actually render
        // (visual flames span ~12%–92% of the patch box). The bucket should
        // only take damage when it actually overlaps a flame.
        const flameLeft = p.x + p.w * 0.18;
        const flameRight = p.x + p.w * 0.82;
        if (bxRight > flameLeft && bxLeft < flameRight) {
          const last = firePatchHitsRef.current.get(p.id) ?? 0;
          // 🔥 Cooldown 1s tra ogni mezzo cuore di danno della scia di fuoco.
          if (now - last >= 1000) {
            firePatchHitsRef.current.set(p.id, now);
            applyDamage(0.5);
            const fid = nextIdRef.current++;
            const localX = (bxLeft + bxRight) / 2;
            const localY = fieldRect.height - 80;
            setFloats((fs) => [...fs, { id: fid, x: localX, y: localY, text: "-½ ❤️", color: "bad" }]);
            setTimeout(() => setFloats((fs) => fs.filter((x) => x.id !== fid)), 700);
          }
        }
      }
      // Cleanup dead entries
      const live = new Set(firePatches.map((p) => p.id));
      for (const k of firePatchHitsRef.current.keys()) {
        if (!live.has(k)) firePatchHitsRef.current.delete(k);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, level.biome, firePatches]);

  // ============== Tundra: Voragine di Ghiaccio ==============
  // Every ~10s a crack appears at a random spot on the ground, occupying ~20% of
  // field width. It first shows a "warning" state with screen shake for ~1.2s,
  // then becomes a solid floor obstacle (voragine) for 5s blocking the bucket,
  // then fades and the floor heals.
  useEffect(() => {
    // ⛔ Funzione "voragine di ghiaccio" disattivata: il pavimento polare
    // resta integro e non si rompe più in frammenti.
    return;
  }, [started, level.biome, shake]);

  // Reset ice cracks when leaving tundra
  useEffect(() => {
    if (level.biome !== "tundra") setIceCracks([]);
  }, [level.biome]);

  // ============== Stormpeak: Lightning strikes (fixed mechanic) ==============
  // Every ~1.5s, TWO lightning bolts spawn simultaneously at different x positions.
  // First a 1s warning phase (charging cloud + laser beam), then the bolt strikes
  // for ~250ms. If the bucket is under it at strike time → shield break OR -25 pts + 2s stun.
  useEffect(() => {
    if (!started || level.biome !== "stormpeak") return;
    let cancelled = false;

    const spawnPair = () => {
      if (cancelled) return;
      if (pausedRef.current) {
        window.setTimeout(spawnPair, 1000);
        return;
      }
      const field = fieldRef.current;
      if (!field) {
        window.setTimeout(spawnPair, 1000);
        return;
      }
      const rect = field.getBoundingClientRect();
      const w = 60;
      // Spawn 2 bolts at different x positions
      const positions = [
        30 + Math.random() * Math.max(40, rect.width * 0.4),
        rect.width * 0.5 + Math.random() * Math.max(40, rect.width * 0.4),
      ];
      positions.forEach((x) => {
        const id = nextIdRef.current++;
        setLightnings((prev) => [...prev, { id, x, w, phase: "warning" }]);
        // After 1s → strike phase + hit check
        window.setTimeout(() => {
          if (cancelled) return;
          const innerRect = bucketRef.current?.getInnerRect();
          const fieldRect = fieldRef.current?.getBoundingClientRect();
          let hit = false;
          if (innerRect && fieldRect) {
            const bxLeft = innerRect.left - fieldRect.left;
            const bxRight = innerRect.right - fieldRect.left;
            if (x >= bxLeft - 6 && x <= bxRight + 6) hit = true;
          }
          setLightnings((prev) => prev.map((l) => (l.id === id ? { ...l, phase: "strike" } : l)));
          // Spawn an electric puddle at the strike point — damages + stuns
          // the bucket if it walks into it. Lasts ~3s.
          {
           const pid = nextIdRef.current++;
            const pw = 80 + Math.random() * 30;
            const bornAt = performance.now();
            setElectricPuddles((prev) => [...prev, { id: pid, x: x - pw / 2, w: pw, bornAt }]);
            window.setTimeout(() => {
              setElectricPuddles((prev) => prev.filter((p) => p.id !== pid));
            }, 500);
          }
          if (hit) {
            if (shieldActiveRef.current) {
              shieldActiveRef.current = false;
              setShieldActive(false);
              setShieldBreakKey((k) => k + 1);
              sfx.click();
              vibrate([20, 20, 20]);
            } else {
              // ⚡ Fulmine diretto: -1 cuore intero.
              applyDamage(1);
              setStunUntil(performance.now() + 2000);
              vibrate([40, 30, 60]);
              sfx.rotten();
            }
          }
          window.setTimeout(() => {
            setLightnings((prev) => prev.filter((l) => l.id === id ? false : true));
          }, 350);
        }, 1000);
      });
      // Schedule next pair in ~1.5s
      window.setTimeout(spawnPair, 1300 + Math.random() * 400);
    };
    const initialDelay = window.setTimeout(spawnPair, 2000);
    return () => {
      cancelled = true;
      clearTimeout(initialDelay);
    };
  }, [started, level.biome]);

  // Reset lightnings + stun when leaving stormpeak
  useEffect(() => {
    if (level.biome !== "stormpeak") {
      setLightnings([]);
      setStunUntil(0);
      setElectricPuddles([]);
    }
  }, [level.biome]);

  // Stormpeak: electric-puddle damage — per-frame collision (same pattern as
  // volcano fire patches). At most one hit per puddle every ~500ms.
  const electricPuddleHitsRef = useRef<Map<number, number>>(new Map());
  useEffect(() => {
    if (!started || level.biome !== "stormpeak") return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (pausedRef.current) return;
      const innerRect = bucketRef.current?.getInnerRect();
      const fieldRect = fieldRef.current?.getBoundingClientRect();
      if (!innerRect || !fieldRect) return;
      const bxLeft = innerRect.left - fieldRect.left;
      const bxRight = innerRect.right - fieldRect.left;
      const now = performance.now();
      for (const p of electricPuddles) {
        // Tighten hitbox to the visible glow core (~15%–85% of the puddle box).
        const coreLeft = p.x + p.w * 0.15;
        const coreRight = p.x + p.w * 0.85;
        if (bxRight > coreLeft && bxLeft < coreRight) {
          const last = electricPuddleHitsRef.current.get(p.id) ?? 0;
          if (now - last >= 300) {
            electricPuddleHitsRef.current.set(p.id, now);
            if (shieldActiveRef.current) {
              shieldActiveRef.current = false;
              setShieldActive(false);
              setShieldBreakKey((k) => k + 1);
              sfx.click();
              vibrate([20, 20, 20]);
            } else {
              // ⚡ Pozzanghera elettrica a terra: -0.5 cuori.
              applyDamage(0.5);
              setStunUntil(performance.now() + 500);
              vibrate([20, 15, 20]);
              sfx.rotten();
              const fid = nextIdRef.current++;
              const localX = (bxLeft + bxRight) / 2;
              const localY = fieldRect.height - 80;
              setFloats((fs) => [...fs, { id: fid, x: localX, y: localY, text: "-½ ❤️", color: "bad" }]);
              setTimeout(() => setFloats((fs) => fs.filter((x) => x.id !== fid)), 700);
            }
          }
        }
      }
      const live = new Set(electricPuddles.map((p) => p.id));
      for (const k of electricPuddleHitsRef.current.keys()) {
        if (!live.has(k)) electricPuddleHitsRef.current.delete(k);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, level.biome, electricPuddles]);

  // ============== Volcano: Fire Rain weather event ==============
  // Periodic event: every 1–5 minutes a "Fire Rain" event triggers. Shows an
  // alert modal (pauses the game), then for 10s spawns volleys of THREE fireballs
  // arranged like an inverted triangle (centre lower, two sides higher).
  useEffect(() => {
    if (!started || level.biome !== "volcano") return;
    let cancelled = false;
    let timeoutId: number | undefined;

    const scheduleNext = () => {
      const delay = FIRE_RAIN_MIN_GAP_MS + Math.random() * (FIRE_RAIN_MAX_GAP_MS - FIRE_RAIN_MIN_GAP_MS);
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        if (pausedRef.current) {
          // Try again shortly if game is paused.
          timeoutId = window.setTimeout(scheduleNext, 5000);
          return;
        }
        // Trigger event — show intro modal first; the actual fire_rain weather
        // (and its duration timer) will start ONLY after the player closes the
        // modal. This prevents the event from "ending" while the alert is up.
        setWeatherIntro("fire_rain");
        sfx.weather();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [started, level.biome]);

  // Auto-clear the fire_rain weather when its duration ends (the main weather
  // scheduler is disabled on volcano, so this would otherwise stick forever).
  useEffect(() => {
    if (weather !== "fire_rain") return;
    if (weatherEndsAt <= 0) return;
    const remain = Math.max(0, weatherEndsAt - performance.now());
    const id = window.setTimeout(() => {
      setWeather(null);
      setWeatherEndsAt(0);
    }, remain);
    return () => clearTimeout(id);
  }, [weather, weatherEndsAt]);
  useEffect(() => {
    if (!started || level.biome !== "volcano") return;
    if (weather !== "fire_rain") return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      if (fruitsRef.current.filter((f) => f.status === "falling").length >= MAX_FALLING_FRUITS - 3) return;
      const field = fieldRef.current;
      if (!field) return;
      const rect = field.getBoundingClientRect();
      const size = 56;
      // Wider spread so the three fireballs are clearly separated and
      // readable as a "volley" rather than overlapping into a single blob.
      const spread = 140;
      // Centre x of the triangle, kept inside the field
      const cx = 16 + spread + Math.random() * Math.max(40, rect.width - size - 32 - spread * 2);
      // Stagger entry: centre fireball enters first (lowest startY), the two
      // sides enter visibly later from higher up.
      const startYCentre = -size - 10;
      const startYSides = -size - 140;
      const endY = rect.height - 64;
      const positions: Array<{ x: number; startY: number; duration: number }> = [
        { x: cx - spread, startY: startYSides,  duration: 1.4 + Math.random() * 0.2 },
        { x: cx,          startY: startYCentre, duration: 1.1 + Math.random() * 0.2 },
        { x: cx + spread, startY: startYSides,  duration: 1.4 + Math.random() * 0.2 },
      ];
      const newFireballs: FruitState[] = positions.map((p) => {
        const fid = nextIdRef.current++;
        const x = Math.max(8, Math.min(rect.width - size - 8, p.x));
        return {
          id: fid,
          img: level.fruitRottenImg,
          size,
          x,
          startY: p.startY,
          endY,
          rotate: 0,
          duration: p.duration,
          status: "falling",
          rotten: true,
          lava: true,
          slideDx: 0,
        };
      });
      setFruits((prev) => [...prev, ...newFireballs]);
    }, FIRE_RAIN_VOLLEY_MS);
    return () => clearInterval(id);
  }, [started, level.biome, weather, level.fruitRottenImg]);


  // Space: teleport portals — every ~7s a pair of portals appears.
  // Items that fall through the entry portal get teleported to the exit portal
  // and resume falling in the direction the exit is angled.
  useEffect(() => {
    if (!started || level.biome !== "space") {
      if (portals.length > 0) setPortals([]);
      return;
    }
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      if (Math.random() >= PORTAL_CHANCE) return;
      const field = fieldRef.current;
      if (!field) return;
      const rect = field.getBoundingClientRect();
      if (portals.length >= 1) return; // at most one pair at a time

      const margin = 70;
      const portalW = 120;
      // Entry: horizontal, in the upper third so it can intercept fruit early.
      const entryX = margin + Math.random() * Math.max(40, rect.width - margin * 2);
      const entryY = rect.height * (0.18 + Math.random() * 0.18);

      // Exit: somewhere lower-mid, far enough from the entry. Random angle.
      let exitX = margin + Math.random() * Math.max(40, rect.width - margin * 2);
      let exitY = rect.height * (0.4 + Math.random() * 0.3);
      // Push exit horizontally away from entry to avoid visual overlap.
      if (Math.abs(exitX - entryX) < 140) {
        exitX = entryX < rect.width / 2 ? entryX + 180 : entryX - 180;
        exitX = Math.max(margin, Math.min(rect.width - margin, exitX));
      }
      // Random angle in degrees: horizontal (0), vertical (90), or oblique (-60..60 ex 0)
      const angles = [0, 90, -45, 45, -30, 30, -60, 60];
      const exitAngle = angles[Math.floor(Math.random() * angles.length)];

      const pid = nextIdRef.current++;
      setPortals((prev) => [
        ...prev,
        {
          id: pid,
          bornAt: performance.now(),
          entry: { x: entryX, y: entryY, w: portalW, angle: 0 },
          exit: { x: exitX, y: exitY, w: portalW, angle: exitAngle },
        },
      ]);
    }, PORTAL_CHECK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, level.biome, portals.length]);

  // Portal expiry + per-frame teleport detection
  const teleportedFruitIdsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!started || level.biome !== "space") return;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      // Expire portals
      setPortals((prev) => prev.filter((p) => now - p.bornAt < PORTAL_LIFE_MS));
      const activePortals = portals;
      if (activePortals.length > 0 && fruitsRef.current.some((f) => f.status === "falling")) {
        const fieldRect = fieldRef.current?.getBoundingClientRect();
        if (fieldRect) {
          const fieldH = fieldRect.height;
          // Collect teleports to apply at the end (one fruit removed + one added per teleport)
          const teleports: Array<{ removeId: number; newFruit: FruitState }> = [];
          for (const f of fruitsRef.current) {
            if (f.status !== "falling") continue;
            if (teleportedFruitIdsRef.current.has(f.id)) continue;
            const el = document.getElementById(`fruit-${f.id}`);
            if (!el) continue;
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2 - fieldRect.left;
            const cy = r.top + r.height / 2 - fieldRect.top;
            for (const portal of activePortals) {
              const dx = portal.entry.x - cx;
              const dy = portal.entry.y - cy;
              if (Math.abs(dx) < portal.entry.w / 2 && Math.abs(dy) < PORTAL_HIT_RADIUS) {
                teleportedFruitIdsRef.current.add(f.id);
                // Compute new fall path from exit position with exit angle.
                // Angle 0 = straight down, +/- = sideways drift while falling.
                const angleRad = (portal.exit.angle * Math.PI) / 180;
                const newStartY = portal.exit.y;
                const endY = fieldH - 64;
                const fallDist = Math.max(40, endY - newStartY);
                // Horizontal drift over the fall (slideDx). Bigger angle = bigger drift.
                const rawDrift = Math.tan(angleRad) * fallDist;
                const newX = Math.max(8, Math.min(fieldRect.width - f.size - 8, portal.exit.x - f.size / 2));
                // Clamp the drift so the fruit's landing X stays fully inside
                // the play field (no escapes off-screen via the portal).
                const minDrift = 8 - newX;
                const maxDrift = (fieldRect.width - f.size - 8) - newX;
                const drift = Math.max(minDrift, Math.min(maxDrift, rawDrift));
                // Post-portal fall always uses NORMAL gravity (no slowmo, no
                // gravity multiplier). The meteorite/fruit drops at the same
                // speed regardless of the biome's low-gravity setting.
                const newDuration = 1.0 + Math.random() * 0.4;
                const newId = nextIdRef.current++;
                teleports.push({
                  removeId: f.id,
                  newFruit: {
                    ...f,
                    id: newId,
                    x: newX,
                    startY: newStartY,
                    endY,
                    duration: newDuration,
                    rotate: f.rotate,
                    status: "falling",
                    slideDx: drift,
                  },
                });
                break;
              }
            }
          }
          if (teleports.length > 0) {
            setFruits((prev) => {
              const removeIds = new Set(teleports.map((t) => t.removeId));
              return [...prev.filter((f) => !removeIds.has(f.id)), ...teleports.map((t) => t.newFruit)];
            });
            sfx.click();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, level.biome, portals, level.gravityMultiplier, slowmoEndAt]);

  // Clear teleport tracker when leaving space biome
  useEffect(() => {
    if (level.biome !== "space") teleportedFruitIdsRef.current.clear();
  }, [level.biome]);

  // Spawn one bonus golden fruit (used by crate loot)
  const spawnGoldenBonus = useCallback(() => {
    const field = fieldRef.current;
    const canopy = treeRef.current?.getCanopyRect();
    if (!field || !canopy) return;
    const rect = field.getBoundingClientRect();
    const startXAbs = canopy.left + canopy.width * (0.15 + Math.random() * 0.7);
    const startYAbs = canopy.top + canopy.height * (0.4 + Math.random() * 0.5);
    const startX = startXAbs - rect.left - level.fruitSize / 2;
    const startY = startYAbs - rect.top - level.fruitSize / 2;
    const endY = rect.height - 64;
    const id = nextIdRef.current++;
    setFruits((prev) => [
      ...prev,
      {
        id,
        img: level.fruitGoldImg,
        size: level.fruitSize + 8,
        x: Math.max(8, Math.min(rect.width - level.fruitSize - 8, startX)),
        startY,
        endY,
        rotate: (Math.random() - 0.5) * 360,
        duration: 1.4 + Math.random() * 0.4,
        status: "falling",
        rotten: false,
        golden: true,
      },
    ]);
  }, [level]);

  const removeLootBurst = useCallback((id: number) => {
    setLootBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const isFinal = levelId >= LEVELS.length;
  const nextLevel = isFinal ? null : getLevel(levelId + 1);
  const magnetCount = inventory.magnet ?? 0;
  const slowmoCount = inventory.slowmo ?? 0;
  const largeBucketCount = inventory.large_bucket ?? 0;
  const largeBucketActive = largeBucketRemainingMs > 0;
  const slowmoActive = slowmoRemaining > 0;

  // Anti-misclick: close buttons on these modals show a countdown via CountdownButton.

  return (
    <>
      <AchievementWatcher />

      <motion.div
        ref={fieldRef}
        animate={fieldControls}
        className="game-shake-root relative h-screen w-screen overflow-hidden touch-none"
        style={{
          backgroundImage: level.fruitKey === "banana" ? undefined : `url(${level.bgImg})`,
          backgroundColor: level.fruitKey === "banana" ? "#0a1a12" : undefined,
          backgroundSize:
            level.biome === "stormpeak" ? "auto 115%" : "cover",
          backgroundPosition:
            level.biome === "stormpeak"
              ? "center bottom"
              : level.integratedTreeInBackground
              ? "center center"
              : "center bottom",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.18) 100%)",
          }}
        />

        {/* Ground blend: stormpeak (rocky/wet) and space (alien crust) — keeps
            the bucket from looking like it floats above the artwork. */}
        {level.biome === "stormpeak" && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1]"
            style={{
              height: 110,
              background:
                "linear-gradient(to top, rgba(28,32,46,0.92) 0%, rgba(40,48,68,0.78) 35%, rgba(50,60,82,0.45) 70%, transparent 100%)",
            }}
          />
        )}
        {level.biome === "space" && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1]"
            style={{
              height: 120,
              background:
                "linear-gradient(to top, rgba(20,10,40,0.95) 0%, rgba(50,28,90,0.7) 40%, rgba(80,40,140,0.32) 75%, transparent 100%)",
            }}
          />
        )}
        {/* Tundra: snow/ice floor strip — sits BEHIND the chasms so the holes
            look carved into the floor itself (not pasted on top of the bg). */}
        {level.biome === "tundra" && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[2]"
            style={{
              height: 110,
              // 🧊 Pavimento POLARE uniforme: solo ghiaccio liscio, niente neve.
              background:
                "linear-gradient(to top, #cfe9f8 0%, #b9def0 45%, rgba(185,222,240,0.55) 75%, transparent 100%)",
              boxShadow:
                "inset 0 8px 16px rgba(255,255,255,0.55), inset 0 -2px 8px rgba(80,140,180,0.3)",
            }}
          />
        )}

        {/* Dark mode = "sunset" sky tint to lower screen brightness */}
        {theme === "dark" && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(40,20,60,0.55) 0%, rgba(120,50,30,0.32) 35%, rgba(20,10,30,0.25) 70%, rgba(0,0,0,0.35) 100%)",
              mixBlendMode: "multiply",
            }}
          />
        )}

        {/* 🍌 Banana biome — high-end parallax / vignette / particles */}
        {started && (
          <BananaBiomeLayer
            active={level.fruitKey === "banana"}
            bgImg={level.bgImg}
            fieldRef={fieldRef}
            bucketRef={bucketRef}
            fruits={fruits}
          />
        )}
        {/* Innovative biome overlay (volcano / tundra / space) */}
        {started && <BiomeOverlay biome={level.biome} />}
        {/* 🌋 Pioggia di cenere — bioma vulcano */}
        {started && <AshRain active={level.biome === "volcano"} />}
        {/* 🧊 Gelo sullo schermo — bioma polare */}
        {started && (
          <FrostOverlay
            active={level.biome === "tundra"}
            paused={paused || anyModalOpen}
          />
        )}
        {/* Slow-motion blue tint overlay */}
        <AnimatePresence>
          {slowmoActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-20"
              style={{
                background: "radial-gradient(ellipse at center, rgba(100,180,255,0.15) 0%, rgba(60,120,200,0.25) 100%)",
                mixBlendMode: "overlay",
              }}
            />
          )}
        </AnimatePresence>

        {/* Red flash overlay — meteorite direct hit */}
        <AnimatePresence>
          {redFlash && (
            <motion.div
              key="red-flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none absolute inset-0 z-40"
              style={{ background: "rgba(255,20,20,0.45)" }}
            />
          )}
        </AnimatePresence>

        {started && (
          <>
            <HUD
              level={levelId}
              fruitImg={level.fruitImg}
              fruitName={fruitName}
              collected={collected}
              target={level.target}
              coins={coins}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenShop={() => setShopOpen(true)}
              onOpenMap={() => setMapOpen(true)}
              onOpenAchievements={() => setAchievementsOpen(true)}
              onOpenQuests={() => setQuestsOpen(true)}
              onPause={() => setPaused(true)}
            />

            <HealthBar hearts={hearts} max={MAX_HEARTS} goldenHeart={goldenHeartValue} />

            <ActiveGadgetsBadge
              magnetRemainingMs={magnetRemaining}
              slowmoRemainingMs={slowmoRemaining}
              largeBucketRemainingMs={largeBucketRemainingMs}
            />

            {/* Always render the tree so its image starts loading behind the
                level loader; once the loader fades out the tree is fully ready
                and there's no visible "pop in". */}
            <FruitTree
              ref={treeRef}
              onClick={handleTreeClick}
              imgSrc={level.treeImg}
              onAutoShakeTick={spawnFruit}
              hiddenVisual={Boolean(level.integratedTreeInBackground)}
              heightClass={
                // Per-level tree sizing
                level.fruitKey === "banana"
                  ? "w-[82vw] sm:w-[62vw] md:w-[48vw]"
                  : level.fruitKey === "coconut"
                    ? "w-[140vw] sm:w-[108vw] md:w-[84vw]"
                    : level.fruitKey === "apple"
                      ? "w-[135vw] sm:w-[105vw] md:w-[82vw]"
                      : level.fruitKey === "cherry"
                        ? "w-[135vw] sm:w-[105vw] md:w-[82vw]"
                        : level.fruitKey === "magma"
                          ? "w-[125vw] sm:w-[100vw] md:w-[80vw] max-h-[96vh]"
                          : level.fruitKey === "frostberry"
                            ? "w-[108vw] sm:w-[86vw] md:w-[68vw] max-h-[92vh]"
                            : level.fruitKey === "starberry"
                              ? "w-[120vw] sm:w-[98vw] md:w-[78vw] max-h-[96vh]"
                              : undefined
              }
            />
            <AnimatePresence>
              {fruits.map((f) => (
                <FallingFruit
                  key={f.id}
                  fruit={f}
                  onLanded={handleFruitLanded}
                  onComplete={handleFruitComplete}
                  paused={anyModalOpen || docHidden}
                />
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {bursts.map((b) => (
                <GoldenBurst key={b.id} x={b.x} y={b.y} />
              ))}
            </AnimatePresence>

            {/* Shockwave gadget burst — clears all bombs with an expanding ring */}
            <AnimatePresence>
              {shockwaveBursts.map((b) => (
                <motion.div
                  key={b.id}
                  className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Bright white flash */}
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: "rgba(255,255,255,0.55)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.7, 0] }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  {/* Expanding shock rings */}
                  {[0, 0.12, 0.24].map((delay, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: "9999px",
                        border: "6px solid rgba(120,200,255,0.95)",
                        boxShadow:
                          "0 0 50px rgba(120,200,255,0.95), inset 0 0 30px rgba(255,255,255,0.85)",
                      }}
                      initial={{ scale: 0.2, opacity: 1 }}
                      animate={{ scale: 18, opacity: 0 }}
                      transition={{ duration: 0.85, delay, ease: "easeOut" }}
                    />
                  ))}
                  {/* Sparkle particles radiating outward */}
                  {Array.from({ length: 16 }).map((_, i) => {
                    const angle = (i / 16) * Math.PI * 2;
                    const dx = Math.cos(angle) * 320;
                    const dy = Math.sin(angle) * 320;
                    return (
                      <motion.span
                        key={`s-${i}`}
                        className="absolute"
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "9999px",
                          background:
                            "radial-gradient(circle, #ffffff 0%, #b3e0ff 50%, transparent 100%)",
                          boxShadow: "0 0 14px rgba(180,220,255,0.95)",
                        }}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1.4 }}
                        animate={{ x: dx, y: dy, opacity: 0, scale: 0.4 }}
                        transition={{ duration: 0.75, ease: "easeOut" }}
                      />
                    );
                  })}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loot crates */}
            <AnimatePresence>
              {crates.map((c) => (
                <LootCrate
                  key={c.id}
                  crate={c}
                  onTap={handleCrateTap}
                  onExpire={handleCrateExpire}
                />
              ))}
            </AnimatePresence>

            {/* Loot bursts */}
            <AnimatePresence>
              {lootBursts.map((b) => (
                <LootBurst
                  key={b.id}
                  loot={b.loot}
                  x={b.x}
                  y={b.y}
                  label={b.label}
                  tierLabel={b.tierLabel}
                  closeLabel={t("close")}
                  onDone={() => removeLootBurst(b.id)}
                />
              ))}
            </AnimatePresence>



            {/* Weather visual overlay */}
            <WeatherEvent kind={weather} windDirection={windDirection} />

            {/* Weather banner with countdown */}
            <WeatherBanner
              kind={weather}
              remainingSeconds={weatherSecondsLeft}
              label={weather ? t(`weather_${weather}`) : ""}
            />

            <AnimatePresence>
              {floats.map((f) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 0, scale: 0.4 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [0, -18, -42, -60],
                    scale: [0.4, 1.5, 1.2, 1],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.85, ease: "easeOut", times: [0, 0.25, 0.7, 1] }}
                  className="pointer-events-none absolute z-30 font-display text-2xl font-extrabold"
                  style={{
                    left: f.x,
                    top: f.y,
                    color: f.color === "good" ? "white" : "hsl(10 80% 50%)",
                    WebkitTextStroke: "1.5px rgba(0,0,0,0.8)",
                  }}
                >
                  {f.text}
                </motion.div>
              ))}
            </AnimatePresence>

            <ComboToast show={showCombo} count={comboCount} />

            {/* Gadgets are accessed from the SHOP only — no on-screen buttons. */}



            <Bucket
              ref={bucketRef}
              containerRef={fieldRef}
              fruits={bucketFruits}
              width={bucketWidth}
              bucketId={equippedBucket}
              skin={equippedSkin}
              frozen={frozenNow}
              locked={iceEncased}
              stunned={stunNow}
              electricStun={stunNow}
              shielded={shieldActive}
              shieldBreakKey={shieldBreakKey}
              obstacles={[
                ...iceCracks.filter((c) => c.phase === "broken" || c.phase === "healing").map((c) => ({ x: c.x, w: c.w })),
                ...landedMeteorites.map((m) => ({ x: m.x, w: m.w })),
              ]}
            />

            {/* Space: physical CSS meteorites */}
            {meteorites.map((m) => (
              <MeteoriteHazard
                key={m.id}
                meteor={m}
                paused={anyModalOpen || docHidden}
                onLanded={handleMeteoriteLanded}
                onExpire={handleMeteoriteExpire}
              />
            ))}

            {/* 🕯️ Cimitero delle Ombre — luce dinamica + Occhio + Mietitore + Mani Zombie */}
            {level.biome === "shadowcemetery" && (
              <ShadowCemeteryLayer
                active={true}
                paused={anyModalOpen || docHidden}
                fieldRef={fieldRef}
                bucketRef={bucketRef}
                bucketWidth={bucketWidth}
                fruits={fruits}
                onFruitDestroyed={(id) => {
                  setFruits((prev) => prev.filter((f) => f.id !== id));
                  // grey smoke puff at last known position
                  const f = fruits.find((x) => x.id === id);
                  if (f) {
                    const burstId = nextIdRef.current++;
                    setBursts((p) => [...p, { id: burstId, x: f.x + f.size / 2, y: 200 }]);
                    setTimeout(() => setBursts((p) => p.filter((b) => b.id !== burstId)), 700);
                  }
                }}
                onReaperHit={() => applyDamage(1)}
                onZombieGrab={() => setFrozenUntil(performance.now() + 2500)}
              />
            )}

            {/* Stormpeak: lightning strikes (warning + bolt) */}
            {lightnings.map((l) => {
              const fieldH = fieldRef.current?.getBoundingClientRect().height ?? 600;
              return <LightningStrike key={l.id} strike={l} fieldHeight={fieldH} />;
            })}

            {/* Stormpeak: electric puddles left after a strike — damage if touched */}
            <AnimatePresence>
              {electricPuddles.map((p) => (
                <motion.div
                  key={p.id}
                  className="pointer-events-none absolute z-[24]"
                  style={{ left: p.x, bottom: 4, width: p.w, height: 26 }}
                  initial={{ opacity: 0, scaleY: 0.4 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Glowing electric pool base */}
                  <motion.div
                    className="absolute inset-x-0 bottom-0"
                    style={{
                      height: 14,
                      borderRadius: "9999px",
                      background:
                        "radial-gradient(ellipse at 50% 100%, rgba(180,220,255,0.95) 0%, rgba(80,160,255,0.7) 35%, rgba(40,100,220,0.4) 70%, transparent 100%)",
                      filter: "blur(2px)",
                      mixBlendMode: "screen",
                    }}
                    animate={{ opacity: [0.7, 1, 0.75, 1, 0.7] }}
                    transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Crackling arcs jumping above the puddle */}
                  {Array.from({ length: 4 }).map((_, i) => {
                    const leftPct = 12 + i * 22;
                    const h = 12 + (i % 3) * 6;
                    return (
                      <motion.div
                        key={i}
                        className="absolute"
                        style={{
                          left: `${leftPct}%`,
                          bottom: 6,
                          width: 2,
                          height: h,
                          background:
                            "linear-gradient(to top, rgba(255,255,255,0.95), rgba(140,200,255,0.6), transparent)",
                          boxShadow: "0 0 6px rgba(140,200,255,0.95), 0 0 12px rgba(80,160,255,0.7)",
                          borderRadius: 2,
                        }}
                        animate={{
                          opacity: [0, 1, 0, 1, 0],
                          scaleY: [0.4, 1.1, 0.6, 1, 0.4],
                        }}
                        transition={{
                          duration: 0.35 + (i % 3) * 0.08,
                          delay: i * 0.05,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    );
                  })}
                  {/* Tiny sparks */}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.span
                      key={`sp-${i}`}
                      className="absolute rounded-full bg-white"
                      style={{
                        left: `${10 + i * 14}%`,
                        bottom: 4 + (i % 3) * 4,
                        width: 2,
                        height: 2,
                        boxShadow: "0 0 4px rgba(180,220,255,0.95)",
                      }}
                      animate={{ opacity: [0, 1, 0], y: [0, -6, -12] }}
                      transition={{
                        duration: 0.5,
                        delay: (i * 0.1) % 0.6,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Volcano: fire patches on the ground (impact + brief flames) */}
            <AnimatePresence>
              {firePatches.map((p) => (
                <motion.div
                  key={p.id}
                  className="pointer-events-none absolute z-[24]"
                  style={{ left: p.x, bottom: 4, width: p.w, height: 22 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Initial impact flash — scorch ring expanding once */}
                  <motion.div
                    className="absolute"
                    style={{
                      left: "-15%",
                      right: "-15%",
                      bottom: -6,
                      height: 18,
                      borderRadius: "9999px",
                      background:
                        "radial-gradient(ellipse at 50% 70%, rgba(255,240,180,0.95) 0%, rgba(255,160,40,0.7) 35%, rgba(255,80,20,0.35) 70%, transparent 100%)",
                      filter: "blur(3px)",
                      mixBlendMode: "screen",
                    }}
                    initial={{ scale: 0.4, opacity: 1 }}
                    animate={{ scale: [0.4, 1.4, 1], opacity: [1, 0.8, 0] }}
                    transition={{ duration: 0.45, ease: "easeOut", times: [0, 0.5, 1] }}
                  />
                  {/* Scorch mark — dark patch under the flames */}
                  <div
                    className="absolute inset-x-0 bottom-0"
                    style={{
                      height: 8,
                      background:
                        "radial-gradient(ellipse at 50% 100%, rgba(20,5,0,0.7) 0%, rgba(40,10,0,0.4) 60%, transparent 100%)",
                      borderRadius: "9999px",
                      filter: "blur(2px)",
                    }}
                  />
                  {/* Low realistic flames — a few flickering tongues */}
                  {Array.from({ length: 5 }).map((_, i) => {
                    const leftPct = 12 + i * 18;
                    const w = 8 + (i % 3) * 3;
                    const h = 14 + (i % 3) * 4;
                    const delay = i * 0.05;
                    return (
                      <motion.div
                        key={i}
                        className="absolute"
                        style={{
                          left: `${leftPct}%`,
                          bottom: 2,
                          width: w,
                          height: h,
                          background:
                            "radial-gradient(ellipse at 50% 90%, rgba(255,245,200,0.95) 0%, rgba(255,180,60,0.85) 35%, rgba(255,90,20,0.7) 65%, rgba(160,30,10,0.3) 90%, transparent 100%)",
                          borderRadius: "50% 50% 45% 45% / 70% 70% 30% 30%",
                          filter: "blur(0.8px)",
                          mixBlendMode: "screen",
                          transformOrigin: "50% 100%",
                        }}
                        animate={{
                          scaleY: [0.6, 1.1, 0.8, 1, 0.6],
                          scaleX: [1, 0.85, 1.1, 0.95, 1],
                          opacity: [0.7, 1, 0.85, 1, 0.6],
                        }}
                        transition={{
                          duration: 0.5 + (i % 3) * 0.1,
                          delay,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    );
                  })}
                  {/* Soft warm glow on the ground */}
                  <motion.div
                    className="absolute inset-x-0 bottom-0"
                    style={{
                      height: 14,
                      background:
                        "radial-gradient(ellipse at 50% 100%, rgba(255,140,40,0.55) 0%, rgba(255,90,20,0.25) 50%, transparent 100%)",
                      filter: "blur(3px)",
                    }}
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Tundra: ice-floor cracks (warning → solid obstacle → heal) */}
            <AnimatePresence>
              {iceCracks.map((c) => {
                // Deterministic zig-zag polygon for this crack id (so it doesn't
                // jitter between renders but each crack still feels unique).
                const seed = c.id;
                const rand = (i: number) => {
                  const x = Math.sin(seed * 9301 + i * 49297) * 233280;
                  return x - Math.floor(x);
                };
                const topPts: string[] = [];
                const botPts: string[] = [];
                const STEPS = 9;
                for (let i = 0; i <= STEPS; i++) {
                  const px = (i / STEPS) * 100;
                  const jitterTop = 6 + rand(i) * 14;        // 6%–20%
                  const jitterBot = 82 + rand(i + 50) * 14;  // 82%–96%
                  topPts.push(`${px.toFixed(2)}% ${jitterTop.toFixed(2)}%`);
                  botPts.unshift(`${px.toFixed(2)}% ${jitterBot.toFixed(2)}%`);
                }
                const chasmClip = `polygon(${[...topPts, ...botPts].join(", ")})`;
                // Slim zig-zag for the warning crack line
                const lineTop: string[] = [];
                const lineBot: string[] = [];
                for (let i = 0; i <= STEPS; i++) {
                  const px = (i / STEPS) * 100;
                  const j = 46 + rand(i + 7) * 8;
                  lineTop.push(`${px.toFixed(2)}% ${(j - 1.2).toFixed(2)}%`);
                  lineBot.unshift(`${px.toFixed(2)}% ${(j + 1.2).toFixed(2)}%`);
                }
                const lineClip = `polygon(${[...lineTop, ...lineBot].join(", ")})`;

                return (
                  <motion.div
                    key={c.id}
                    className="pointer-events-none absolute z-[24]"
                    style={{ left: c.x, bottom: 0, width: c.w, height: 110 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: c.phase === "broken" ? 0.3 : 0.15 }}
                  >
                    {c.phase === "warning" ? (
                      /* Premium ice-cracking warning: frosty shockwave + a sharp
                         white zig-zag line scribes itself across the floor and
                         then "opens" wider just before the chasm appears. */
                      <div className="relative h-full w-full">
                        {/* Frost shockwave */}
                        <motion.div
                          className="absolute"
                          style={{
                            left: "50%",
                            bottom: 0,
                            transform: "translateX(-50%)",
                            width: "75%",
                            height: "180%",
                            borderRadius: "9999px",
                            background:
                              "radial-gradient(ellipse at 50% 50%, rgba(220,240,255,0.85) 0%, rgba(140,210,255,0.5) 40%, transparent 70%)",
                            filter: "blur(4px)",
                            mixBlendMode: "screen",
                          }}
                          initial={{ scale: 0.2, opacity: 0 }}
                          animate={{ scale: [0.2, 1.2, 1.4], opacity: [0, 0.9, 0] }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                        {/* Sharp zig-zag crack line that grows and then widens */}
                        <motion.div
                          className="absolute left-0 right-0"
                          style={{
                            bottom: 35,
                            height: 50,
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(200,235,255,0.95) 50%, rgba(120,200,250,0.9) 100%)",
                            clipPath: lineClip,
                            WebkitClipPath: lineClip,
                            boxShadow: "0 0 8px rgba(180,230,255,0.9)",
                            transformOrigin: "left center",
                          }}
                          initial={{ scaleX: 0, scaleY: 1 }}
                          animate={{ scaleX: [0, 1, 1], scaleY: [1, 1, 2.4] }}
                          transition={{ duration: 0.6, ease: "easeOut", times: [0, 0.55, 1] }}
                        />
                        {/* Tiny ice chips popping up */}
                        {Array.from({ length: 8 }).map((_, i) => {
                          const lx = 12 + (i * 11) % 80;
                          return (
                            <motion.span
                              key={i}
                              className="absolute rounded-sm bg-white/95"
                              style={{
                                left: `${lx}%`,
                                bottom: 35,
                                width: 4 + (i % 3) * 2,
                                height: 4 + (i % 3) * 2,
                                boxShadow: "0 0 4px rgba(180,220,255,0.9)",
                              }}
                              initial={{ y: 0, opacity: 0, scale: 0.5 }}
                              animate={{ y: -28 - (i % 3) * 10, opacity: [0, 1, 0], scale: [0.5, 1, 0.7] }}
                              transition={{ duration: 0.6, delay: i * 0.03, ease: "easeOut" }}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      /* ICE CHASM — pure CSS chasm carved into the floor with a
                         jagged zig-zag clip-path. Holds animated dark water with
                         drifting caustics, floating ice chunks and a bright
                         freshly-broken cyan rim. */
                      <motion.div
                        className="ice-chasm relative h-full w-full"
                        initial={false}
                        animate={c.phase === "healing" ? { scale: [1, 1.05, 0.2], opacity: [1, 1, 0] } : { scale: 1, opacity: 1 }}
                        transition={c.phase === "healing" ? { duration: 1, ease: "easeInOut", times: [0, 0.3, 1] } : { duration: 0 }}
                      >
                        {/* Bright outer rim — slightly larger zig-zag silhouette
                            sitting behind the chasm to simulate freshly cracked
                            shimmering ice. */}
                        <div
                          className="absolute"
                          style={{
                            left: -4,
                            right: -4,
                            top: -4,
                            bottom: -4,
                            background:
                              "linear-gradient(180deg, #e0ffff 0%, #b8ecff 60%, #7fcaff 100%)",
                            clipPath: chasmClip,
                            WebkitClipPath: chasmClip,
                            filter: "drop-shadow(0 0 6px rgba(180,235,255,0.85))",
                          }}
                        />
                        {/* Ice shards splashing OUTWARD from the rim at the
                            moment the chasm opens (only first ~0.6s). */}
                        {Array.from({ length: 10 }).map((_, i) => {
                          const a = (i / 10) * Math.PI * 2;
                          const dx = Math.cos(a) * (40 + (i % 3) * 12);
                          const dy = Math.sin(a) * (28 + (i % 3) * 8) - 12;
                          return (
                            <motion.div
                              key={`splash-${i}`}
                              className="absolute"
                              style={{
                                left: "50%",
                                top: "55%",
                                width: 8 + (i % 3) * 3,
                                height: 12 + (i % 3) * 4,
                                background: "linear-gradient(180deg, #ffffff 0%, #cfeeff 60%, #7fcaff 100%)",
                                clipPath: "polygon(50% 0%, 90% 60%, 60% 100%, 20% 80%, 10% 30%)",
                                transform: `translate(-50%, -50%) rotate(${(a * 180) / Math.PI}deg)`,
                                boxShadow: "0 2px 4px rgba(0,40,80,0.5)",
                              }}
                              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                              animate={{ x: dx, y: dy, opacity: [0, 1, 0], scale: [0.4, 1.1, 0.6], rotate: ((a * 180) / Math.PI) + 180 }}
                              transition={{ duration: 0.7, delay: i * 0.015, ease: "easeOut" }}
                            />
                          );
                        })}
                        {/* The chasm itself — zig-zag clipped, deep inner shadow
                            for the ice walls, contains the animated water. */}
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{
                            clipPath: chasmClip,
                            WebkitClipPath: chasmClip,
                            background: "transparent",
                            boxShadow:
                              "inset 0 14px 22px rgba(0,15,40,0.85), inset 0 -10px 18px rgba(0,20,50,0.7), inset 14px 0 18px rgba(0,15,40,0.6), inset -14px 0 18px rgba(0,15,40,0.6)",
                          }}
                        >
                          {/* Deep water gradient base */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                "linear-gradient(180deg, #0077be 0%, #024f86 45%, #001f3f 100%)",
                            }}
                          />
                          {/* Wavy water surface — wider than container so the
                              skew/translate animation never reveals an edge. */}
                          <motion.div
                            className="absolute"
                            style={{
                              left: "-25%",
                              right: "-25%",
                              top: "10%",
                              height: "55%",
                              background:
                                "repeating-linear-gradient(95deg, rgba(255,255,255,0.18) 0 6px, rgba(255,255,255,0) 6px 22px), radial-gradient(ellipse at 50% 0%, rgba(160,220,255,0.55) 0%, transparent 60%)",
                              borderRadius: "50%",
                              filter: "blur(1px)",
                              mixBlendMode: "screen",
                            }}
                            animate={{
                              x: ["-6%", "6%", "-6%"],
                              skewX: ["-4deg", "4deg", "-4deg"],
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          />
                          {/* Drifting caustic highlights */}
                          <motion.div
                            className="absolute inset-0"
                            style={{
                              background:
                                "radial-gradient(ellipse at 30% 40%, rgba(140,220,255,0.45) 0%, transparent 35%), radial-gradient(ellipse at 70% 60%, rgba(120,200,240,0.4) 0%, transparent 30%), radial-gradient(ellipse at 50% 30%, rgba(180,230,255,0.3) 0%, transparent 28%)",
                              mixBlendMode: "screen",
                            }}
                            animate={{
                              backgroundPosition: ["0% 0%, 0% 0%, 0% 0%", "30% 20%, -20% 30%, 15% -10%", "0% 0%, 0% 0%, 0% 0%"],
                              opacity: [0.6, 1, 0.6],
                            }}
                            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                          />
                          {/* Floating ice chunks bobbing on the water */}
                          {Array.from({ length: 5 }).map((_, i) => {
                            const lx = 12 + i * 18 + rand(i + 3) * 6;
                            const sz = 10 + (i % 3) * 6;
                            return (
                              <motion.div
                                key={`chunk-${i}`}
                                className="absolute"
                                style={{
                                  left: `${lx}%`,
                                  top: `${30 + (i % 2) * 8}%`,
                                  width: sz,
                                  height: sz * 0.55,
                                  background:
                                    "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(210,240,255,0.85) 100%)",
                                  borderRadius: "40%",
                                  boxShadow: "0 2px 4px rgba(0,30,60,0.5), inset 0 -2px 2px rgba(120,180,220,0.6)",
                                }}
                                animate={{
                                  x: [0, 6, -4, 0],
                                  y: [0, -2, 1, 0],
                                  rotate: [0, 4, -3, 0],
                                }}
                                transition={{ duration: 3 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                              />
                            );
                          })}
                          {/* Tiny rising bubbles */}
                          {Array.from({ length: 5 }).map((_, i) => {
                            const lx = 20 + (i * 15) % 60;
                            const delay = i * 0.7;
                            return (
                              <motion.span
                                key={`bubble-${i}`}
                                className="absolute rounded-full bg-white/80"
                                style={{
                                  left: `${lx}%`,
                                  bottom: "10%",
                                  width: 4 + (i % 3) * 2,
                                  height: 4 + (i % 3) * 2,
                                  boxShadow: "0 0 4px rgba(180,220,255,0.8)",
                                }}
                                animate={{ y: [0, -28 - (i % 3) * 8], opacity: [0, 0.9, 0], scale: [0.6, 1, 0.6] }}
                                transition={{ duration: 2.2 + (i % 3) * 0.5, delay, repeat: Infinity, ease: "easeOut" }}
                              />
                            );
                          })}
                        </div>

                        {/* Healing overlay: bright snap flash + ice shards
                            converging back into the chasm. */}
                        {c.phase === "healing" && (
                          <>
                            <motion.div
                              className="absolute inset-0"
                              style={{
                                background:
                                  "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,1) 0%, rgba(220,240,255,0.7) 30%, transparent 65%)",
                                mixBlendMode: "screen",
                                clipPath: chasmClip,
                                WebkitClipPath: chasmClip,
                              }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                            {Array.from({ length: 8 }).map((_, i) => {
                              const angle = (i / 8) * Math.PI * 2;
                              const startX = 50 + Math.cos(angle) * 60;
                              const startY = 50 + Math.sin(angle) * 60;
                              return (
                                <motion.div
                                  key={i}
                                  className="absolute"
                                  style={{
                                    left: `${startX}%`,
                                    top: `${startY}%`,
                                    width: 14 + (i % 3) * 4,
                                    height: 18 + (i % 3) * 5,
                                    background:
                                      "linear-gradient(180deg, #ffffff 0%, #cfeeff 60%, #7fcaff 100%)",
                                    clipPath: "polygon(50% 0%, 90% 60%, 60% 100%, 20% 80%, 10% 30%)",
                                    transform: `translate(-50%, -50%) rotate(${(angle * 180) / Math.PI + 90}deg)`,
                                    boxShadow: "0 2px 4px rgba(0,40,80,0.5)",
                                  }}
                                  initial={{ opacity: 0, scale: 0.4 }}
                                  animate={{
                                    opacity: [0, 1, 1, 0],
                                    scale: [0.4, 1.1, 0.9, 0.5],
                                    left: [`${startX}%`, `${50 + Math.cos(angle) * 20}%`],
                                    top: [`${startY}%`, `${50 + Math.sin(angle) * 18}%`],
                                  }}
                                  transition={{ duration: 0.85, delay: 0.05 + i * 0.02, ease: "easeOut" }}
                                />
                              );
                            })}
                          </>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {iceCube && (
              <motion.div
                key={iceCube.id}
                className="pointer-events-none absolute z-30"
                style={{
                  left: iceCube.x,
                  top: 0,
                  width: BUCKET_WIDTHS[equippedBucket],
                  height: BUCKET_WIDTHS[equippedBucket],
                }}
                initial={{ y: iceCube.startY, rotate: -8 }}
                animate={{ y: iceCube.endY, rotate: 8 }}
                transition={{ duration: 1.1, ease: "easeIn" }}
              >
                <div
                  className="h-full w-full rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(220,240,255,0.85) 0%, rgba(160,210,240,0.75) 50%, rgba(110,170,220,0.85) 100%)",
                    border: "3px solid rgba(255,255,255,0.85)",
                    boxShadow:
                      "inset 0 0 24px rgba(255,255,255,0.7), 0 8px 24px rgba(80,130,180,0.5)",
                    backdropFilter: "blur(2px)",
                  }}
                />
              </motion.div>
            )}

            {/* Snowball bounce VFX — when a snowball hits the ice-encased bucket */}
            <AnimatePresence>
              {snowballBounces.map((b) => (
                <motion.div
                  key={b.id}
                  className="pointer-events-none absolute z-30"
                  style={{ left: b.x - 30, top: b.y - 30, width: 60, height: 60 }}
                  initial={{ opacity: 1, scale: 0.5 }}
                  animate={{ opacity: 0, scale: 1.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {/* Impact flash */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,230,255,0.6) 40%, transparent 80%)",
                      filter: "blur(2px)",
                    }}
                  />
                  {/* Snow shards radiating */}
                  {Array.from({ length: 8 }).map((_, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    const dx = Math.cos(angle) * 28;
                    const dy = Math.sin(angle) * 28;
                    return (
                      <motion.span
                        key={i}
                        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-white"
                        style={{ marginLeft: -3, marginTop: -3, boxShadow: "0 0 4px rgba(220,240,255,0.95)" }}
                        initial={{ x: 0, y: 0, opacity: 1 }}
                        animate={{ x: dx, y: dy, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    );
                  })}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Tundra: ice block encasing the bucket — tap to break free */}
            {iceEncased && (() => {
              const totalTaps = ICE_CUBE_TAPS_REQUIRED;
              const tapped = totalTaps - iceTapsLeft;
              const crackOpacity = Math.min(1, tapped / totalTaps);
              return (
                <div
                  className="absolute inset-0 z-40"
                  onPointerDown={handleIceTap}
                  style={{ touchAction: "none" }}
                >
                  {/* Frosty screen tint */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(ellipse at bottom, rgba(180,220,255,0.35) 0%, rgba(120,180,230,0.15) 60%, transparent 100%)",
                    }}
                  />
                  {/* 🩹 Crepe progressive sull'intero schermo (più click = più crepe) */}
                  <svg
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{ opacity: crackOpacity }}
                    aria-hidden="true"
                  >
                    <g stroke="rgba(255,255,255,0.95)" strokeWidth="0.25" fill="none" style={{ filter: "drop-shadow(0 0 0.4px rgba(120,180,230,0.9))" }}>
                      <path d="M50 50 L20 12 M50 50 L72 8 M50 50 L92 30 M50 50 L96 70 M50 50 L78 96 M50 50 L36 98 M50 50 L8 82 M50 50 L4 48 M50 50 L14 22" />
                      <path d="M30 25 L42 38 M70 18 L58 36 M85 42 L66 50 M88 70 L62 60 M68 88 L54 64 M28 88 L42 62 M12 70 L38 56 M14 38 L36 46" />
                    </g>
                  </svg>
                  {/* Tap counter — centered on screen */}
                  <motion.div
                    key={iceTapsLeft}
                    initial={{ scale: 1.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/70 px-6 py-4 text-center font-display text-white shadow-2xl backdrop-blur-sm"
                  >
                    <div className="text-5xl">🧊</div>
                    <div className="mt-1 text-4xl font-extrabold tabular-nums">
                      {iceTapsLeft}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wider opacity-90">
                      {t("tap_to_break") || "Tap!"}
                    </div>
                  </motion.div>
                </div>
              );
            })()}

            {/* 💥 Esplosione frammenti di ghiaccio quando il cubo si rompe */}
            <AnimatePresence>
              {iceShatter && (
                <motion.div
                  key={iceShatter.id}
                  className="pointer-events-none absolute inset-0 z-40"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {Array.from({ length: 18 }).map((_, i) => {
                    const angle = (i / 18) * Math.PI * 2;
                    const dist = 90 + Math.random() * 80;
                    const dx = Math.cos(angle) * dist;
                    const dy = Math.sin(angle) * dist;
                    const size = 5 + Math.random() * 7;
                    return (
                      <motion.span
                        key={i}
                        className="absolute left-1/2 top-1/2"
                        style={{
                          width: size,
                          height: size,
                          marginLeft: -size / 2,
                          marginTop: -size / 2,
                          background:
                            "linear-gradient(135deg,rgba(220,240,255,0.95),rgba(150,200,235,0.85))",
                          boxShadow: "0 0 6px rgba(200,230,255,0.9)",
                          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                        }}
                        initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                        animate={{
                          x: dx,
                          y: dy,
                          opacity: 0,
                          rotate: Math.random() * 360,
                          scale: 0.4,
                        }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                      />
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>


            {/* Black holes (legacy — no longer spawned, kept for safety) */}
            <AnimatePresence>
              {blackHoles.map((h) => (
                <BlackHole key={h.id} hole={h} />
              ))}
            </AnimatePresence>

            {/* Space biome: teleport portals — entry + exit pair */}
            <AnimatePresence>
              {portals.map((p) => (
                <PortalPairView key={p.id} pair={p} />
              ))}
            </AnimatePresence>

            {/* Fireball explosion ripples (volcano) */}
            <AnimatePresence>
              {explosions.map((e) => (
                <motion.div
                  key={e.id}
                  className="pointer-events-none absolute z-30"
                  style={{
                    left: e.x - FIREBALL_EXPLOSION_RADIUS,
                    top: e.y - FIREBALL_EXPLOSION_RADIUS,
                    width: FIREBALL_EXPLOSION_RADIUS * 2,
                    height: FIREBALL_EXPLOSION_RADIUS * 2,
                    borderRadius: "9999px",
                    background:
                      "radial-gradient(circle, rgba(255,220,80,0.85) 0%, rgba(255,140,30,0.55) 35%, rgba(255,60,10,0.3) 65%, rgba(255,60,10,0) 100%)",
                    boxShadow: "0 0 50px rgba(255,140,40,0.85)",
                    mixBlendMode: "screen",
                  }}
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.2, 1.1, 1.4] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut", times: [0, 0.35, 1] }}
                />
              ))}
            </AnimatePresence>

            {/* Biome intro modal — centered, only the first time a biome is unlocked */}
            <AnimatePresence>
              {biomeIntro && (
                <motion.div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  <motion.div
                    initial={{ scale: 0.85, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 240, damping: 22 }}
                    className="relative w-full max-w-sm rounded-3xl bg-card text-card-foreground p-6 text-center shadow-2xl ring-1 ring-black/10"
                  >
                    <div className="text-5xl">
                      {biomeIntro === "volcano"
                        ? "🌋"
                        : biomeIntro === "tundra"
                          ? "❄️"
                          : biomeIntro === "stormpeak"
                            ? "⚡"
                            : biomeIntro === "shadowcemetery"
                              ? "🕯️"
                              : "🚀"}
                    </div>
                    <h3 className="mt-3 font-display text-2xl font-bold tracking-wide leading-tight">
                      {t(`biome_intro_${biomeIntro}_title`)}
                    </h3>
                    {biomeIntro !== "volcano" && t(`biome_intro_${biomeIntro}_desc`) && (
                      <p className="mt-2 text-sm text-foreground/75">
                        {t(`biome_intro_${biomeIntro}_desc`)}
                      </p>
                    )}

                    <ul className="mt-4 space-y-2 text-left text-sm text-foreground/85">
                      {(biomeIntro === "volcano"
                        ? [
                            "🔥 " + t("biome_volcano_point1"),
                            "💥 " + t("biome_volcano_point2"),
                            "☄️ " + t("biome_volcano_point3"),
                          ]
                        : biomeIntro === "tundra"
                          ? [
                              "🧊 " + t("biome_tundra_point1"),
                              "❄️ " + t("biome_tundra_point2"),
                            ]
                          : biomeIntro === "stormpeak"
                            ? [
                                "⛈️ " + t("biome_stormpeak_point1"),
                                "⚡ " + t("biome_stormpeak_point2"),
                                "😵 " + t("biome_stormpeak_point3"),
                              ]
                            : biomeIntro === "shadowcemetery"
                              ? [
                                  "🕯️ " + t("biome_shadow_point1"),
                                  "👁️ " + t("biome_shadow_point2"),
                                  "💀 " + t("biome_shadow_point3"),
                                ]
                              : [
                                  "🌌 " + t("biome_space_point1"),
                                  "☄️ " + t("biome_space_point2"),
                                  "🕳️ " + t("biome_space_point3"),
                                ]
                      ).map((line, i) => (
                        <li
                          key={i}
                          className="rounded-xl bg-foreground/5 px-3 py-2"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>

                    <CountdownButton
                      show={!!biomeIntro}
                      onClick={() => setBiomeIntro(null)}
                      className="mt-5 w-full rounded-2xl py-3 font-display text-base font-bold shadow-lg transition bg-foreground text-background hover:scale-[1.02]"
                    >
                      {t("continue")} →
                    </CountdownButton>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Weather first-time intro modal — pauses the game */}
            <AnimatePresence>
              {weatherIntro && (
                <motion.div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  <motion.div
                    initial={{ scale: 0.85, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 240, damping: 22 }}
                    className="relative w-full max-w-sm rounded-3xl bg-card text-card-foreground p-6 text-center shadow-2xl ring-1 ring-black/10"
                  >
                    <div className="text-5xl">
                      {weatherIntro === "rain"
                        ? "🌧️"
                        : weatherIntro === "wind"
                          ? "💨"
                          : weatherIntro === "sun"
                            ? "☀️"
                            : weatherIntro === "bomb_storm"
                              ? "💣"
                              : weatherIntro === "fire_rain"
                                ? "🔥"
                                : "🌫️"}
                    </div>
                    <h3 className="mt-2 font-display text-2xl font-bold">
                      {weatherIntro === "fire_rain" ? t("fire_rain_alert_title") : t("weather_intro_title")}
                    </h3>
                    {weatherIntro !== "fire_rain" && (
                      <p className="mt-1 font-display text-lg font-bold text-foreground/85">
                        {t(`weather_${weatherIntro}`)}
                      </p>
                    )}
                    <p className="mt-3 text-sm text-foreground/75">
                      {weatherIntro === "fire_rain"
                        ? t("fire_rain_alert_desc")
                        : t(`weather_${weatherIntro}_desc`)}
                    </p>

                    <CountdownButton
                      show={!!weatherIntro}
                      onClick={() => {
                        // Start the actual fire_rain weather only NOW so the
                        // event isn't already half-over by the time the player
                        // dismisses the alert.
                        if (weatherIntro === "fire_rain") {
                          setWeather("fire_rain");
                          setWeatherEndsAt(performance.now() + FIRE_RAIN_DURATION_MS);
                        }
                        setWeatherIntro(null);
                      }}
                      className="mt-5 w-full rounded-2xl py-3 font-display text-base font-bold shadow-lg transition bg-foreground text-background hover:scale-[1.02]"
                    >
                      {t("weather_close")}
                    </CountdownButton>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      <AnimatePresence>{!started && <StartScreen onStart={startGame} />}</AnimatePresence>

      {/* 🎡 Ruota della Fortuna — visibile SOLO durante il gameplay */}
      {started && <FortuneWheelLayer />}

      {/* 💀 Game Over modal con tasto Revive (rewarded ad) */}
      <GameOverModal
        open={started && gameOver}
        score={collected}
        level={levelId}
        isWatchingAd={isWatchingReviveAd}
        onRevive={handleRevive}
        onRestart={handleRestartAfterGameOver}
        onExit={exitToMenu}
      />

      {/* Pause overlay */}
      <AnimatePresence>
        {started && paused && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setPaused(false)}
            />
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative w-full max-w-xs rounded-3xl bg-card text-card-foreground p-6 text-center shadow-2xl ring-1 ring-black/10"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg ring-4 ring-amber-200/70">
                <Play className="h-8 w-8 text-amber-950" fill="currentColor" />
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold">{t("paused")}</h3>
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-display text-base font-bold shadow-lg transition bg-foreground text-background hover:scale-[1.02]"
              >
                <Play className="h-5 w-5" fill="currentColor" />
                {t("resume")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <Shop
        open={shopOpen}
        onClose={() => setShopOpen(false)}
        currentLevel={Math.max(levelId, maxUnlockedLevel)}
        onUseMagnet={handleUseMagnet}
        onUseSlowmo={handleUseSlowmo}
        onUseLargeBucket={handleUseLargeBucket}
        onUseShield={handleUseShield}
        onUseShockwave={handleUseShockwave}
        onUseGoldenHeart={handleUseGoldenHeart}
        onUnequipShield={handleUnequipShield}
        onUnequipGoldenHeart={handleUnequipGoldenHeart}
        shieldActive={shieldActive}
        goldenHeartActive={goldenHeartActive}
        onUnequipMagnet={handleUnequipMagnet}
        onUnequipSlowmo={handleUnequipSlowmo}
        onUnequipLargeBucket={handleUnequipLargeBucket}
        magnetRemainingMs={magnetRemaining}
        slowmoRemainingMs={slowmoRemaining}
      />
      <LevelMap
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        currentLevel={levelId}
        maxUnlockedLevel={maxUnlockedLevel}
        onSelectLevel={(id) => {
          setMapOpen(false);
          goToLevel(id);
        }}
      />
      <AchievementsPanel open={achievementsOpen} onClose={() => setAchievementsOpen(false)} />
      <QuestsPanel open={questsOpen} onClose={() => setQuestsOpen(false)} />

      <LevelUpModal
          show={showLevelUp}
          nextFruitImg={nextLevel?.fruitImg ?? null}
          nextFruitName={nextLevel ? t(`fruit_${nextLevel.fruitKey}`) : null}
          isFinal={isFinal}
          onContinue={handleContinue}
          onSelectLevel={(id) => {
            goToLevel(id);
          }}
          onGoHome={() => {
            setShowLevelUp(false);
            setCollected(0);
            setBucketFruits([]);
            setFruits([]);
            caughtIdsRef.current = new Set();
            streakRef.current = 0;
            setComboCount(0);
            setLevelId(1);
            exitToMenu();
          }}
      />

      {/* Level transition loader */}
      <AnimatePresence>
        {transitioning && (
          <LevelLoader
            show
            fruitImg={pendingLevelId ? getLevel(pendingLevelId).fruitImg : null}
            fruitName={pendingLevelId ? t(`fruit_${getLevel(pendingLevelId).fruitKey}_plural`) : null}
            levelId={pendingLevelId}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export { FruitCatchMasterGame };

// ============================================================================
// PortalPairView — visual representation of a teleport portal pair.
// Entry portal: blue/cyan, horizontal. Exit portal: purple, oriented at angle.
// ============================================================================
interface PortalPairProps {
  pair: {
    id: number;
    entry: { x: number; y: number; w: number; angle: number };
    exit: { x: number; y: number; w: number; angle: number };
  };
}
function PortalPairView({ pair }: PortalPairProps) {
  const renderPortal = (
    p: { x: number; y: number; w: number; angle: number },
    kind: "entry" | "exit",
  ) => {
    const h = 28;
    const colors =
      kind === "entry"
        ? {
            outer: "rgba(80,200,255,0.95)",
            inner: "rgba(40,140,240,0.9)",
            core: "rgba(220,245,255,0.95)",
            glow: "rgba(80,200,255,0.85)",
          }
        : {
            outer: "rgba(200,120,255,0.95)",
            inner: "rgba(150,60,220,0.9)",
            core: "rgba(245,225,255,0.95)",
            glow: "rgba(200,120,255,0.85)",
          };
    return (
      <motion.div
        className="pointer-events-none absolute z-[22]"
        style={{
          left: p.x - p.w / 2,
          top: p.y - h / 2,
          width: p.w,
          height: h,
          transform: `rotate(${p.angle}deg)`,
          transformOrigin: "50% 50%",
        }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.4 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${colors.glow} 0%, transparent 70%)`,
            filter: "blur(8px)",
            transform: "scale(1.4)",
          }}
        />
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `3px solid ${colors.outer}`,
            boxShadow: `0 0 18px ${colors.glow}, inset 0 0 14px ${colors.glow}`,
          }}
        />
        {/* Inner swirling layer */}
        <motion.div
          className="absolute inset-1 rounded-full overflow-hidden"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${colors.core} 0%, ${colors.inner} 50%, ${colors.outer} 100%)`,
          }}
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Spiraling streaks */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              style={{
                background: `linear-gradient(${90 + i * 60}deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)`,
              }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </motion.div>
        {/* Direction indicator (small arrow on exit) */}
        {kind === "exit" && (
          <div
            className="absolute"
            style={{
              right: -14,
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderLeft: `12px solid ${colors.outer}`,
              filter: `drop-shadow(0 0 4px ${colors.glow})`,
            }}
          />
        )}
      </motion.div>
    );
  };

  return (
    <>
      {renderPortal(pair.entry, "entry")}
      {renderPortal(pair.exit, "exit")}
    </>
  );
}
