# Solmar Heat

[![Competition](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank: shi-hao-dev/makefun-gta6](https://make.fun/badge/gta6-01/shi-hao-dev/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard)
[![Reward: shi-hao-dev/makefun-gta6](https://make.fun/badge/gta6-01/shi-hao-dev/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime story in sunny Solmar Bay. Attempt five is a fresh implementation with separate district, population, dispatch, story, audio and interface modules. All graphics and sounds are procedural; three.js is supplied locally. The game makes no external requests.

Run `node serve.ts`, then visit `http://127.0.0.1:8080`. No installation or compilation is needed (Node 22+). WASD moves on foot and points your car in the desired street direction. Shift sprints or boosts; Space brakes; E enters/exits cars. Aim with the mouse and click to fire the pistol. Escape pauses; M toggles sound. Enter or the button starts/resumes. N at the title clears your save.

Lena's four jobs chain automatically:

1. **Warm-Up Wheels — $500:** steal the red Comet and deliver it to Cruz Customs.
2. **Marina Drop — $900:** drive south to the pier, exit to collect the package, then deliver it to Starfish Motel.
3. **Heat Wave — $1,200:** escape three stars. Gold checkpoints trace an inner-road loop. Turn at intersections and boost down straights. Pursuers recover for nine seconds after a ram; they cannot push your vehicle outside the road grid. Outrun their 46 m detection radius to cool down.
4. **Solmar Score — $3,000:** arrive at Bay Bank on foot, hold its entrance for 12 seconds under four-star pressure, then drive to the safehouse. Total story earnings: **$5,600**.

Explore afterward for eight $150 stashes. Traffic, pedestrians, stealable vehicles, five wanted levels, foot officers, vehicle damage, health, a live radar, procedural audio, local saves, retry screens and story completion are included. Saves use a new slot to isolate earlier versions.

`python3 tests/play_chain.py` drives the full story through browser keyboard input and checks local request/error counts. `python3 tests/capture.py` replaces all four real 1280×720 screenshots from isolated deterministic scenes listed in `shots.json`. `MAKEFUN_OUTPUT_DIR=out node main.ts` copies the game and screenshots and generates the kit dossier. The kit helper and minified third-party engine retain their upstream contents as required by the rules.

Built for [make.fun gta6-01](https://make.fun/bounty/gta6-01). Referral: [ssmh6x4k](https://make.fun/?ref=ssmh6x4k).
