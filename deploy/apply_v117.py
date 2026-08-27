#!/usr/bin/env python3
from pathlib import Path
import re, sys

if len(sys.argv)!=2:
    raise SystemExit('usage: apply_v117.py <site-dir>')
site=Path(sys.argv[1])
index=site/'index.html'
game=site/'game.js'
css106=site/'v106_mobile_battle_layout.css'
css107=site/'v107_mobile_battle_columns.css'
for p in (index,game,css106,css107):
    if not p.exists(): raise SystemExit(f'v117: missing {p.name}')

# Verify the rebuilt game really contains the intended battle UI before cache-busting it.
s=game.read_text(encoding='utf-8')
start=s.find('function mainBattleControlsHtml(mon){')
end=s.find('\nfunction battleMoveMenu(){',start)
if start < 0 or end < 0:
    raise SystemExit('v117: main battle controls function missing')
battle=s[start:end]
required=[
    'battleMoveZone battleMoveZoneSplit',
    'battleMobileMessageBox',
    'id="pokemonButton"',
    'id="battleBagButton"',
    'id="lastBallButton"',
    'id="runButton"',
]
for needle in required:
    if needle not in battle:
        raise SystemExit(f'v117: battle UI missing {needle}')
if 'id="studyButton"' in battle or '>Study<' in battle or 'id="captureButton"' in battle:
    raise SystemExit('v117: legacy Study/Capture controls still active')

# The v106/v107 mobile CSS is the intended left-text / right-moves layout.
c107=css107.read_text(encoding='utf-8')
for needle in ('grid-template-columns:minmax(0,34%) minmax(0,66%)','grid-column:1!important','grid-column:2!important'):
    if needle not in c107:
        raise SystemExit(f'v117: expected mobile battle column rule missing: {needle}')

i=index.read_text(encoding='utf-8')
# Force phones to fetch the rebuilt game.js instead of reusing the ancient movement-89 cache key.
i,n=re.subn(r'game\.js\?v=[^"\']+', 'game.js?v=battle-117', i, count=1)
if n!=1: raise SystemExit('v117: game.js script tag missing')
# Refresh every stylesheet that participates in the battle layout.
for name in ('v105_mobile_battle_cleanup.css','v106_mobile_battle_layout.css','v107_mobile_battle_columns.css'):
    pattern=rf'{re.escape(name)}\?v=[^"\']+'
    repl=f'{name}?v=battle-117'
    i,n=re.subn(pattern,repl,i,count=1)
    if n!=1: raise SystemExit(f'v117: {name} link missing')
index.write_text(i,encoding='utf-8')
