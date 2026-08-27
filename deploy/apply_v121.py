#!/usr/bin/env python3
from pathlib import Path
import re, sys

if len(sys.argv)!=2:
    raise SystemExit('usage: apply_v121.py <site-dir>')
site=Path(sys.argv[1])
index=site/'index.html'
world_js=site/'v121_world_reset.js'
world_css=site/'v121_world_reset.css'
battle_js=site/'v121_battle_reset.js'
battle_css=site/'v121_battle_reset.css'
for p in (index,world_js,world_css,battle_js,battle_css):
    if not p.exists(): raise SystemExit(f'v121: missing {p.name}')

html=index.read_text(encoding='utf-8')

for old in ('v119_living_world.js','v120_world_foundation.js'):
    html=re.sub(rf'\s*<script\s+src=["\']{re.escape(old)}\?[^"\']+["\']></script>', '', html)

for href in ('v121_world_reset.css?v=world-reset-121','v121_battle_reset.css?v=battle-reset-121'):
    if href not in html:
        if '</head>' not in html: raise SystemExit('v121: </head> anchor missing')
        html=html.replace('</head>',f'  <link rel="stylesheet" href="{href}">\n</head>',1)

for src in ('v121_battle_reset.js?v=battle-reset-121','v121_world_reset.js?v=world-reset-121'):
    if src not in html:
        if '</body>' not in html: raise SystemExit('v121: </body> anchor missing')
        html=html.replace('</body>',f'  <script src="{src}"></script>\n</body>',1)

html=re.sub(r'game\.js\?v=[^"\']+', 'game.js?v=battle-121', html, count=1)
for name in ('v105_mobile_battle_cleanup.css','v106_mobile_battle_layout.css','v107_mobile_battle_columns.css'):
    html=re.sub(rf'{re.escape(name)}\?v=[^"\']+', f'{name}?v=battle-121', html, count=1)

index.write_text(html,encoding='utf-8')
