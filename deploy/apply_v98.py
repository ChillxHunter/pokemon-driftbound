from pathlib import Path
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else '.')
p=root/'index.html'
s=p.read_text(encoding='utf-8')

if 'v98_mobile_options.css' not in s:
    s=s.replace('</head>','  <link rel="stylesheet" href="v98_mobile_options.css?v=mobile-98">\n</head>')
if 'v98_mobile_options.js' not in s:
    s=s.replace('</body>','  <script src="v98_mobile_options.js?v=mobile-98"></script>\n</body>')

p.write_text(s,encoding='utf-8')
