# Attempt five verification

The Node controller simulation (`node tests/simulate.mjs`) runs the actual
session module, campaign, police, collision and vehicle code. It replaces
WebGL output, DOM paint and audio devices with shims. Keyboard events drive
all movement and mission transitions. No mission state or player coordinates
are injected. All four jobs passed, ending at $5,600 and the completion screen.
This is a logic integration test, not the required Chromium playtest.

Browser validation could not start in this restricted session:

- The local static server failed with `listen EPERM` on 127.0.0.1:8095.
- Installed Chromium failed with `setsockopt: Operation not permitted`.
- The installed headless shell also failed with `shutdown: Operation not permitted`.
- The repository `.git` directory is mounted read-only; staging failed when
  Git attempted to create `.git/index.lock`.

The screenshots currently in the repository remain OLD reference captures.
No fresh browser screenshot was produced. Do not treat those images as
captures of attempt five. The build runs and produces parseable dossier JSON,
but its screenshot inputs are stale until `tests/capture.py` succeeds.

Once the runtime permits browser and server sockets and Git writes:

1. Start `PORT=8095 node serve.ts` in a separate terminal.
2. Run `python3 tests/play_chain.py` and fix any browser-only failures.
3. Run `python3 tests/capture.py` and inspect all four fresh screenshots.
4. Run `MAKEFUN_OUTPUT_DIR=out node main.ts` again.
5. Commit and push main. No submission or kit check was run in this session.
