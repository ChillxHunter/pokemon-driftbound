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

# v110 replaces the v109 approach patch. It uses a staged sequence:
# stop outside -> open -> walk through -> close -> transition, and also gives
# the Pokemon Center doorway a light vestibule matching the interior floor.
script = '  <script src="v110_door_sequence.js?v=doors-110"></script>\n'
if 'v110_door_sequence.js' not in i:
    i = i.replace('</body>', script + '</body>')

index.write_text(i, encoding='utf-8')
