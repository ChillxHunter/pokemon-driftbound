function classicExitObjects(area){const objects=[];if(area.prev)objects.push({type:'exit',x:30,y:38,target:area.prev,label:`To ${CLASSIC_AREAS[area.prev].name}`});if(area.next)objects.push({type:'exit',x:30,y:1,target:area.next,label:`To ${CLASSIC_AREAS[area.next].name}`});return objects}
function trainerObjects(area,spots){
  const themes={verdant:['Youngster','Picnicker'],cinder:['Hiker','Backpacker'],tide:['Fisher','Swimmer'],dusk:['Hex Maniac','Pokéfan'],frost:['Ace Trainer','Skier'],sky:['Ace Trainer','Scientist']};const names=['Niko','Tessa','Jun','Mara','Theo','Iris','Rowan','Cleo','Finn','Rhea','Milo','Sana'];
  const pool=classicEncounterPool(area);if(!pool.length)return[];return spots.slice(0,area.kind==='route'?3:2).map((p,i)=>{const areaId=S.currentArea,rank=Math.max(0,Math.floor(CLASSIC_AREA_ORDER.indexOf(areaId)/3));const count=i===2&&rank>2?3:1+(rank>1?1:0);const [lo]=area.level;const team=Array.from({length:count},(_,k)=>[pool[(i+k)%pool.length],Math.min(60,lo+2+i+k)]),id=`${areaId}:trainer:${i}`;if(S.defeatedTrainers[id])return null;return {type:'trainer',id,x:p[0],y:p[1],name:`${themes[area.theme]?.[i%2]||'Trainer'} ${names[(CLASSIC_AREA_ORDER.indexOf(areaId)*3+i)%names.length]}`,team,label:'Trainer battle',color:i%2?'#a95662':'#4977aa',female:i%2===1}}).filter(Boolean)}
function generateTownMap(areaId,area){
  const rand=seeded(hashCode(`asterra-town-${areaId}`)),tiles=classicTiles('ground'),objects=classicExitObjects(area);classicBorder(tiles);classicRect(tiles,28,0,32,ROWS-1,'path');classicRect(tiles,8,19,51,23,'path');
  for(const [kind,x,y] of [['center',17,15],['mart',43,15]]){classicBuildingBlock(tiles,x,y);objects.push({type:kind,x,y,label:kind==='center'?'Pokémon Center':'Poké Mart'})}
  if(area.gym){classicBuildingBlock(tiles,43,28);objects.push({type:'gym',x:43,y:28,gym:area.gym,label:`${GYMS[area.gym].type} Gym`})}
  if(areaId==='seabreeze'){classicBuildingBlock(tiles,17,29);objects.push({type:'lab',x:17,y:29,label:"Professor Linden's Lab"});objects.push({type:'rival',id:'rival-start',x:35,y:25,name:'Rival Kai',team:[['mareep',5]],label:'Kai'})}
  objects.push({type:'sign',x:30,y:18,short:area.name.split(' ')[0],label:`Read ${area.name} sign`});
  for(let y=3;y<37;y++)for(let x=3;x<57;x++){if(tiles[y][x]==='ground'&&((x<8||x>52)||(y<7||y>34))&&rand()<.32)tiles[y][x]='obstacle'}
  return {areaId,titanId:area.theme,biome:area.biome,tiles,objects,interior:false,classic:true};
}
function generateRouteMap(areaId,area){
  const rand=seeded(hashCode(`asterra-${areaId}`)),tiles=classicTiles('ground'),objects=classicExitObjects(area);classicBorder(tiles);let x=30;const pathXs=[];
  for(let y=0;y<ROWS;y++){if(y%6===0&&y>4&&y<35)x=clamp(x+(rand()<.5?-1:1)*(2+Math.floor(rand()*3)),23,37);pathXs[y]=x;for(let px=x-2;px<=x+2;px++)tiles[y][px]='path'}
  const patches=[[4,4,19,13],[40,5,55,14],[5,22,20,34],[40,23,55,34]];patches.forEach(r=>classicRect(tiles,...r,'grass'));
  if(area.biome==='forest'){classicRect(tiles,3,2,22,36,'grass');classicRect(tiles,38,2,56,36,'grass');for(let y=2;y<38;y++)for(let x2=2;x2<58;x2++)if(tiles[y][x2]==='ground'&&rand()<.75)tiles[y][x2]='obstacle'}
  else for(let y=2;y<38;y++)for(let x2=2;x2<58;x2++)if(tiles[y][x2]==='ground'&&rand()<(['mountain','snow','graveyard'].includes(area.biome)?.34:.24))tiles[y][x2]='obstacle';
  if(area.biome==='graveyard')for(let i=0;i<22;i++){const gx=4+Math.floor(rand()*52),gy=4+Math.floor(rand()*31);if(tiles[gy][gx]==='ground')tiles[gy][gx]='obstacle'}
  const trainerSpots=[[pathXs[29]||30,29],[pathXs[18]||30,18],[pathXs[10]||30,10]];objects.push(...trainerObjects(area,trainerSpots));
  const tm=AREA_TM_PICKUPS[areaId];if(tm)objects.push({type:'tmPickup',id:`${areaId}:tm:${tm}`,move:tm,x:12,y:17,label:`Pick up ${TM_NAMES[tm]||'TM'}`});
  if(area.hmGate&&!S.clearedObstacles[area.hmGate.id]){const gy=area.hmGate.y,gx=pathXs[gy]||area.hmGate.x,g={type:'hmGate',...area.hmGate,x:gx,y:gy,label:`Use ${area.hmGate.hm}`};tiles[g.y][g.x]='blocked';objects.push(g)}
  if(areaId==='route7')objects.push({type:'itemPickup',id:'route7:ultra',item:'Ultra Ball',qty:3,x:48,y:18,label:'Item'});
  return {areaId,titanId:area.theme,biome:area.biome,tiles,objects,interior:false,classic:true};
}
function generateCaveMap(areaId,area){
  const rand=seeded(hashCode(`asterra-cave-${areaId}`)),tiles=classicTiles('void'),objects=classicExitObjects(area);let x=30;const caveXs=[];
  for(let y=1;y<39;y++){if(y%5===0)x=clamp(x+(rand()<.5?-1:1)*(2+Math.floor(rand()*4)),20,40);caveXs[y]=x;for(let px=x-4;px<=x+4;px++)tiles[y][px]=rand()<.18?'grass':'rough'}
  classicRect(tiles,24,8,36,13,'rough');classicRect(tiles,18,17,42,24,'rough');classicRect(tiles,23,28,37,35,'rough');classicRect(tiles,25,0,35,3,'path');classicRect(tiles,25,36,35,39,'path');
  for(let y=2;y<38;y++)for(let x2=2;x2<58;x2++)if(tiles[y][x2]==='rough'&&rand()<.08)tiles[y][x2]='grass';
  objects.push(...trainerObjects(area,[[25,31],[36,17]]));
  const tm=AREA_TM_PICKUPS[areaId];if(tm)objects.push({type:'tmPickup',id:`${areaId}:tm:${tm}`,move:tm,x:22,y:18,label:`Pick up ${TM_NAMES[tm]||'TM'}`});
  if(area.hmGate&&!S.clearedObstacles[area.hmGate.id]){const gy=area.hmGate.y,gx=caveXs[gy]||area.hmGate.x,g={type:'hmGate',...area.hmGate,x:gx,y:gy,label:`Use ${area.hmGate.hm}`};tiles[g.y][g.x]='blocked';objects.push(g)}
  if(area.puzzle){
    const state=S.puzzleState[areaId]||{};const switches=[[24,11],[39,21],[23,31]];switches.forEach((p,i)=>objects.push({type:'puzzleSwitch',id:`${areaId}:switch:${i}`,index:i,x:p[0],y:p[1],active:!!state[i],label:`Cave switch ${i+1}`}));
    const solved=[0,1,2].every(i=>state[i]);if(!solved){const doorX=caveXs[6]||30;tiles[6][doorX]='blocked';objects.push({type:'puzzleDoor',id:`${areaId}:door`,x:doorX,y:6,label:'Sealed puzzle door'})}
  }
  return {areaId,titanId:area.theme,biome:area.biome,tiles,objects,interior:true,classic:true};
}
function generateLeagueMap(areaId,area){const map=generateTownMap(areaId,area);map.biome='league';map.objects=map.objects.filter(o=>!['center','mart'].includes(o.type));map.objects.push({type:'center',x:17,y:16,label:'League Pokémon Center'},{type:'leagueGate',x:30,y:10,label:'Enter the Elite Four'});classicBuildingBlock(map.tiles,17,16);return map}
generateMap=function(areaOrTheme){const id=CLASSIC_AREAS[areaOrTheme]?areaOrTheme:(S.currentArea||'seabreeze'),area=CLASSIC_AREAS[id];if(area.kind==='town')return generateTownMap(id,area);if(area.kind==='cave')return generateCaveMap(id,area);if(area.kind==='league')return generateLeagueMap(id,area);return generateRouteMap(id,area)};

function enterClassicArea(id,{from=null,announce=true}={}){
  if(!CLASSIC_AREAS[id])return;const area=CLASSIC_AREAS[id];S.currentArea=id;S.currentTitan=area.theme;S.visitedAreas[id]=true;if(area.kind==='town'||area.kind==='league')S.visitedTowns[id]=true;currentMap=mapCache[id]||(mapCache[id]=generateMap(id));
  if(from===area.prev){S.player.x=30;S.player.y=36;S.player.dir='up'}else if(from===area.next){S.player.x=30;S.player.y=3;S.player.dir='down'}else{S.player.x=30;S.player.y=34;S.player.dir='up'}
  wildVisuals=[];rebuildWildVisuals();updateSideUI();updateInteractionHint();if(announce)showAreaBanner(area.name,area.subtitle);saveGame();
}
enterTitan=function(id,opts={}){enterClassicArea(CLASSIC_AREAS[id]?id:S.currentArea,opts)};

walkable=function(x,y){if(x<0||x>=COLS||y<0||y>=ROWS||!currentMap)return false;const tile=currentMap.tiles[y]?.[x];if(!['ground','grass','rough','path'].includes(tile))return false;const blocked=currentMap.objects.some(o=>o.x===x&&o.y===y&&['center','mart','gym','lab','trainer','rival','elite','hmGate','puzzleDoor','leagueGate'].includes(o.type));if(blocked)return false;return !wildVisuals.some(w=>(Math.round(w.x)===x&&Math.round(w.y)===y)||(Math.round(w.targetX)===x&&Math.round(w.targetY)===y))};
nearbyObject=function(){if(!currentMap)return null;const all=currentMap.objects.filter(o=>!((o.type==='trainer'||o.type==='rival')&&S.defeatedTrainers[o.id]));const landmark=all.map(o=>({o,d:Math.abs(o.x-S.player.x)+Math.abs(o.y-S.player.y)})).filter(x=>x.d<=1).sort((a,b)=>a.d-b.d)[0]?.o||null;if(landmark)return landmark;const wild=wildVisuals.map(w=>({w,d:Math.abs(w.x-S.player.x)+Math.abs(w.y-S.player.y)})).filter(x=>x.d<=1).sort((a,b)=>a.d-b.d)[0]?.w;return wild?{type:'wild',x:wild.x,y:wild.y,species:wild.species,level:wild.level,label:`Battle wild ${SPECIES[wild.species].name}`}:null};
rollEncounter=function(){return classicRollEncounter()};
rebuildWildVisuals=function(){wildVisuals=[];if(!currentMap||!S.started)return;const area=classicArea(),pool=classicEncounterPool(area);if(!pool.length)return;const rand=seeded(hashCode(`classic-wild-${S.currentArea}-${S.steps}-${wildGeneration++}`));const grass=[];for(let y=2;y<ROWS-2;y++)for(let x=2;x<COLS-2;x++)if(currentMap.tiles[y][x]==='grass'&&!currentMap.objects.some(o=>Math.abs(o.x-x)+Math.abs(o.y-y)<2))grass.push([x,y]);for(let i=0;i<Math.min(12,Math.max(5,pool.length*2),grass.length);i++){const idx=Math.floor(rand()*grass.length),[x,y]=grass.splice(idx,1)[0],species=pool[Math.floor(rand()*pool.length)];wildVisuals.push({id:`${S.currentArea}:${wildGeneration}:${i}`,species,x,y,targetX:x,targetY:y,level:classicLevel(area),behavior:GRAZING_SPECIES.has(species)?'grazer':'roamer'})}};

tryMove=function(dx,dy){
  if(!S.started||inputLocked||B||activePanel||!DOM.dialogue.classList.contains('hidden'))return;if(!dx&&!dy)return;dx=Math.sign(dx);dy=Math.sign(dy);S.player.dir=directionForVector(dx,dy);const ox=S.player.x,oy=S.player.y,nx=ox+dx,ny=oy+dy;if(dx&&dy&&!walkable(ox+dx,oy)&&!walkable(ox,oy+dy))return;if(!walkable(nx,ny)){updateInteractionHint();return}S.player.x=nx;S.player.y=ny;S.player.frame=(S.player.frame+1)%2;S.steps++;
  const exit=currentMap.objects.find(o=>o.type==='exit'&&o.x===nx&&o.y===ny);if(exit){setTimeout(()=>enterClassicArea(exit.target,{from:S.currentArea,announce:true}),40);return}
  updateInteractionHint();DOM.objectiveChip.textContent=currentObjective();if(S.steps%15===0)saveGame();
};
