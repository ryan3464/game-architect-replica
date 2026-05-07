/**
 * Tiny pub/sub for "external" pause sources (modals rendered outside the
 * main game component, like the Fortune Wheel and Airdrop/Loot bursts).
 * Each opener calls acquire() on mount and release() on unmount; the game
 * subscribes to the count and pauses whenever count > 0.
 */
let count = 0;
const listeners = new Set<(n: number) => void>();

export function acquireExternalPause() {
  count += 1;
  listeners.forEach((l) => l(count));
}

export function releaseExternalPause() {
  count = Math.max(0, count - 1);
  listeners.forEach((l) => l(count));
}

export function subscribeExternalPause(cb: (n: number) => void) {
  listeners.add(cb);
  cb(count);
  return () => {
    listeners.delete(cb);
  };
}

export function getExternalPauseCount() {
  return count;
}
