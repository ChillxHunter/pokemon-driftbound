/* Pokémon: Driftbound v91 — traditional Pokémon interaction/building/trainer polish. */
(function(){
  'use strict';

  const BUILDING_TYPES=new Set(['center','mart','gym','lab']);
  const SOLID_INTERIOR_TYPES=new Set(['nurse','clerk','pc','professor','gymGuide','gymLeader']);
  const trainerClassLines={
    Youngster:['I have been training all morning! Let’s battle!','Whoa! You are seriously strong!'],
    Picnicker:['The weather is perfect for a Pokémon battle!','That was fun. I need to train some more!'],
    Hiker:['A mountain trail makes a Trainer tough. Show me what you have got!','Rock-solid battling! I could not keep up.'],
    Backpacker:['You look like you have come a long way. Battle me!','I will remember that battle on the road.'],
    Fisher:['The fish are not biting, so how about a battle?','Looks like you caught the win instead!'],
    Swimmer:['My Pokémon and I never back down!','You made quite a splash!'],
    'Hex Maniac':['Can you feel the strange presence around us?','Hee hee... even the spirits knew you would win.'],
    'Pokéfan':['My Pokémon are absolutely the cutest. Want to see?','They are still the cutest... but you were stronger.'],
    'Ace Trainer':['I have beaten Trainers all across Asterra. Your turn.','Excellent battle. You earned that victory.'],
    Skier:['Cold air, fast slopes, fast battles!','You left me frozen in place!'],
    Scientist:['I need more battle data. Please cooperate!','Fascinating. Your strategy changed my hypothesis.'],
    Trainer:['Hey! Our eyes met. That means we battle!','Good battle. I will keep training.']
  };

  function classOf(name=''){return Object.keys(trainerClassLines).find(k=>name.startsWith(k))||'Trainer';}
  function trainerText(o,after=false){const pair=trainerClassLines[classOf(o.name)]||trainerClassLines.Trainer;if(/^Rival /.test(o.name))return after?'Okay, okay... you got me this time. Do not get comfortable.':'There you are! I want to see how much stronger you have gotten.';return pair[after?1:0];}
  function trainerPayout(o){const maxLevel=Math.max(...(o.team||[]).map(x=>x[1]||1),1);const classMult=/Ace Trainer|Scientist/.test(o.name)?1.45:/Hiker|Hex Maniac|Swimmer/.test(o.name)?1.22:1;return Math.max(80,Math.round((maxLevel*14+(o.team?.length||1)*45)*classMult/10)*10);}

  classicBuildingBlock=function(tiles,x,y){classicRect(tiles,x-4,y-2,x+4,y+2,'building');for(let yy=y+3;yy<=y+4;yy++)for(let xx=x-1;xx<=x+1;xx++)if(tiles[yy])tiles[yy][xx]='path';};
  function buildingDoorPoint(o){return {x:o.x,y:o.y+3};}

  trainerObjects=function(area,spots){
    const themes={verdant:['Youngster','Picnicker'],cinder:['Hiker','Backpacker'],tide:['Fisher','Swimmer'],dusk:['Hex Maniac','Pokéfan'],frost:['Ace Trainer','Skier'],sky:['Ace Trainer','Scientist']};
    const names=['Niko','Tessa','Jun','Mara','Theo','Iris','Rowan','Cleo','Finn','Rhea','Milo','Sana'];
    const pool=classicEncounterPool(area);if(!pool.length)return[];
    return spots.slice(0,area.kind==='route'?3:2).map((p,i)=>{const areaId=S.currentArea,rank=Math.max(0,Math.floor(CLASSIC_AREA_ORDER.indexOf(areaId)/3));const count=i===2&&rank>2?3:1+(rank>1?1:0),[lo]=area.level;const team=Array.from({length:count},(_,k)=>[pool[(i+k)%pool.length],Math.min(60,lo+2+i+k)]);const id=`${areaId}:trainer:${i}`,name=`${themes[area.theme]?.[i%2]||'Trainer'} ${names[(CLASSIC_AREA_ORDER.indexOf(areaId)*3+i)%names.length]}`;return {type:'trainer',id,x:p[0],y:p[1],name,team,label:S.defeatedTrainers[id]?`Talk to ${name}`:`Battle ${name}`,color:i%2?'#a95662':'#4977aa',female:i%2===1,defeated:!!S.defeatedTrainers[id],dir:i%2?'down':'up'};});
  };

  let interiorReturn=null;
  function roomTiles(){const tiles=Array.from({length:ROWS},()=>Array(COLS).fill('void'));classicRect(tiles,20,10,40,31,'ground');classicRect(tiles,22,12,38,29,'path');return tiles;}
  function makeInterior(kind,source){
    const area=classicArea(),tiles=roomTiles(),objects=[];objects.push({type:'exitBuilding',x:30,y:30,label:'Exit building'});
    if(kind==='center'){objects.push({type:'nurse',x:30,y:14,label:'Talk to Nurse'});objects.push({type:'pc',x:23,y:16,label:'Use Pokémon Storage'});objects.push({type:'npc',x:37,y:19,label:'Talk to Trainer',name:'Traveling Trainer',line:'Pokémon Centers are the best place to prepare before a long route.'});}
    else if(kind==='mart'){objects.push({type:'clerk',x:30,y:14,label:'Shop'});objects.push({type:'npc',x:23,y:20,label:'Talk to Shopper',name:'Shopper',line:'Poké Mart stock gets better as you earn more Gym Badges.'});}
    else if(kind==='gym'){const gymId=source.gym||area.gym;objects.push({type:'gymGuide',x:24,y:18,gym:gymId,label:'Talk to Gym Guide'});objects.push({type:'gymLeader',x:30,y:14,gym:gymId,label:`Talk to ${GYMS[gymId]?.leader||'Gym Leader'}`});}
    else if(kind==='lab'){objects.push({type:'professor',x:30,y:14,label:'Talk to Professor Linden'});objects.push({type:'npc',x:23,y:20,label:'Talk to Assistant',name:'Lab Assistant',line:'Professor Linden studies how Pokémon populations change between the Gym routes.'});}
    return {areaId:`${S.currentArea}:${kind}:interior`,titanId:area.theme,biome:'interior',tiles,objects,interior:true,classic:true,roomKind:kind,sourceGym:source.gym||null};
  }
  function enterBuilding(o){interiorReturn={x:S.player.x,y:S.player.y,dir:S.player.dir,area:S.currentArea};currentMap=makeInterior(o.type,o);wildVisuals=[];S.player.x=30;S.player.y=28;S.player.dir='up';updateSideUI();updateInteractionHint();showAreaBanner(o.type==='center'?'Pokémon Center':o.type==='mart'?'Poké Mart':o.type==='gym'?`${GYMS[o.gym]?.type||''} Gym`:`Professor Linden's Lab`,'Interior');}
  function exitBuilding(){const r=interiorReturn||{x:30,y:24,dir:'down',area:S.currentArea};S.currentArea=r.area;currentMap=mapCache[S.currentArea]||(mapCache[S.currentArea]=generateMap(S.currentArea));S.player.x=r.x;S.player.y=r.y;S.player.dir=r.dir||'down';interiorReturn=null;rebuildWildVisuals();updateSideUI();updateInteractionHint();showAreaBanner();}

  const V90_WALKABLE=walkable;
  walkable=function(x,y){if(currentMap?.roomKind){if(x<0||x>=COLS||y<0||y>=ROWS)return false;const tile=currentMap.tiles[y]?.[x];if(!['ground','path'].includes(tile))return false;return !currentMap.objects.some(o=>o.x===x&&o.y===y&&SOLID_INTERIOR_TYPES.has(o.type));}return V90_WALKABLE(x,y);};

  nearbyObject=function(){if(!currentMap)return null;const all=currentMap.objects||[];const landmarks=all.map(o=>{const p=BUILDING_TYPES.has(o.type)&&!currentMap.roomKind?buildingDoorPoint(o):{x:o.x,y:o.y};return {o,d:Math.abs(p.x-S.player.x)+Math.abs(p.y-S.player.y)};}).filter(x=>x.d<=1).sort((a,b)=>a.d-b.d);if(landmarks.length)return landmarks[0].o;const wild=wildVisuals.map(w=>({w,d:Math.abs(w.x-S.player.x)+Math.abs(w.y-S.player.y)})).filter(x=>x.d<=1).sort((a,b)=>a.d-b.d)[0]?.w;return wild?{type:'wild',x:wild.x,y:wild.y,species:wild.species,level:wild.level,label:`Battle wild ${SPECIES[wild.species].name}`}:null;};

  updateInteractionHint=function(){const o=nearbyObject();if(o&&!B&&!activePanel&&DOM.dialogue.classList.contains('hidden')){const label=BUILDING_TYPES.has(o.type)&&!currentMap?.roomKind?`Enter ${o.label}`:o.label;DOM.interactionHint.textContent=`E · ${String(label||'Interact').toUpperCase()}`;DOM.interactionHint.classList.remove('hidden');}else DOM.interactionHint.classList.add('hidden');};
  const hint=document.querySelector('.controlHint');if(hint)hint.innerHTML='<span class="key">WASD</span><span class="key">ARROWS</span> Move <span class="key">E</span> Interact';if(DOM.interactionHint)DOM.interactionHint.textContent='E · INTERACT';
  document.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(e.code==='Space'||key===' '){e.preventDefault();e.stopImmediatePropagation();return;}if(key==='e'){e.preventDefault();e.stopImmediatePropagation();AUDIO.unlock();if(!DOM.dialogue.classList.contains('hidden'))advanceDialogue();else interactNearest();}},true);

  classicTrainerBattle=function(o){if(S.defeatedTrainers[o.id]){showDialogue([{speaker:o.name.toUpperCase(),text:trainerText(o,true)}]);return;}const payout=trainerPayout(o);showDialogue([{speaker:o.name.toUpperCase(),text:trainerText(o,false)}],()=>{startTrainerBattle(o.name,o.team,()=>{S.defeatedTrainers[o.id]=true;S.fieldCredits+=payout;mapCache[S.currentArea]=null;if(!currentMap?.roomKind)currentMap=generateMap(S.currentArea);saveGame();updateSideUI();showDialogue([{speaker:o.name.toUpperCase(),text:trainerText(o,true)},{speaker:'PRIZE MONEY',text:`${o.name} paid ₽${payout} to you.`}]);});});};

  finishBattleWin=async function(captured){if(!B)return;const enemy=B.enemy,active=S.party[B.playerIndex],boss=B.boss,onWin=B.onWin;const xp=battleXpReward(enemy.level,boss);const creditReward=B.trainer?0:Math.max(12,Math.round(enemy.level*(boss?8:captured?3:4)));if(creditReward)S.fieldCredits+=creditReward;S.research[enemy.species]=(S.research[enemy.species]||0)+1;if(captured){const caught=createMon(enemy.species,enemy.level,{caughtAt:S.currentArea});caught.hp=Math.max(1,enemy.hp);if(S.party.length<MAX_PARTY)S.party.push(caught);else S.storage.push(caught);S.catches[enemy.species]=(S.catches[enemy.species]||0)+1;}disableBattleControls();setBattleMessage(captured?`${enemy.name} was caught!`:`${enemy.name} was defeated!`);await sleep(650);const levels=await awardExperienceAnimated(active,xp);AUDIO.playBattleResult(captured);const rewardText=creditReward?` · +₽ ${creditReward}`:'';setBattleMessage(`Battle complete${rewardText}.${levels?` ${active.name} gained ${levels} level${levels===1?'':'s'}.`:''}`);await sleep(900);endBattle(captured?'capture':'win',onWin);};

  let sightLock=false;
  function clearSightLine(tx,ty,px,py){const dx=Math.sign(px-tx),dy=Math.sign(py-ty),dist=Math.abs(px-tx)+Math.abs(py-ty);for(let i=1;i<dist;i++){const x=tx+dx*i,y=ty+dy*i,tile=currentMap.tiles[y]?.[x];if(!['ground','grass','rough','path'].includes(tile))return false;}return true;}
  function checkTrainerSight(){if(sightLock||B||activePanel||currentMap?.roomKind||!DOM.dialogue.classList.contains('hidden'))return;const trainer=(currentMap.objects||[]).find(o=>{if(o.type!=='trainer'||S.defeatedTrainers[o.id])return false;const dx=S.player.x-o.x,dy=S.player.y-o.y,dist=Math.abs(dx)+Math.abs(dy);if(dist<1||dist>5)return false;if(dx!==0&&dy!==0)return false;const dir=o.dir||'down',v=dir==='up'?[0,-1]:dir==='down'?[0,1]:dir==='left'?[-1,0]:[1,0];if(Math.sign(dx)!==v[0]||Math.sign(dy)!==v[1])return false;return clearSightLine(o.x,o.y,S.player.x,S.player.y);});if(!trainer)return;sightLock=true;inputLocked=true;toast('!');setTimeout(()=>{inputLocked=false;classicTrainerBattle(trainer);sightLock=false;},260);}
  const V90_TRY_MOVE=tryMove;tryMove=function(dx,dy){const ox=S.player.x,oy=S.player.y;V90_TRY_MOVE(dx,dy);if((S.player.x!==ox||S.player.y!==oy)&&!currentMap?.roomKind)setTimeout(checkTrainerSight,80);};

  interactNearest=function(){if(inputLocked||B||activePanel)return;if(!DOM.dialogue.classList.contains('hidden')){advanceDialogue();return;}const o=nearbyObject();if(!o){toast('There is nothing to interact with here.');return;}if(BUILDING_TYPES.has(o.type)&&!currentMap?.roomKind){enterBuilding(o);return;}if(o.type==='exitBuilding'){exitBuilding();return;}if(o.type==='nurse'){showDialogue([{speaker:'POKÉMON CENTER',text:'Welcome! I will restore your Pokémon to full health.'}],()=>{healParty();S.lastCenter=S.currentArea;saveGame();updateSideUI();toast('Your Pokémon are fully healed.');});return;}if(o.type==='pc'){openStoragePanel();return;}if(o.type==='clerk'){openMartPanel();return;}if(o.type==='professor'){interactLab();return;}if(o.type==='gymGuide'){const g=GYMS[o.gym];showDialogue([{speaker:'GYM GUIDE',text:S.badges[o.gym]?`You already defeated ${g.leader}. Nice work!`:`Welcome! ${g.leader} specializes in ${g.type}-type Pokémon. Prepare before you challenge them.`}]);return;}if(o.type==='gymLeader'){openGymPanel(o.gym);return;}if(o.type==='npc'){showDialogue([{speaker:(o.name||'TRAINER').toUpperCase(),text:o.line||'Good luck on your journey!'}]);return;}if(o.type==='trainer'||o.type==='rival'){classicTrainerBattle(o);return;}if(o.type==='hmGate'){useHmGate(o);return;}if(o.type==='puzzleSwitch'){togglePuzzle(o);return;}if(o.type==='puzzleDoor'){showDialogue([{speaker:'SEALED DOOR',text:'Three switches in this cave must all be active.'}]);return;}if(o.type==='itemPickup'||o.type==='tmPickup'){claimPickup(o);return;}if(o.type==='leagueGate'){startLeague();return;}if(o.type==='sign'||o.type==='exitSign'){readClassicSign(o);return;}if(o.type==='wild'){startBattle(o.species,{level:o.level||classicLevel()});return;}};

  window.__DRIFTBOUND_V91__={enterBuilding,exitBuilding,trainerPayout,checkTrainerSight};
})();
