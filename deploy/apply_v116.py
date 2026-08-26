#!/usr/bin/env python3
from pathlib import Path
import re
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: apply_v116.py <site-dir>')

site = Path(sys.argv[1])
index = site / 'index.html'

i = index.read_text(encoding='utf-8')

# v116 fully replaces the v112 door interception layer. Keep v102 loaded because
# its animateDoor helper drives the named sliding/hinged door meshes created by
# v116, but do not let the old y+3 entry/exit math intercept movement anymore.
i = re.sub(
    r'\s*<script src="v112_door_sequence\.js\?v=[^"]+"></script>\s*',
    '\n',
    i,
)

# Remove any previous v116 tags so the patch is idempotent and always writes the
# authoritative ordering below.
for filename in (
    'v116_trainer_mesh_pack.js',
    'v116_world_fix.js',
    'v116_door_sequence.js',
):
    i = re.sub(
        rf'\s*<script src="{re.escape(filename)}\?v=[^"]+"></script>\s*',
        '\n',
        i,
    )

movement_match = re.search(
    r'<script src="v115_movement_camera\.js\?v=[^"]+"></script>',
    i,
)
if not movement_match:
    raise SystemExit('v116 patch: v115 movement script tag missing')

bundle = (
    '\n  <script src="v116_trainer_mesh_pack.js?v=trainers-116"></script>\n'
    '  <script src="v116_world_fix.js?v=world-116"></script>\n'
    '  <script src="v116_door_sequence.js?v=doors-116"></script>'
)
pos = movement_match.end()
i = i[:pos] + bundle + i[pos:]

index.write_text(i, encoding='utf-8')
