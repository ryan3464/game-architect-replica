/**
 * 📳 Vibrazione tattile (haptics)
 * Wrapper sicuro attorno a navigator.vibrate.
 */
export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}
