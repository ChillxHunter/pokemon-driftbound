#!/usr/bin/env python3
from pathlib import Path
import re, sys

if len(sys.argv) != 2:
    raise SystemExit('usage: apply_v118.py <site-dir>')
site=Path(sys.argv[1])
region=site/'classic_region_part2.js'
interiors=site/'v116_interiors.js'
index=site/'index.html'
mobile=site/'v118_mobile_ui.js'
for p in (region,interiors,index,mobile):
    if not p.exists(): raise SystemExit(f'v118: missing {p.name}')

# 1) Town signs belong beside the road, never in its centerline.
r=region.read_text(encoding='utf-8')
old="  objects.push({type:'sign',x:30,y:18,short:area.name.split(' ')[0],label:`Read ${area.name} sign`});"
new="  objects.push({type:'sign',x:24,y:18,short:area.name.split(' ')[0],label:`Read ${area.name} sign`});"
if old not in r: raise SystemExit('v118: town sign anchor missing')
r=r.replace(old,new,1)

# 2) Route 2 should read as a forest ROAD, not an impassable wall of trees.
old_forest="  if(area.biome==='forest'){classicRect(tiles,3,2,22,36,'grass');classicRect(tiles,38,2,56,36,'grass');for(let y=2;y<38;y++)for(let x2=2;x2<58;x2++)if(tiles[y][x2]==='ground'&&rand()<.75)tiles[y][x2]='obstacle'}"
new_forest="""  if(area.biome==='forest'){
    classicRect(tiles,3,2,22,36,'grass');classicRect(tiles,38,2,56,36,'grass');
    const forestObstacleChance=areaId==='route2'?.32:.75;
    for(let y=2;y<38;y++)for(let x2=2;x2<58;x2++)if(tiles[y][x2]==='ground'&&rand()<forestObstacleChance)tiles[y][x2]='obstacle';
    if(areaId==='route2'){
      // Seven-tile road plus three-tile tree-free shoulders. The Cut tree remains
      // on the route later as the deliberate progression gate.
      for(let y=1;y<ROWS-1;y++){
        const cx=pathXs[y]||30;
        for(let x2=Math.max(2,cx-6);x2<=Math.min(COLS-3,cx+6);x2++){
          const d=Math.abs(x2-cx);
          if(d<=3)tiles[y][x2]='path';
          else if(d<=6&&tiles[y][x2]==='obstacle')tiles[y][x2]='grass';
        }
      }
      // Small clearings keep Canopy Road visually readable and give the player
      // breathing room instead of continuous tree walls.
      classicRect(tiles,14,15,21,21,'grass');
      classicRect(tiles,39,24,47,30,'grass');
    }
  }"""
if old_forest not in r: raise SystemExit('v118: forest generation anchor missing')
r=r.replace(old_forest,new_forest,1)
region.write_text(r,encoding='utf-8')

# 3) Collision footprints must match the visible furniture instead of oversized
# tile rectangles around it.
s=interiors.read_text(encoding='utf-8')
pat=r"function furniture\(kind,x,y\)\{.*?\n return false;\n\}"
replacement="""function furniture(kind,x,y){
 if(kind==='center')return rect(x,y,27,14,33,14)||rect(x,y,36,19,36,21)||rect(x,y,36,23,36,25)||rect(x,y,22,13,22,13)||rect(x,y,38,13,38,13);
 if(kind==='mart')return rect(x,y,27,14,33,14)||rect(x,y,27,20,33,20)||rect(x,y,27,24,33,24)||rect(x,y,36,18,36,20);
 if(kind==='lab')return rect(x,y,27,14,29,14)||rect(x,y,31,14,33,14)||rect(x,y,23,19,25,19)||rect(x,y,29,19,31,19)||rect(x,y,35,19,37,19);
 return false;
}"""
s2,n=re.subn(pat,replacement,s,count=1,flags=re.S)
if n!=1: raise SystemExit('v118: furniture collision function missing')
interiors.write_text(s2,encoding='utf-8')

# 4) Force phones to fetch these fixes and load the modal/menu visibility guard.
i=index.read_text(encoding='utf-8')
for name in ('classic_region_part2.js','v116_interiors.js'):
    i,n=re.subn(rf'{re.escape(name)}\?v=[^"\']+',f'{name}?v=118-fixes',i,count=1)
    if n!=1: raise SystemExit(f'v118: cache tag missing for {name}')
script='  <script src="v118_mobile_ui.js?v=118-fixes"></script>\n'
if 'v118_mobile_ui.js' not in i:
    i=i.replace('</body>',script+'</body>')
index.write_text(i,encoding='utf-8')
