#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: apply_v107.py <site-dir>')

site = Path(sys.argv[1])
game = site / 'game.js'
s = game.read_text(encoding='utf-8')

# v107 depends on the v106 structural battle menu, so fail the build rather than
# silently shipping the old Study/Capture UI again.
required = [
    'battleMoveZone battleMoveZoneSplit',
    'id="pokemonButton"',
    '<b>Last Ball Used</b>',
    'battleMobileMessageBox'
]
for needle in required:
    if needle not in s:
        raise SystemExit(f'v107 patch: required v106 battle structure missing: {needle}')

index = site / 'index.html'
i = index.read_text(encoding='utf-8')
link = '  <link rel="stylesheet" href="v107_mobile_battle_columns.css?v=mobile-107">\n'
if 'v107_mobile_battle_columns.css' not in i:
    i = i.replace('</head>', link + '</head>')
else:
    import re
    i = re.sub(r'v107_mobile_battle_columns\.css\?v=[^"\']+', 'v107_mobile_battle_columns.css?v=mobile-107', i)

# v112 handles staged building traversal and clear exit landing.
script = '  <script src="v112_door_sequence.js?v=doors-112"></script>\n'
if 'v112_door_sequence.js' not in i:
    i = i.replace('</body>', script + '</body>')

# v113 makes the steep/top-down v112 door camera the normal camera everywhere.
# Load it after v112 so it is authoritative during both regular exploration and
# guided entry/exit sequences.
camera_script = '  <script src="v113_global_camera.js?v=camera-113"></script>\n'
if 'v113_global_camera.js' not in i:
    i = i.replace('</body>', camera_script + '</body>')

index.write_text(i, encoding='utf-8')
