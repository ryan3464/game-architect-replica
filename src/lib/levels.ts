import bananaImg from "@/assets/fruit-banana.png";
import appleImg from "@/assets/fruit-apple.png";
import coconutImg from "@/assets/fruit-coconut.png";
import strawberryImg from "@/assets/fruit-strawberry.png";
import pumpkinImg from "@/assets/fruit-pumpkin.png";
import cherryImg from "@/assets/fruit-cherry.png";
import bombImg from "@/assets/hazard-bomb.png";
import fireballImg from "@/assets/hazard-fireball.png";
import bananaGoldImg from "@/assets/fruit-banana-gold.png";
import appleGoldImg from "@/assets/fruit-apple-gold.png";
import coconutGoldImg from "@/assets/fruit-coconut-gold.png";
import strawberryGoldImg from "@/assets/fruit-strawberry-gold.png";
import pumpkinGoldImg from "@/assets/fruit-pumpkin-gold.png";
import cherryGoldImg from "@/assets/fruit-cherry-gold.png";
import magmaImg from "@/assets/fruit-magma.png";
import magmaGoldImg from "@/assets/fruit-magma-gold.png";
import frostberryImg from "@/assets/fruit-frostberry.png";
import frostberryGoldImg from "@/assets/fruit-frostberry-gold.png";
import starberryImg from "@/assets/fruit-starberry.png";
import starberryGoldImg from "@/assets/fruit-starberry-gold.png";
import thunderberryImg from "@/assets/fruit-thunderberry.png";
import thunderberryGoldImg from "@/assets/fruit-thunderberry-gold.png";
import treeBananaImg from "@/assets/tree-banana.png";
import treeAppleImg from "@/assets/tree-apple.png";
import treeCoconutImg from "@/assets/tree-coconut.png";
import treeStrawberryImg from "@/assets/tree-strawberry.png";
import treePumpkinImg from "@/assets/tree-pumpkin.png";
import treeCherryImg from "@/assets/tree-cherry.png";
import treeVolcanoImg from "@/assets/tree-volcano.png";
import treeTundraV2Img from "@/assets/tree-tundra-v2.png";
import treeTundraPremiumImg from "@/assets/tree-tundra-premium.png";
import treeSpaceImg from "@/assets/tree-space-premium.png";
import bgTropical from "@/assets/bg-tropical.jpg";
import bgOrchard from "@/assets/bg-orchard.jpg";
import bgCoconut from "@/assets/bg-coconut.jpg";
import bgStrawberry from "@/assets/bg-strawberry-field.jpg";
import bgPumpkin from "@/assets/bg-pumpkin.jpg";
import bgCherry from "@/assets/bg-cherry.jpg";
import bgVolcano from "@/assets/bg-volcano-integrated.jpg";
import bgTundra from "@/assets/bg-tundra-integrated.jpg";
import bgTundraPremium from "@/assets/bg-tundra-premium.jpg";
import bgSpace from "@/assets/bg-space-premium.jpg";
import bgStormpeak from "@/assets/bg-stormpeak-integrated.jpg";
import bgShadowCemetery from "@/assets/bg-shadow-cemetery.jpg";
import lithicHeartImg from "@/assets/fruit-lithicheart.png";
import lithicHeartGoldImg from "@/assets/fruit-lithicheart-gold.png";
import grinningSkullImg from "@/assets/hazard-grinning-skull.png";

export type FruitKey =
  | "banana"
  | "apple"
  | "coconut"
  | "strawberry"
  | "pumpkin"
  | "cherry"
  | "magma"
  | "frostberry"
  | "thunderberry"
  | "starberry"
  | "lithicheart";

/** Optional biome modifier that activates special gameplay mechanics. */
export type BiomeKind = "volcano" | "tundra" | "stormpeak" | "space" | "shadowcemetery";

// NOTE: stormpeak uses the tundra tree art as a temporary placeholder until a
// dedicated thunderpeak tree asset exists. The bg already integrates a tree.

export interface LevelDef {
  id: number;
  fruitKey: FruitKey;
  fruitImg: string;
  fruitRottenImg: string;
  fruitGoldImg: string;
  treeImg: string;
  bgImg: string;
  target: number;
  fallChance: number;
  fruitSize: number;
  /** Probability that a spawned fruit is rotten. */
  rottenChance: number;
  /** Optional biome that activates special mechanics in gameplay. */
  biome?: BiomeKind;
  /** If true, the tree is already painted into the background artwork. */
  integratedTreeInBackground?: boolean;
  /**
   * Multiplier applied to the falling fruit duration. >1 = slower (low gravity),
   * <1 = faster. Defaults to 1.
   */
  gravityMultiplier?: number;
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    fruitKey: "banana",
    fruitImg: bananaImg,
    fruitRottenImg: bombImg,
    fruitGoldImg: bananaGoldImg,
    treeImg: treeBananaImg,
    bgImg: bgTropical,
    target: 10,
    fallChance: 0.55,
    fruitSize: 52,
    rottenChance: 0.1,
  },
  {
    id: 2,
    fruitKey: "apple",
    fruitImg: appleImg,
    fruitRottenImg: bombImg,
    fruitGoldImg: appleGoldImg,
    treeImg: treeAppleImg,
    bgImg: bgOrchard,
    target: 10,
    fallChance: 0.6,
    fruitSize: 48,
    rottenChance: 0.1,
  },
  {
    id: 3,
    fruitKey: "cherry",
    fruitImg: cherryImg,
    fruitRottenImg: bombImg,
    fruitGoldImg: cherryGoldImg,
    treeImg: treeCherryImg,
    bgImg: bgCherry,
    target: 10,
    fallChance: 0.6,
    fruitSize: 46,
    rottenChance: 0.12,
  },
  {
    id: 4,
    fruitKey: "coconut",
    fruitImg: coconutImg,
    fruitRottenImg: bombImg,
    fruitGoldImg: coconutGoldImg,
    treeImg: treeCoconutImg,
    bgImg: bgCoconut,
    target: 10,
    fallChance: 0.55,
    fruitSize: 56,
    rottenChance: 0.13,
  },
  {
    id: 5,
    fruitKey: "magma",
    fruitImg: magmaImg,
    fruitRottenImg: fireballImg,
    fruitGoldImg: magmaGoldImg,
    treeImg: treeVolcanoImg,
    bgImg: bgVolcano,
    target: 10,
    fallChance: 0.6,
    fruitSize: 52,
    rottenChance: 0.18,
    biome: "volcano",
    integratedTreeInBackground: true,
  },
  {
    id: 6,
    fruitKey: "frostberry",
    fruitImg: frostberryImg,
    fruitRottenImg: bombImg,
    fruitGoldImg: frostberryGoldImg,
    treeImg: treeTundraPremiumImg,
    bgImg: bgTundraPremium,
    target: 10,
    fallChance: 0.6,
    fruitSize: 50,
    rottenChance: 0,
    biome: "tundra",
    integratedTreeInBackground: false,
  },
  {
    id: 7,
    fruitKey: "thunderberry",
    fruitImg: thunderberryImg,
    fruitRottenImg: bombImg,
    fruitGoldImg: thunderberryGoldImg,
    treeImg: treeTundraV2Img,
    bgImg: bgStormpeak,
    target: 10,
    fallChance: 0.6,
    fruitSize: 50,
    rottenChance: 0,
    biome: "stormpeak",
    integratedTreeInBackground: true,
  },
  {
    id: 8,
    fruitKey: "starberry",
    fruitImg: starberryImg,
    fruitRottenImg: bombImg,
    fruitGoldImg: starberryGoldImg,
    treeImg: treeSpaceImg,
    bgImg: bgSpace,
    target: 10,
    fallChance: 0.6,
    fruitSize: 50,
    rottenChance: 0,
    biome: "space",
    gravityMultiplier: 1.8,
  },
  {
    id: 9,
    fruitKey: "lithicheart",
    fruitImg: lithicHeartImg,
    fruitRottenImg: grinningSkullImg,
    fruitGoldImg: lithicHeartGoldImg,
    treeImg: bgShadowCemetery, // tree integrated in bg, value unused visually
    bgImg: bgShadowCemetery,
    target: 10,
    fallChance: 0.6,
    fruitSize: 52,
    rottenChance: 0.15,
    biome: "shadowcemetery",
    integratedTreeInBackground: true,
  },
];

export function getLevel(id: number): LevelDef {
  return LEVELS[Math.min(LEVELS.length, Math.max(1, id)) - 1];
}
