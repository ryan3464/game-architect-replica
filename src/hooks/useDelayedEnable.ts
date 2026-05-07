import { useEffect, useState } from "react";

/**
 * 🕒 useDelayedEnable
 * Riabilita un valore booleano dopo `ms` ogni volta che `key` cambia.
 * Utile per impedire chiusure accidentali di modali appena aperte.
 */
export function useDelayedEnable(key: unknown, ms: number) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (key === null || key === undefined || key === false) {
      setEnabled(false);
      return;
    }
    setEnabled(false);
    const t = setTimeout(() => setEnabled(true), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return enabled;
}
