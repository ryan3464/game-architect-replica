# Bioma "Cimitero delle Ombre" — Piano

Aggiungo un nuovo livello (id 9) con bioma `shadowcemetery`. Tutto il lavoro è isolato in nuovi file + piccoli innesti in `FruitCatchMasterGame.tsx`, `levels.ts`, `BiomeOverlay.tsx`, `sfx.ts`.

## 1. Asset (generati con imagegen)

- `bg-shadow-cemetery.jpg` — cimitero gotico, lapidi, nebbia, luna piena, **albero secco integrato nello sfondo** (no PNG separato, come da tua nota).
- `fruit-lithic-heart.png` (+ versione `-gold`) — cuore di pietra con crepe viola neon, sfondo trasparente.
- `hazard-grinning-skull.png` — teschio ghignante, sostituisce la bomba.
- `tree-shadow-cemetery.png` — riusato solo come icona livello (stesso albero dello sfondo). In partita `integratedTreeInBackground: true`.

## 2. Dati livello (`src/lib/levels.ts`)

- Estendo `FruitKey` con `"lithicheart"` e `BiomeKind` con `"shadowcemetery"`.
- Aggiungo `LEVELS[8]` con i nuovi asset, `integratedTreeInBackground: true`, `rottenChance: 0.15`.
- Aggiungo stringhe i18n `fruit_lithicheart` / `_plural`.

## 3. Overlay luce dinamica (`BiomeOverlay.tsx`)

Nuovo blocco `if (biome === "shadowcemetery")`:
- Strato nero a `opacity 0.92` su tutto il campo.
- Maschera radiale CSS (`mask-image: radial-gradient`) centrata sulla posizione del secchio, raggio ~150px, che "buca" il nero rivelando lo sfondo.
- Tremolio: animazione opacity 0.90↔0.94 quando il secchio si muove velocemente (>X px/frame), con trail luminoso (2-3 cerchi più piccoli con fade).
- Riceve `bucketX`, `bucketY`, `bucketSpeed` come prop dal game (passati down).

## 4. Occhio Spettrale (nuovo `SpectralEye.tsx`)

- Sprite SVG fluttuante in alto al centro, pupilla che traccia `bucketX`.
- Ogni 15-20s emette raggio verticale (colonna blu ectoplasmatica con glow + animazione 0.6s).
- Nel punto d'impatto spawn `ZombieHands` (durata 4s).
- Se le mani toccano il secchio → `setFrozenUntil(now + 2500)` (riusa stato freeze esistente) + classe vibrate.

## 5. Mietitore Volante (nuovo `FlyingReaper.tsx`)

- Attraversa lo schermo da sx a dx con traiettoria sinusoidale (ogni 25-35s).
- Reso quasi totalmente nero; **occhi blu elettrico + lama** sempre brillanti (filter drop-shadow neon).
- Quando passa sopra il secchio: se la posizione del secchio è **fuori dal cerchio di luce** (distanza dal "centro luce" > radius), il mietitore **picchia** giù (animazione swoop) → −1 cuore diretto.
- Collision check ogni frame con i frutti `falling`: se la falce tocca un frutto, lo rimuovo + spawn nuvola di fumo grigio (riuso pattern `bursts`).
- All'ingresso: campana funebre + sussurro spettrale (loop fino a uscita).

## 6. Logica danni (in `FruitCatchMasterGame.tsx`)

- Teschio ghignante (era bomba): danno diretto 1 cuore (già implementato).
- Falce mietitore vs secchio: 1 cuore diretto (rispetta scudo / cuore dorato / invuln).
- Mani zombie: solo immobilizzazione 2.5s, nessun danno diretto.

## 7. Audio (`sfx.ts`)

Nuovi metodi:
- `bell()` — rintocco campana funebre (onda triangolare 220Hz lenta + riverbero gain decay).
- `dirtRise()` — rumore filtrato (white noise burst breve) per le mani zombie.
- `whisper()` — noise modulato a basso volume durante il passaggio del mietitore.
- `eyeRay()` — sweep di frequenza per il raggio dell'occhio.

## 8. Innesti in `FruitCatchMasterGame.tsx`

- Stati nuovi: `eyeRayState`, `zombieHands[]`, `reaperState`, `lightCenter {x,y}`, `lightRadius`.
- Tracker velocità secchio per il tremolio (delta posizione su rAF).
- Branch `level.biome === "shadowcemetery"` per montare i 4 componenti nuovi + scheduler timer.
- Intro modal "Cimitero delle Ombre" la prima volta (riuso `seenBiomesRef`).

## 9. Performance

- Su low-end (già rilevato in `BiomeOverlay`): disabilito trail luminoso + riduco frequenza picchiate del mietitore.
- Tutti gli effetti `pointer-events: none`.

## File toccati / creati

**Nuovi:** `SpectralEye.tsx`, `FlyingReaper.tsx`, `ZombieHands.tsx`, 4 immagini in `src/assets/`.
**Modificati:** `levels.ts`, `BiomeOverlay.tsx`, `FruitCatchMasterGame.tsx`, `sfx.ts`, `i18n.ts`.

Confermi e procedo? Dato il volume (~800-1000 righe), proporrei di consegnare in **un solo turno** ma testando solo la build TS — il QA visivo del bioma lo farai tu nella preview.