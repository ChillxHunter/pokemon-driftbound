from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
p = root / 'index.html'
s = p.read_text(encoding='utf-8')

if 'v92_style.css' not in s:
    s = s.replace('</head>', '  <link rel="stylesheet" href="v92_style.css?v=region-92">\n</head>')
if 'v92_world_patch.js' not in s:
    s = s.replace('</body>', '  <script src="v92_world_patch.js?v=region-92"></script>\n  <script src="v92_gameplay_patch.js?v=region-92"></script>\n</body>')

p.write_text(s, encoding='utf-8')
