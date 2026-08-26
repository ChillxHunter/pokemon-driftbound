from pathlib import Path
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else '.')
p=root/'index.html'
s=p.read_text(encoding='utf-8')

if 'v94_mobile_controls.css' not in s:
    s=s.replace('</head>','  <link rel="stylesheet" href="v94_mobile_controls.css?v=mobile-94">\n</head>')
if 'v94_mobile_controls.js' not in s:
    s=s.replace('</body>','  <script src="v94_mobile_controls.js?v=mobile-94"></script>\n</body>')

p.write_text(s,encoding='utf-8')
