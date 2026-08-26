from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
p = root / 'index.html'
s = p.read_text(encoding='utf-8')

if 'v93_character_patch.js' not in s:
    s = s.replace('</body>', '  <script src="v93_character_patch.js?v=character-93"></script>\n</body>')

p.write_text(s, encoding='utf-8')
