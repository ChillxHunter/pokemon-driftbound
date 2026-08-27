#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: apply_v119.py <site-dir>')

site = Path(sys.argv[1])
index = site / 'index.html'
world = site / 'v119_living_world.js'

for p in (index, world):
    if not p.exists():
        raise SystemExit(f'v119: missing {p.name}')

html = index.read_text(encoding='utf-8')
script = '  <script src="v119_living_world.js?v=living-world-119"></script>\n'

if 'v119_living_world.js' not in html:
    if '</body>' not in html:
        raise SystemExit('v119: </body> anchor missing')
    html = html.replace('</body>', script + '</body>', 1)

index.write_text(html, encoding='utf-8')
