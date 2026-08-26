from pathlib import Path
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else '.')
p=root/'index.html'
s=p.read_text(encoding='utf-8')

if 'v97_mobile_battle_fit.css' not in s:
    s=s.replace('</head>','  <link rel="stylesheet" href="v97_mobile_battle_fit.css?v=mobile-97">\n</head>')
if 'v97_mobile_battle_fit.js' not in s:
    s=s.replace('</body>','  <script src="v97_mobile_battle_fit.js?v=mobile-97"></script>\n</body>')

p.write_text(s,encoding='utf-8')
