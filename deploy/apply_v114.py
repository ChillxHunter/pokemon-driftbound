#!/usr/bin/env python3
from pathlib import Path
import re
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: apply_v114.py <site-dir>')

site = Path(sys.argv[1])
game = site / 'game.js'
index = site / 'index.html'

s = game.read_text(encoding='utf-8')

# v89's held-movement loop is still the authoritative logical movement input.
# Give it a stable PC cadence so held keys don't outpace the visual player and
# build up delayed movement.
needle = "const interval=HELD_MOVE_INTERVAL*(diagonal?Math.SQRT2:1);"
if needle not in s:
    raise SystemExit('v114 patch: held movement interval line missing')
s = s.replace(
    needle,
    "const interval=125*(diagonal?Math.SQRT2:1);",
    1
)

# Make the first held step use the same cadence. This appears in keyboard and
# touch setup after the v89 patch.
if "HELD_MOVE_INTERVAL*Math.SQRT2" not in s:
    raise SystemExit('v114 patch: held movement startup cadence missing')
s = s.replace("HELD_MOVE_INTERVAL*Math.SQRT2", "125*Math.SQRT2")

game.write_text(s, encoding='utf-8')

i = index.read_text(encoding='utf-8')

# v113 stacked a second camera update on top of the old movement camera, causing
# visible wobble. Remove that script completely from the built page.
i = re.sub(
    r'\s*<script src="v113_global_camera\.js\?v=[^"]+"></script>\s*',
    '\n',
    i
)

door_script = '  <script src="v112_door_sequence.js?v=doors-112"></script>\n'
movement_script = '  <script src="v114_movement_camera.js?v=movement-114"></script>\n'

if door_script not in i:
    raise SystemExit('v114 patch: v112 door script tag missing')

if 'v114_movement_camera.js' not in i:
    # Load v114 BEFORE v112. v112 then wraps this stable renderer only while a
    # guided door sequence is active.
    i = i.replace(door_script, movement_script + door_script, 1)

index.write_text(i, encoding='utf-8')
