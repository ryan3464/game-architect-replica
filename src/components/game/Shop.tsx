import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useSettings } from "@/lib/settings";
import { useGameState, SHOP_ITEMS } from "@/lib/game-state";
import bucketImg from "@/assets/bucket-modern.png";
import bucketLargeImg from "@/assets/bucket-large.png";
import magnetImg from "@/assets/gadget-magnet.png";
import coinImg from "@/assets/coin.png";
import goldenPackImg from "@/assets/golden-pack.png";
import { SKIN_FILTERS, SkinShape } from "@/components/game/Bucket";

interface ShopProps {
  open: boolean;
  onClose: () => void;
  currentLevel: number;
  /** Activate magnet gadget (consumes 1 from inventory). Returns true on success. */
  onUseMagnet?: () => boolean | void;
  /** Activate slow-motion gadget. */
  onUseSlowmo?: () => boolean | void;
  /** Activate large bucket gadget. */
  onUseLargeBucket?: () => boolean | void;
  /** Activate shield gadget. */
  onUseShield?: () => boolean | void;
  /** Activate shockwave gadget — clears all bombs on screen. */
  onUseShockwave?: () => boolean | void;
  /** Activate Golden Heart — extra "soft" shield consumed before red hearts. */
  onUseGoldenHeart?: () => boolean | void;
  /** Cancel shield. */
  onUnequipShield?: () => void;
  /** Cancel Golden Heart. */
  onUnequipGoldenHeart?: () => void;
  /** Whether a shield is currently active. */
  shieldActive?: boolean;
  /** Whether the Golden Heart is currently equipped. */
  goldenHeartActive?: boolean;
  /** Cancel an active gadget effect. */
  onUnequipMagnet?: () => void;
  onUnequipSlowmo?: () => void;
  onUnequipLargeBucket?: () => void;
  /** Remaining ms for active magnet (0 if inactive). */
  magnetRemainingMs?: number;
  /** Remaining ms for active slow-mo (0 if inactive). */
  slowmoRemainingMs?: number;
}

const ICONS: Record<string, string> = {
  bucket_large: bucketLargeImg,
  gadget_magnet: magnetImg,
  golden_pack: goldenPackImg,
};

const EMOJI_ICONS: Record<string, string> = {
  gadget_slowmo: "⏱️",
  gadget_shield: "🛡️",
  gadget_shockwave: "💥",
  gadget_golden_heart: "💛",
};

export function Shop({
  open,
  onClose,
  currentLevel,
  onUseMagnet,
  onUseSlowmo,
  onUseLargeBucket,
  onUseShield,
  onUseShockwave,
  onUseGoldenHeart,
  onUnequipShield,
  onUnequipGoldenHeart,
  shieldActive = false,
  goldenHeartActive = false,
  onUnequipMagnet,
  onUnequipSlowmo,
  onUnequipLargeBucket,
  magnetRemainingMs = 0,
  slowmoRemainingMs = 0,
}: ShopProps) {
  const { t } = useSettings();
  const [tab, setTab] = useState<"gadgets" | "cosmetics">("gadgets");
  // Confirmation dialog state for unequipping an active gadget.
  const [confirmUnequip, setConfirmUnequip] = useState<null | {
    label: string;
    handler: () => void;
  }>(null);
  const askUnequip = (label: string, handler: () => void) =>
    setConfirmUnequip({ label, handler });
  const {
    coins,
    spendCoins,
    inventory,
    addGadget,
    goldenPackOwned,
    unlockGoldenPack,
    goldenPackEquipped,
    equipGoldenPack,
    unequipGoldenPack,
    activateLargeBucket,
    largeBucketRemainingMs,
    ownedSkins,
    equippedSkin,
    unlockSkin,
    equipSkin,
    ownedPets,
    equippedPet,
    unlockPet,
    equipPet,
  } = useGameState();

  const handleBuy = (itemId: string) => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    if (item.kind === "golden_pack" && goldenPackOwned) {
      // Toggle equip/unequip — already paid for, free to switch.
      if (goldenPackEquipped) unequipGoldenPack();
      else equipGoldenPack();
      return;
    }
    if (item.kind === "skin" && item.skinId && ownedSkins.includes(item.skinId)) {
      // Toggle: if already equipped (and not default), unequip → default. Otherwise equip.
      if (equippedSkin === item.skinId && item.skinId !== "default") {
        equipSkin("default");
      } else {
        equipSkin(item.skinId);
      }
      return;
    }
    if (!spendCoins(item.price)) return;
    if (item.kind === "bucket" && item.bucketId === "large") {
      // Store as a gadget charge — player activates manually from in-game HUD.
      addGadget("large_bucket", 1);
    } else if (item.kind === "gadget" && item.gadgetId) {
      addGadget(item.gadgetId, 1);
    } else if (item.kind === "golden_pack") {
      unlockGoldenPack();
    } else if (item.kind === "skin" && item.skinId) {
      unlockSkin(item.skinId);
      equipSkin(item.skinId);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative w-full max-w-md rounded-3xl bg-card text-card-foreground p-6 shadow-2xl ring-1 ring-black/5 max-h-[90vh] overflow-y-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛒</span>
                <h2 className="font-display text-2xl font-bold text-foreground">{t("shop")}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-foreground/70 transition hover:bg-black/10"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl bg-amber-100 dark:bg-amber-900/30 py-2.5 px-4">
              <img src={coinImg} alt="" className="h-6 w-6" width={24} height={24} />
              <span className="font-display text-lg font-bold tabular-nums text-amber-950 dark:text-amber-100">{coins}</span>
              <span className="text-sm font-semibold text-amber-900/70 dark:text-amber-200/70">{t("coins")}</span>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-2 rounded-2xl bg-foreground/5 p-1">
              {(["gadgets", "cosmetics"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex-1 rounded-xl px-3 py-2 font-display text-sm font-bold transition ${
                    tab === id
                      ? "bg-foreground text-background shadow"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {id === "gadgets" ? "🧰 " + t("shop_tab_gadgets") : "✨ " + t("shop_tab_cosmetics")}
                </button>
              ))}
            </div>

            {tab === "cosmetics" && (
              <p className="mb-3 rounded-xl bg-foreground/5 px-3 py-2 text-center text-xs text-foreground/70">
                {t("cosmetics_subtitle")}
              </p>
            )}

            <div className="space-y-3">
              {SHOP_ITEMS.filter((i) => {
                if (i.kind === "pet") return false;
                if (i.kind === "skin" && i.skinId === "default") return false;
                const isGadgetTab =
                  i.kind === "gadget" ||
                  (i.kind === "bucket" && i.bucketId === "large") ||
                  i.kind === "golden_pack";
                return tab === "gadgets" ? isGadgetTab : !isGadgetTab;
              }).map((item) => {
                const isLargeBucket = item.kind === "bucket" && item.bucketId === "large";
                const largeActive = isLargeBucket && largeBucketRemainingMs > 0;
                const largeStock = isLargeBucket ? inventory.large_bucket ?? 0 : 0;
                const gadgetCount =
                  item.kind === "gadget" && item.gadgetId ? inventory[item.gadgetId] ?? 0 : 0;
                const isGoldenOwned = item.kind === "golden_pack" && goldenPackOwned;
                const isGoldenEquipped = item.kind === "golden_pack" && goldenPackEquipped;
                const isSkinOwned = item.kind === "skin" && item.skinId && ownedSkins.includes(item.skinId);
                const isSkinEquipped = item.kind === "skin" && item.skinId === equippedSkin;
                const isPetOwned = item.kind === "pet" && item.petId && ownedPets.includes(item.petId);
                const isPetEquipped = item.kind === "pet" && item.petId === equippedPet;
                const requiredLevel = item.requiredLevel ?? 1;
                const isLocked = currentLevel < requiredLevel;
                const canAfford = coins >= item.price;
                const titleKey =
                  item.kind === "bucket"
                    ? `bucket_${item.bucketId}`
                    : item.kind === "gadget"
                      ? `gadget_${item.gadgetId}`
                      : item.kind === "skin"
                        ? `skin_${item.skinId}`
                        : item.kind === "pet"
                          ? `pet_${item.petId}`
                          : `golden_pack`;
                const descKey = `${titleKey}_desc`;
                const remainingMin = Math.floor(largeBucketRemainingMs / 60000);
                const remainingSec = Math.floor((largeBucketRemainingMs % 60000) / 1000);

                // Skin preview filter
                const skinFilter =
                  item.kind === "skin" && item.skinId
                    ? SKIN_FILTERS[item.skinId]
                    : undefined;

                const isHighlight =
                  isGoldenEquipped || isSkinEquipped || isPetEquipped;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                      isLocked
                        ? "border-black/10 bg-black/5 opacity-60"
                        : isHighlight
                          ? "border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20 dark:border-amber-700/50"
                          : "border-black/10 bg-foreground/[0.02]"
                    }`}
                  >
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl shadow-inner ${
                        item.kind === "golden_pack" ? "bg-amber-50 dark:bg-amber-900/20" : "bg-background"
                      }`}
                    >
                      {EMOJI_ICONS[item.id] ? (
                        <span className="text-4xl">{EMOJI_ICONS[item.id]}</span>
                      ) : item.kind === "skin" && item.skinId && ["cart", "teacup", "ghost"].includes(item.skinId) ? (
                        <SkinShape skin={item.skinId} width={56} />
                      ) : (
                        <img
                          src={ICONS[item.id] ?? bucketImg}
                          alt=""
                          className="h-12 w-12 object-contain"
                          style={skinFilter ? { filter: skinFilter } : undefined}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm font-bold truncate">
                          {t(titleKey)}
                        </h3>
                        {item.kind === "gadget" && gadgetCount > 0 && (
                          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold">
                            ×{gadgetCount}
                          </span>
                        )}
                        {isLargeBucket && largeStock > 0 && !largeActive && (
                          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold">
                            ×{largeStock}
                          </span>
                        )}
                        {largeActive && (
                          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
                            {remainingMin}:{String(remainingSec).padStart(2, "0")}
                          </span>
                        )}
                        {(isGoldenEquipped || isSkinEquipped || isPetEquipped) && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/60">{t(descKey)}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {!isSkinOwned && !isPetOwned && !isGoldenOwned && (
                          <div className="flex items-center gap-1">
                            <img src={coinImg} alt="" className="h-3.5 w-3.5" width={14} height={14} />
                            <span className="font-display text-xs font-bold">{item.price}</span>
                          </div>
                        )}
                        {isLocked && (
                          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase">
                            🔒 {t("level")} {requiredLevel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                      {(() => {
                        // "Use" button: only for usable consumables (gadgets + large bucket)
                        // and only if the player has stock and the effect is not already active.
                        let useHandler: (() => boolean | void) | undefined;
                        let unequipHandler: (() => void) | undefined;
                        let canUse = false;
                        let activeRemainingMs = 0;
                        if (item.kind === "gadget" && item.gadgetId === "magnet") {
                          useHandler = onUseMagnet;
                          unequipHandler = onUnequipMagnet;
                          activeRemainingMs = magnetRemainingMs;
                          canUse = gadgetCount > 0 && activeRemainingMs <= 0;
                        } else if (item.kind === "gadget" && item.gadgetId === "slowmo") {
                          useHandler = onUseSlowmo;
                          unequipHandler = onUnequipSlowmo;
                          activeRemainingMs = slowmoRemainingMs;
                          canUse = gadgetCount > 0 && activeRemainingMs <= 0;
                        } else if (isLargeBucket) {
                          useHandler = onUseLargeBucket;
                          unequipHandler = onUnequipLargeBucket;
                          activeRemainingMs = largeBucketRemainingMs;
                          canUse = largeStock > 0 && activeRemainingMs <= 0;
                        } else if (item.kind === "gadget" && item.gadgetId === "shield") {
                          useHandler = onUseShield;
                          unequipHandler = onUnequipShield;
                          // For the shield we treat "active" as a boolean — surface
                          // an Unequip button while it's up, otherwise allow Use.
                          if (shieldActive) {
                            return (
                              <button
                                type="button"
                                onClick={() => askUnequip(t(titleKey), () => unequipHandler?.())}
                                className="rounded-xl px-3 py-1.5 font-display text-[11px] font-bold transition bg-rose-500 text-white hover:scale-105"
                              >
                                {t("unequip")}
                              </button>
                            );
                          }
                          canUse = gadgetCount > 0;
                        } else if (item.kind === "gadget" && item.gadgetId === "shockwave") {
                          useHandler = onUseShockwave;
                          canUse = gadgetCount > 0;
                        } else if (item.kind === "gadget" && item.gadgetId === "golden_heart") {
                          useHandler = onUseGoldenHeart;
                          unequipHandler = onUnequipGoldenHeart;
                          if (goldenHeartActive) {
                            return (
                              <button
                                type="button"
                                onClick={() => askUnequip(t(titleKey), () => unequipHandler?.())}
                                className="rounded-xl px-3 py-1.5 font-display text-[11px] font-bold transition bg-rose-500 text-white hover:scale-105"
                              >
                                {t("unequip")}
                              </button>
                            );
                          }
                          canUse = gadgetCount > 0;
                        }
                        if (!useHandler) return null;
                        if (activeRemainingMs > 0 && unequipHandler) {
                          return (
                            <button
                              type="button"
                              onClick={() => askUnequip(t(titleKey), () => unequipHandler?.())}
                              className="rounded-xl px-3 py-1.5 font-display text-[11px] font-bold transition bg-rose-500 text-white hover:scale-105"
                            >
                              {t("unequip")}
                            </button>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              useHandler?.();
                            }}
                            disabled={!canUse}
                            className={`rounded-xl px-3 py-1.5 font-display text-[11px] font-bold transition ${
                              canUse
                                ? "bg-emerald-500 text-white hover:scale-105"
                                : "bg-black/10 text-foreground/40 cursor-not-allowed"
                            }`}
                          >
                            {t("use")}
                          </button>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={() => handleBuy(item.id)}
                        disabled={
                          isLocked ||
                          (!isSkinOwned && !isPetOwned && !isGoldenOwned && !canAfford)
                        }
                        className={`rounded-xl px-3 py-2 font-display text-xs font-bold transition ${
                          isLocked
                            ? "bg-black/10 text-foreground/40 cursor-not-allowed"
                            : isGoldenEquipped
                              ? "bg-rose-500 text-white hover:scale-105"
                              : isGoldenOwned
                                ? "bg-amber-500 text-white hover:scale-105"
                                : isSkinEquipped
                                  ? "bg-rose-500 text-white hover:scale-105"
                                  : isSkinOwned || isPetOwned
                                    ? "bg-amber-500 text-white hover:scale-105"
                                    : canAfford
                                      ? "bg-foreground text-background hover:scale-105"
                                      : "bg-black/10 text-foreground/40 cursor-not-allowed"
                        }`}
                      >
                        {isGoldenEquipped
                          ? t("unequip")
                          : isGoldenOwned
                            ? t("equip")
                            : isSkinEquipped
                              ? t("unequip")
                              : isSkinOwned || isPetOwned
                                ? t("equip")
                                : t("buy")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
          {/* Confirmation dialog for unequipping an active gadget */}
          <AnimatePresence>
            {confirmUnequip && (
              <motion.div
                className="absolute inset-0 z-[60] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setConfirmUnequip(null)}
                />
                <motion.div
                  initial={{ scale: 0.9, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  className="relative w-full max-w-xs rounded-2xl bg-card p-5 text-center shadow-2xl ring-1 ring-black/10"
                >
                  <div className="text-4xl">⚠️</div>
                  <h3 className="mt-2 font-display text-lg font-bold">
                    {t("confirm_unequip_title") || "Sei sicuro?"}
                  </h3>
                  <p className="mt-1 text-sm text-foreground/70">
                    {(t("confirm_unequip_desc") || "Rimuovere {item}? Non verrà rimborsato.").replace(
                      "{item}",
                      confirmUnequip.label,
                    )}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmUnequip(null)}
                      className="flex-1 rounded-xl bg-foreground/10 py-2 font-display text-sm font-bold text-foreground hover:bg-foreground/20"
                    >
                      {t("cancel") || "Annulla"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        confirmUnequip.handler();
                        setConfirmUnequip(null);
                      }}
                      className="flex-1 rounded-xl bg-rose-500 py-2 font-display text-sm font-bold text-white hover:bg-rose-600"
                    >
                      {t("confirm") || "Conferma"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
