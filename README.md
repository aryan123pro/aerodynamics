# Silent Wake

An interactive 3D test facility that goes with the presentation **"Biomimicry for Noise Reduction / Enhanced Aerodynamic Design"** (Krish Dhume C155, Yashil Doshi C158, Lakshya Kamat C170 · B.Tech CE Div C). Every model is 3D, runs published physics live in the browser, and most of them make sound.

```
npm install
npm run dev      # http://localhost:3000
npm run build    # all routes prerender as static pages
```

| Route | What it is |
|---|---|
| `/` | Lobby: three podiums (owl, boxfish, shark ⇄ chevron engine, Bionic Car, submarine), the problem statement, chapters and labs |
| `/owl` | Ch I (5 steps): night take-off noise footprint over a town, the owl wing in a smoke tunnel, a cutaway turbofan (Lighthill U⁸), chevrons with A/B listening, the deck's numbers |
| `/boxfish` | Ch II (5 steps): boxfish on a reef, five models in a wind tunnel, fish → car morph with an SKO skeleton, the 2015 yaw-stability twist, road test and the deck's numbers |
| `/shark` | Ch III (5 steps): zoom from shark to denticle, riblets lifting near-wall vortices, why submarines are loud (sonar scope), riblets on a towed sonar array, the deck's numbers |
| `/summary` | Ch IV (2 steps): all six designs in a 3D trade-off space, and future possibilities |
| `/nozzle-lab` | L1: design chevrons, listen from a ring of 13 microphones, plot your designs on the noise/thrust trade-off |
| `/wind-tunnel` | L2: sculpt a car body with six sliders, read the drag breakdown, drive it 100 km |
| `/towing-tank` | L3: size riblets for a 100 m ship, see s⁺, drag cut, power and fuel saved, and what wear does |
| `/references` | Sources (`#sources`), the deck (`#slides`), the team (`#team`) |

Keys: arrows move between steps, `S` story mode (full screen, 20-minute clock), `M` sound, `P` presenter notes, `F` full screen, `Ctrl K` jump anywhere.

See `HANDOFF.md` for the physics, the sound engine, the 3D building blocks and the gotchas.
