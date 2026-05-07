// Lightweight WebAudio sound effects. Volume controlled via setVolume().

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let masterVolume = 0.7;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function blip(freq: number, duration = 0.12, type: OscillatorType = "sine", gain = 0.15) {
  const c = getCtx();
  if (!c || !masterGain) return;
  if (masterVolume <= 0.0001) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(g).connect(masterGain);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export const sfx = {
  setVolume: (v: number) => {
    masterVolume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = masterVolume;
  },
  click: () => blip(220, 0.08, "triangle", 0.08),
  catch: () => {
    blip(660, 0.08, "sine", 0.12);
    setTimeout(() => blip(880, 0.1, "sine", 0.1), 60);
  },
  splat: () => blip(120, 0.18, "sawtooth", 0.06),
  bounce: () => blip(330, 0.06, "sine", 0.08),
  delivery: () => {
    blip(523, 0.1, "square", 0.08);
    setTimeout(() => blip(659, 0.1, "square", 0.08), 90);
    setTimeout(() => blip(784, 0.18, "square", 0.1), 180);
  },
  levelUp: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => blip(f, 0.18, "triangle", 0.12), i * 90),
    );
  },
  rotten: () => {
    // Soft descending "thud" — clearly negative but not harsh
    blip(280, 0.12, "sine", 0.08);
    setTimeout(() => blip(200, 0.14, "sine", 0.07), 70);
    setTimeout(() => blip(140, 0.18, "sine", 0.06), 150);
  },
  combo: () => {
    [659, 784, 988, 1318].forEach((f, i) =>
      setTimeout(() => blip(f, 0.14, "square", 0.1), i * 70),
    );
  },
  coin: () => {
    blip(988, 0.06, "square", 0.06);
    setTimeout(() => blip(1318, 0.08, "square", 0.06), 40);
  },
  slowmo: () => {
    [880, 740, 620, 520, 440].forEach((f, i) =>
      setTimeout(() => blip(f, 0.16, "sine", 0.08), i * 70),
    );
  },
  achievement: () => {
    [784, 988, 1318, 1568].forEach((f, i) =>
      setTimeout(() => blip(f, 0.14, "triangle", 0.1), i * 80),
    );
  },
  timeUp: () => {
    blip(440, 0.18, "sawtooth", 0.1);
    setTimeout(() => blip(330, 0.22, "sawtooth", 0.1), 100);
    setTimeout(() => blip(220, 0.32, "sawtooth", 0.12), 220);
  },
  bird: () => {
    // Cheeky bird squawk
    blip(1400, 0.06, "square", 0.07);
    setTimeout(() => blip(1700, 0.06, "square", 0.07), 50);
    setTimeout(() => blip(1100, 0.08, "square", 0.06), 110);
  },
  crateLand: () => {
    blip(180, 0.15, "triangle", 0.12);
    setTimeout(() => blip(120, 0.2, "sine", 0.1), 60);
  },
  crateOpen: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      setTimeout(() => blip(f, 0.12, "triangle", 0.1), i * 50),
    );
  },
  weather: () => {
    blip(440, 0.1, "sine", 0.08);
    setTimeout(() => blip(660, 0.12, "sine", 0.08), 80);
    setTimeout(() => blip(880, 0.16, "sine", 0.1), 180);
  },
  bell: () => {
    // Funeral bell toll — low triangle with long decay
    blip(196, 1.2, "triangle", 0.18);
    setTimeout(() => blip(165, 1.0, "sine", 0.12), 200);
  },
  whisper: () => {
    blip(110, 0.4, "sawtooth", 0.04);
  },
};
