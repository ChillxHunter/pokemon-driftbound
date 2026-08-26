from pathlib import Path
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else '.')
p=root/'index.html'
s=p.read_text(encoding='utf-8')

if 'v96_gameboy_mobile.css' not in s:
    s=s.replace('</head>','  <link rel="stylesheet" href="v96_gameboy_mobile.css?v=mobile-96">\n</head>')
if 'v96_gameboy_mobile.js' not in s:
    s=s.replace('</body>','  <script src="v96_gameboy_mobile.js?v=mobile-96"></script>\n</body>')

p.write_text(s,encoding='utf-8')
