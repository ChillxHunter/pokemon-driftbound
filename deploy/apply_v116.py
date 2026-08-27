#!/usr/bin/env python3
from pathlib import Path
import re, sys
if len(sys.argv)!=2: raise SystemExit('usage: apply_v116.py <site-dir>')
site=Path(sys.argv[1]); index=site/'index.html'; movement=site/'v115_movement_camera.js'
i=index.read_text(encoding='utf-8')

# Reconstruct the compact v116 gameplay bundle before adding script tags.
import base64, gzip, json
core_b64=(site/'v116_core_part1.b64').read_text(encoding='utf-8').strip()+(site/'v116_core_part2.b64').read_text(encoding='utf-8').strip()
core=json.loads(gzip.decompress(base64.b64decode(core_b64)).decode('utf-8'))
for filename,source in core.items():
    (site/filename).write_text(source,encoding='utf-8')
# v116 owns doorway capture; keep v102 only for its door-mesh animation helper.
i=re.sub(r'\s*<script src="v112_door_sequence\.js\?v=[^"]+"></script>\s*','\n',i)
# Idempotently remove every v116 final tag.
tags=[
 'v116_trainer_youngster.js','v116_trainer_lass.js','v116_trainer_rising_male.js',
 'v116_trainer_ace_male.js','v116_trainer_ace_female.js',
 'v116_trainer_pack_1.js','v116_trainer_pack_2.js','v116_trainer_pack_3.js',
 'v116_trainer_scientist_part1.js','v116_trainer_scientist_part2.js','v116_trainer_scientist_part3.js','v116_trainer_scientist_part4.js',
 'v116_trainer_center_lady_part1.js','v116_trainer_center_lady_part2.js','v116_trainer_center_lady_part3.js','v116_trainer_center_lady_part4.js',
 'v116_trainers_runtime.js','v116_world_visuals.js','v116_interiors.js','v116_doors.js','v116_trainer_battle.js',
]
for name in tags:
 i=re.sub(rf'\s*<script src="{re.escape(name)}\?v=[^"]+"></script>\s*','\n',i)
anchor=re.search(r'<script src="v115_movement_camera\.js\?v=[^"]+"></script>',i)
if not anchor: raise SystemExit('v116 patch: v115 movement tag missing')
bundle='\n'+'\n'.join(f'  <script src="{name}?v=116-final"></script>' for name in tags)
i=i[:anchor.end()]+bundle+i[anchor.end():]
index.write_text(i,encoding='utf-8')

v102=site/'v102_building_doors.js'
v102s=v102.read_text(encoding='utf-8')
legacy_hook="    if(window.__DRIFTBOUND_DISABLE_V102_AUTODOOR__)return previousTryMove(dx,dy);\n"
legacy_anchor="  tryMove=function(dx,dy){\n    if(doorBusy)return;\n"
if legacy_hook.strip() not in v102s:
 if legacy_anchor not in v102s: raise SystemExit('v116 patch: v102 tryMove anchor missing')
 v102s=v102s.replace(legacy_anchor,"  tryMove=function(dx,dy){\n"+legacy_hook+"    if(doorBusy)return;\n",1)
v102.write_text(v102s,encoding='utf-8')

m=movement.read_text(encoding='utf-8')
hook="    if(window.__DRIFTBOUND_V116_DOOR_PRECHECK__?.(state,dx,dy))return false;\n"
needle="  function startStep(world,state,dx,dy){\n    if(!canStartStep(state,dx,dy))return false;\n"
if hook.strip() not in m:
 if needle not in m: raise SystemExit('v116 patch: movement startStep anchor missing')
 m=m.replace(needle,"  function startStep(world,state,dx,dy){\n"+hook+"    if(!canStartStep(state,dx,dy))return false;\n",1)
movement.write_text(m,encoding='utf-8')
