from pathlib import Path
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else '.')
p=root/'index.html'
s=p.read_text(encoding='utf-8')

if 'v97_mobile_battle_fit.css' not in s:
    s=s.replace('</head>','  <link rel="stylesheet" href="v97_mobile_battle_fit.css?v=mobile-104">\n</head>')
else:
    import re
    s=re.sub(r'v97_mobile_battle_fit\.css\?v=mobile-[0-9]+','v97_mobile_battle_fit.css?v=mobile-104',s)
if 'v97_mobile_battle_fit.js' not in s:
    s=s.replace('</body>','  <script src="v97_mobile_battle_fit.js?v=mobile-104"></script>\n</body>')
else:
    import re
    s=re.sub(r'v97_mobile_battle_fit\.js\?v=mobile-[0-9]+','v97_mobile_battle_fit.js?v=mobile-104',s)

p.write_text(s,encoding='utf-8')
