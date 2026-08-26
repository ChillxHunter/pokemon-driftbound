#!/usr/bin/env python3
from pathlib import Path
import re
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: apply_v115.py <site-dir>')

site = Path(sys.argv[1])
game = site / 'game.js'
index = site / 'index.html'

s = game.read_text(encoding='utf-8')

# v115 owns visual movement continuously. The old v89/v114 held-key loop must
# only publish the current input vector; it must not move the logical player on
# its own or both controllers will fight and produce the tile-by-tile jank.
pattern = re.compile(
    r"function processHeldMovement\(time\)\{\n"
    r"  if\(!heldMovement\.size\)return;\n"
    r"  const move=heldMovementVector\(\);\n"
    r"  if\(!move\[0\]&&!move\[1\]\)return;\n"
    r"  const diagonal=!!\(move\[0\]&&move\[1\]\);\n"
    r"  const interval=125\*\(diagonal\?Math\.SQRT2:1\);\n"
    r"  if\(time-lastHeldMove<interval\)return;\n"
    r"  lastHeldMove=time;\n"
    r"  tryMove\(move\[0\],move\[1\]\);\n"
    r"\}"
)
replacement = """function processHeldMovement(time){
  const move=heldMovementVector();
  window.__DRIFTBOUND_MOVE_INPUT__=[move[0],move[1]];
}"""
s, count = pattern.subn(replacement, s, count=1)
if count != 1:
    raise SystemExit('v115 patch: v114 held movement loop not found')

# Bridge the existing game-state collision and lock rules into the v115 visual
# controller. These closures remain authoritative, so battles, menus, dialogue,
# doors, and map collision keep exactly the same gameplay behavior.
bridge = r'''

/* v115 continuous movement bridge. */
window.__DRIFTBOUND_MOVE_INPUT__=[0,0];
window.__DRIFTBOUND_WALKABLE__=(x,y)=>walkable(x,y);
window.__DRIFTBOUND_MOVE_BLOCKED__=()=>
  !S.started||inputLocked||B||activePanel||!DOM.dialogue.classList.contains('hidden');
'''
if '__DRIFTBOUND_WALKABLE__' not in s:
    s += bridge

game.write_text(s, encoding='utf-8')

i = index.read_text(encoding='utf-8')

# v115 supersedes v114 entirely. Do not leave two player/camera renderers loaded.
i = re.sub(
    r'\s*<script src="v114_movement_camera\.js\?v=[^"]+"></script>\s*',
    '\n',
    i
)

# v115 world rework must load BEFORE v112: v112 then wraps the new Pokémon
# Center model to add the working vestibule/door traversal. Likewise v115
# movement must load before v112 so the door guide can temporarily wrap it.
door_match = re.search(r'\s*<script src="v112_door_sequence\.js\?v=[^"]+"></script>\s*', i)
if not door_match:
    raise SystemExit('v115 patch: v112 door script tag missing')

bundle = (
    '  <script src="v115_trainer_mesh_pack1.js?v=trainers-115"></script>\n'
    '  <script src="v115_world_rework.js?v=world-115"></script>\n'
    '  <script src="v115_movement_camera.js?v=movement-115"></script>\n'
)
if 'v115_movement_camera.js' not in i:
    i = i[:door_match.start()] + '\n' + bundle + i[door_match.start():]

index.write_text(i, encoding='utf-8')
