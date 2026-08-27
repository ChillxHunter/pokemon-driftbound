#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv)!=2:
    raise SystemExit("usage: apply_v120.py <site-dir>")
site=Path(sys.argv[1])
index=site/"index.html"
world=site/"v120_world_foundation.js"
for f in (index,world):
    if not f.exists(): raise SystemExit(f"v120: missing {f.name}")
html=index.read_text(encoding="utf-8")
script='  <script src="v120_world_foundation.js?v=world-120"></script>\n'
if "v120_world_foundation.js" not in html:
    if "</body>" not in html: raise SystemExit("v120: </body> anchor missing")
    html=html.replace("</body>",script+"</body>",1)
# Re-cache the already restored v117 battle UI so phones do not reuse the old
# Study/Capture build. No battle logic or layout is changed here.
html=html.replace("game.js?v=battle-117","game.js?v=battle-120")
html=html.replace("v105_mobile_battle_cleanup.css?v=battle-117","v105_mobile_battle_cleanup.css?v=battle-120")
html=html.replace("v106_mobile_battle_layout.css?v=battle-117","v106_mobile_battle_layout.css?v=battle-120")
html=html.replace("v107_mobile_battle_columns.css?v=battle-117","v107_mobile_battle_columns.css?v=battle-120")
index.write_text(html,encoding="utf-8")
