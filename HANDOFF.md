# Silent Wake: handoff

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · three 0.186 · @react-three/fiber 9 · drei 10 · postprocessing. No backend. The shell (story mode, presenter notes, Ctrl K palette, steps) is carried over from Fogdrinker/Morpho Lab and restyled; models, sound and design are new.

## Design
A biomimicry test facility at night: near-black graphite, anechoic foam wedges that fade in at the screen edges (`body::before`), and the deck's violet→rose podium glow (`body::after`). Instrument Serif display, Geist body, Geist Mono for labels and readouts. Each chapter is a "test cell" that tints the facility (`body[data-cell]`, set per route in `lib/site.ts` `CELLS`): owl amber, boxfish yellow, shark cyan, summary rose. 3D stages have bracket corners, a REC light and a cell tag (`Plate`, `CellTag` in `components/ui.tsx`). Sliders are mixing-console faders; toggles are lit console buttons; the masthead has a live sound-level meter (`SplMeter` in `Shell.tsx`).

## Sound (`lib/audio.ts`)
One AudioContext, created on the first click or `M`. A `Voice` is white noise split into ten octave bands (31.5 Hz–16 kHz), each band given the level a model predicts, plus optional tones (oscillators) and a flutter LFO (wingbeats, blade passes). Band gains remove white noise's bandwidth tilt, so a 3 dB model change is a 3 dB change you hear; absolute loudness is your speakers'. `useVoice()` (ui.tsx) makes one per model and stops it on unmount. `Analyser` draws model spectra over log frequency with the live output behind them. `dbaOf()` and `aWeight()` (IEC 61672) give every dBA figure.

## Physics (all in `lib/`)
- `jet.ts`: SAE/Tanna OASPL fit to Lighthill (`oaspl`); a two-hump Tam-style spectrum in Strouhal number; chevron effect `chevronDelta` (low-frequency cut, high-frequency rise, from Bridges & Brown 2004 / Saiyed et al. 2000 trends; constants fitted so a 12-tooth, 60%-bend nozzle gives about −2 dBA); `thrustLoss`; ISO 9613-1 air absorption; the take-off footprint (`levelTable`, `distToPath`, `TWIN_CAL_DB`: −9 dB lumped ground/shielding/cut-back, calibrated to ~77 dBA at 450 m sideline for a 787-class twin, i.e. its ~89 EPNdB lateral figure); bypass ratio → jet speed; owl wing self-noise (`wingNoise`: U⁵ plain edge, U⁶ porous fringe after Jaworski & Peake 2013; up to ~18 dB above 1.6 kHz as in the deck).
- `car.ts`: drag ½ρv²CdA, rolling resistance, a fuel model fitted to the deck's 4.3 vs 5.4 L/100 km, EV range on 60 kWh; the Wind Tunnel's drag build-up `bodyCd` (teaching model calibrated so presets land on 0.06 / 0.19 / ~0.33 / ~1.0); wind/buffeting noise; yaw moments (`YAW`, after Van Wassenbergh et al. 2015).
- `riblet.ts`: wall units (Cf = 0.0592 Re⁻⁰·², uτ, ν/uτ, s⁺); Bechert-type drag-reduction curves per shape (blade 9.9%, scalloped 6.5%, sawtooth 5%, peak s⁺ ≈ 15–17, drag increase past ~28); flow-noise change 20 log(1−DR); submarine source spectra (machinery, flow, propeller with depth-dependent cavitation); passive sonar equation `detectionKm`; Wei et al. 2025 designs (`ARRAY_DESIGNS`, values exactly as deck slide 34; "n/r" kept as not reported).
- Quick numeric check: `npx tsx` on a scratch script importing these modules (see the checks run during the build: footprint levels, Cd presets, fuel, s⁺ for a mako ≈ 16 at 50 µm).

## 3D building blocks (`components/three/`)
`Stage3D` (studio environment, key/fill/rim lights, AO/DOF optional, bloom → ACES → contrast → vignette → grain → SMAA; pauses off-screen; `localClippingEnabled` for cutaways), `Label3D` (mono billboard + dashed leader), `Floor` (reflective slab + grid), `Turbofan` (revolved nacelle/cowls, fan and stage blade rings, quarter cutaway via two intersected clipping planes, `chevronNozzle` generator with triangle/sine/asym/owl teeth) + `Plume` (GPU particles, stateless: lobes per tooth, KH rings without chevrons), `Jetliner`, `Owl`, `Bodies` (lofted `Boxfish` with hex-plate/spot skin shader and beating fins, `TunnelBody`, `Wheel`, `useFishSkin`), `Reef`, `WindTunnel`, `TunnelSmoke` (exact Stokes-stream-function streamlines around an ellipsoid, solved per particle on the GPU; speed colouring; wake and separation), `Shark` (vertex-shader body wave, countershading), `Denticles` (three-ridged crowns, instanced), `RibletWall` (`RibSurface` + `NearWallFlow` helical vortices), `Submarine` (anechoic tiles, riblet sheen, skewed prop, cavitation helix, `SoundRings`).
`lib/scene/loft.ts` lofts superellipse sections along z (nose +z); `lib/scene/bodies.ts` holds every profile (boxfish, Bionic, compact, brick, `sculpt(Body)`, shark, submarine, fuselage) so fish and car can be morphed section by section.

## Gotchas
1. A hidden or minimised Chrome window stops requestAnimationFrame, so scenes freeze. For checks use a visible window or headless Chrome with GPU.
2. Story mode and presenter mode persist in localStorage (`silentwake.*`), shared across tabs of the same origin.
3. The "1 Issue" hydration badge in dev comes from a browser extension stamping `<body>`; `suppressHydrationWarning` is set on body.
4. Don't snap cameras each frame under OrbitControls; glide for a moment, then release (see `Rig` in `ch3/SkinDive.tsx`).
5. Steps follow `#step-N` and listen to `hashchange`, so story navigation and links land on the right model.
6. Browsers need a click before audio; the SPL meter or `M` creates the AudioContext. Voices made before that call `setSpectrum` again when `on` flips (every model's effect depends on `on`).

## Honesty notes (shown on the pages too)
- The deck's owl-serrated nozzle figures (7–10 dB, 4–8% penalty) are shown as the deck's; the model's own owl dual-scale nozzle gives ~−5 dBA.
- The Bionic Car's 80% NOx cut came from its SCR exhaust treatment, not its shape.
- The boxfish is destabilising in yaw (2015 flow-tank study), contrary to the "stable" story; Chapter II step 4 shows it.
- Wei et al. 2025 is a simulation; unreported values are played and plotted as unchanged / grey.
