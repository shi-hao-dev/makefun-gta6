# Solmar Heat

[![Competition](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank: shi-hao-dev/makefun-gta6](https://make.fun/badge/gta6-01/shi-hao-dev/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard)
[![Reward: shi-hao-dev/makefun-gta6](https://make.fun/badge/gta6-01/shi-hao-dev/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime story in sunny Solmar Bay. Attempt five is a fresh implementation with separate district, population, dispatch, story, audio and interface modules. All graphics and sounds are procedural; three.js is supplied locally. The game makes no external requests.

Run `node serve.ts`, then visit `http://127.0.0.1:8080`. No installation or compilation is needed (Node 22+). WASD moves on foot and points your car in the desired street direction. Shift sprints or boosts; Space brakes; E enters/exits cars. Aim with the mouse and click to fire the pistol. Escape pauses; M toggles sound. Enter or the button starts/resumes. N at the title clears your save.

Lena's eight jobs chain automatically:

1. **Warm-Up Wheels — $500:** steal the red Comet and deliver it to Cruz Customs.
2. **Marina Drop — $900:** drive south to the pier, exit to collect the package, then deliver it to Starfish Motel.
3. **Heat Wave — $1,200:** escape three stars. Gold checkpoints trace an inner-road loop. Turn at intersections and boost down straights. Pursuers recover for nine seconds after a ram; they cannot push your vehicle outside the road grid. Outrun their 46 m detection radius to cool down.
4. **Solmar Score — $3,000:** arrive at Bay Bank on foot, hold its entrance for 12 seconds under four-star pressure, then drive to the safehouse.

5. **Condor Rising — $1,500:** drive the Comet through three gold checkpoints under locked four-star CONDOR-1 pursuit.
6. **Roadblock Run — $2,000:** collect the smuggler package on foot at the pier, then deliver to Starfish Motel through four-star roadblocks.
7. **The Vault Job — $2,500:** hold The Tide Club vault ring for 12 seconds with CONDOR-1 overhead, then drive to the safehouse. Start on foot; the car provides cover while holding.
8. **King of Solmar — $5,000:** shed five stars at five gold checkpoints, then drive to the safehouse. Total story earnings: **$16,600**.

CONDOR-1 is a procedural helicopter with animated main/tail rotors and a translucent search cone aimed at the player. It follows at 28 m altitude. At four or five stars, dispatch also places two static roadblocks on avenues, each with two cruisers and a striped barrier. Contact slows the car and sounds an alert. Air support and roadblocks clear below four stars; pursuing cars and foot officers remain separate.

Explore afterward for eight $150 stashes. Traffic, pedestrians, stealable vehicles, five wanted levels, foot officers, vehicle damage, health, a live radar, procedural audio, local saves, retry screens and story completion are included. Saves use a new slot to isolate earlier versions.

`node tests/simulate.mjs` validates all eight jobs, both holds, $16,600, support lifecycle, pause, combat, save and collision bounds using the actual session with a rendering shim. `python3 tests/play_chain.py` drives the full story through browser keyboard input and checks local request/error counts. `python3 tests/capture.py` replaces all four real 1280×720 screenshots from isolated deterministic scenes listed in `shots.json`. `MAKEFUN_OUTPUT_DIR=out node main.ts` copies the game and screenshots and generates the kit dossier. The kit helper and minified third-party engine retain their upstream contents as required by the rules.

Shot staging (`?shot=NAME&seed=7`) freezes simulation at authored compositions: cover shows the coastal Comet and air support; street shows foot travel, traffic, pedestrians and background barricades; chase shows a five-star Comet pursuit with CONDOR-1 and a roadblock ahead; mission shows The Vault Job at The Tide Club with its gold hold ring. Each keeps the HUD and radar and adds a small shot-only systems label. Existing JPGs are preserved for a separate capture session.

Source map: `storyline.js` owns eight job phases and awards; `dispatch.js` owns pursuit, helicopter and static blocks; `session.js` integrates controls, roadblock impacts, saves, deterministic shots and read-only `solmarState()` telemetry (including `heli` and `blocks`); `district.js` owns named sites, gold objective rings and stashes; `population.js` owns vehicles and pedestrians; `overlay.js` draws mission status and minimap; `geometry.js` supplies seeded geometry and collision; `synth.js` generates audio locally.

Built for [make.fun gta6-01](https://make.fun/bounty/gta6-01). Referral: [ssmh6x4k](https://make.fun/?ref=ssmh6x4k).
