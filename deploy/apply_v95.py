from pathlib import Path
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else '.')
p=root/'index.html'
s=p.read_text(encoding='utf-8')

if 'v95_mobile_layout.css' not in s:
    s=s.replace('</head>','  <link rel="stylesheet" href="v95_mobile_layout.css?v=mobile-95">\n</head>')
if 'v95_mobile_layout.js' not in s:
    s=s.replace('</body>','  <script src="v95_mobile_layout.js?v=mobile-95"></script>\n</body>')

p.write_text(s,encoding='utf-8')
