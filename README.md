# Solmar Heat

[![Competition](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank: shi-hao-dev/makefun-gta6](https://make.fun/badge/gta6-01/shi-hao-dev/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard)
[![Reward: shi-hao-dev/makefun-gta6](https://make.fun/badge/gta6-01/shi-hao-dev/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime story in Solmar Bay, from the marina boardwalk to Bay Bank. All graphics and sounds are procedural; three.js is supplied locally. The game makes no external requests.

Run `node serve.ts`, then visit `http://127.0.0.1:8080`. No installation or compilation is needed (Node 22+). WASD moves on foot and points your car in the desired street direction. Shift sprints or boosts; Space brakes; E interacts. Aim with the mouse and click to fire. Use 1–3 or Q to switch between the unlimited pistol, five-pellet shotgun and rapid-fire SMG. R cycles Solmar FM, Coastal and Night Drive; M mutes. Escape pauses; Enter or the button starts or resumes. N at the title clears your save.

Lena's twelve jobs chain automatically:

1. **Warm-Up Wheels — $500:** steal the red Comet and deliver it to Cruz Customs.
2. **Marina Drop — $900:** drive south to the pier, exit to collect the package, then deliver it to Starfish Motel.
3. **Heat Wave — $1,200:** escape three stars. Gold checkpoints trace an inner-road loop. Turn at intersections and boost down straights. Pursuers recover for nine seconds after a ram; they cannot push your vehicle outside the road grid. Outrun their 46 m detection radius to cool down.
4. **Solmar Score — $3,000:** arrive at Bay Bank on foot, hold its entrance for 12 seconds under four-star pressure, then drive to the safehouse.

5. **Condor Rising — $1,500:** drive the Comet through three gold checkpoints under locked four-star CONDOR-1 pursuit.
6. **Roadblock Run — $2,000:** collect the smuggler package on foot at the pier, then deliver to Starfish Motel through four-star roadblocks.
7. **The Vault Job — $2,500:** hold The Tide Club vault ring for 12 seconds with CONDOR-1 overhead, then drive to the safehouse. Start on foot; the car provides cover while holding.
8. **King of Solmar — $5,000:** shed five stars at five gold checkpoints, then drive to the safehouse.
9. **Night Shift — $3,000:** make two deliveries after dark with three stars locked and CONDOR-1 circling.
10. **The Getaway — $3,500:** drive the Comet through four checkpoints with four stars and roadblocks active.
11. **Respect the Bay — $4,000:** find three stashes and deliver the haul to the safehouse under four-star pressure.
12. **Solmar Legend — $6,000:** shed five stars, hold Bay Bank for 12 seconds, then drive to the safehouse. Total story earnings: **$33,100**.

CONDOR-1 circles at 28 m with animated rotors and a search cone starting at three stars. At four stars, dispatch also places two avenue roadblocks, each with two cruisers and a striped barrier that slows cars. The minimap marks air support in gold, roadblocks as red squares, Cruz Customs in blue and Solmar Supply in green.

Stashes replenish shotgun and SMG ammo; off-mission stashes also pay $150. Story milestones and stash discoveries raise respect from STREET through HUSTLER and PLAYER to KINGPIN. While in the Comet at Cruz Customs, press U and use 1–3 to buy engine, armor and handling levels. Higher engine levels require HUSTLER and PLAYER; max armor requires KINGPIN. On foot at Solmar Supply, press E and use 1–3 to buy shells, rounds or first aid. Story, stash discoveries, ammo and Comet upgrades save locally.

`node tests/simulate.mjs` drives all twelve jobs through the actual session with a rendering shim. It checks the $33,100 finish, weapon switching, rank progression, shop and garage purchases, radio, pursuit, pause, combat, save/resume, collision bounds, and portrait camera framing. `python3 tests/play_chain.py` drives the story through browser keyboard input and checks requests and errors. `python3 tests/capture.py` captures the four 1280×720 views listed in `shots.json`. `MAKEFUN_OUTPUT_DIR=out node main.ts` packages the runtime and existing JPGs and generates the kit dossier.

Shot staging (`?shot=NAME&seed=7`) freezes four compositions: the Comet at the boardwalk with distant air support; Solmar Supply with pedestrians, traffic and a barricade; a five-star Comet chase with CONDOR-1 and a roadblock ahead; and the Solmar Legend hold at Bay Bank, with the gold ring and air support staged together. Each keeps the HUD and radar and adds a systems label. The JPGs are preserved for a separate capture session.

Source map: `storyline.js` owns job phases, payouts and respect; `dispatch.js` owns pursuit, CONDOR-1 and roadblocks; `session.js` handles weapons, purchases, saves, portraits and read-only `solmarState()` telemetry; `district.js` builds the boardwalk, sites and stashes; `population.js` applies Comet upgrades and varies traffic and pedestrians; `overlay.js` draws the HUD and minimap; `geometry.js` supplies seeded geometry and collision; `synth.js` generates the three radio stations and audio effects.

Built for [make.fun gta6-01](https://make.fun/bounty/gta6-01). Referral: [ssmh6x4k](https://make.fun/?ref=ssmh6x4k).
