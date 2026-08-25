/* Pokémon: Driftbound v92 — classic random encounters + expanded trainer archetypes. */
(function(){
  'use strict';

  const CLASS_DIALOGUE={
    Youngster:['Hey! I just caught some great Pokémon! Let’s battle!','Whoa! You are way stronger than I expected.'],
    Lass:['I was looking for cute Pokémon, but a battle sounds fun!','Your Pokémon were amazing!'],
    Picnicker:['Perfect weather for a battle, don’t you think?','That was fun! I need a little picnic break now.'],
    Backpacker:['I have battled Trainers on roads all over Asterra.','That one is going in my travel journal.'],
    Hiker:['These trails build strong legs and stronger Pokémon!','You climbed right over my strategy.'],
    Fisherman:['Nothing is biting today. Maybe you will!','Looks like I was the one who got reeled in.'],
    Swimmer:['Water or land, I am always ready to battle!','You made a big splash out there.'],
    'Ace Trainer':['I train seriously. Show me your best team.','Excellent. That was a battle worth remembering.'],
    Scientist:['A live battle is the perfect experiment!','Interesting... I need to revise my data.'],
    Breeder:['Raising Pokémon teaches patience. Battling tests it.','Your bond with your Pokémon is impressive.'],
    Veteran:['I have seen hundreds of battles. Surprise me.','You did. Keep going.'],
    Worker:['A quick battle before I get back to work!','Back to work for me—and back to training too.'],
    Gentleman:['A proper Trainer never refuses a good challenge.','Splendid battle. You have my respect.'],
    Beauty:['A strong team should look confident too.','Okay, you definitely stole the spotlight.'],
    'Black Belt':['Discipline sharpens both Trainer and Pokémon!','Your technique broke through mine.'],
    Collector:['I collect rare Pokémon and memorable battles.','That battle was worth adding to the collection.'],
    Cook:['Battles and cooking both need perfect timing!','Your timing was better than mine.'],
    Dancer:['Follow the rhythm—battle with me!','You never missed a beat.'],
    Police:['Routine patrol! Let me test your battle skills.','All clear. You are a capable Trainer.'],
    Punk:['You staring at me? Fine. Battle time!','Tch... not bad. Not bad at all.'],
    'Rising Star':['Remember my name. I am going straight to the League!','Okay... maybe remember yours too.'],
    Sightseer:['I came for the scenery and found a battle instead!','That was the highlight of my trip.'],
    Skier:['Fast slopes, fast Pokémon, fast battle!','You left me frozen.'],
    'Hex Maniac':['The spirits whispered that you were coming...','Hee hee... they also whispered that I would lose.'],
    Pokéfan:['My Pokémon are the cutest in the whole region!','Still the cutest. But yours were stronger.'],
    Trainer:['Our eyes met. You know what that means!','Good battle. I will keep training.']
  };

  const ROUTE_CLASSES={
    verdant:['Youngster','Lass','Picnicker','Breeder','Collector'],
    cinder:['Hiker','Backpacker','Worker','Black Belt','Veteran'],
    tide:['Fisherman','Swimmer','Sightseer','Breeder','Gentleman'],
    dusk:['Hex Maniac','Pokéfan','Punk','Veteran','Collector'],
    frost:['Ace Trainer','Skier','Backpacker','Veteran','Rising Star'],
    sky:['Ace Trainer','Scientist','Rising Star','Beauty','Sightseer']
  };
  const TRAINER_NAMES=['Niko','Tessa','Jun','Mara','Theo','Iris','Rowan','Cleo','Finn','Rhea','Milo','Sana','Ari','Luca','Nora','Emi','Dane','Mina'];

  function trainerClass(name=''){
    if(/^Rival /.test(name))return 'Rival';
    return Object.keys(CLASS_DIALOGUE).find(k=>name.startsWith(k))||'Trainer';
  }
  function lineFor(o,after=false){
    if(/^Rival /.test(o.name||''))return after?'You got me this time. I am not letting you pull ahead for long!':'There you are! I have been waiting to see how your team is doing.';
    const pair=CLASS_DIALOGUE[trainerClass(o.name)]||CLASS_DIALOGUE.Trainer;return pair[after?1:0];
  }
  function payoutFor(o){
    const cls=trainerClass(o.name),maxLevel=Math.max(1,...(o.team||[]).map(t=>t[1]||1));
    const mult=/Ace Trainer|Veteran|Gentleman/.test(cls)?1.65:/Scientist|Black Belt|Beauty|Rising Star/.test(cls)?1.4:/Hiker|Swimmer|Hex Maniac|Breeder/.test(cls)?1.2:1;
    return Math.max(80,Math.round((maxLevel*13+(o.team?.length||1)*48)*mult/10)*10);
  }

  trainerObjects=function(area,spots){
    const pool=classicEncounterPool(area);if(!pool.length)return[];
    const areaId=S.currentArea,areaIndex=Math.max(0,CLASSIC_AREA_ORDER.indexOf(areaId)),rank=Math.max(0,Math.floor(areaIndex/3));
    const classes=ROUTE_CLASSES[area.theme]||['Trainer'];
    return spots.slice(0,area.kind==='route'?3:2).map((p,i)=>{
      const cls=classes[(areaIndex+i*2)%classes.length],name=`${cls} ${TRAINER_NAMES[(areaIndex*3+i)%TRAINER_NAMES.length]}`;
      const count=Math.min(4,1+(rank>1?1:0)+(i===2&&rank>2?1:0));
      const [lo,hi]=levelRange(area),team=Array.from({length:count},(_,k)=>{
        const species=pool[(i+k+(rank%Math.max(1,pool.length)))%pool.length];
        return [species,Math.min(60,Math.max(lo+1,Math.min(hi,lo+2+i+k)))];
      });
      const id=`${areaId}:trainer:${i}`;
      return {type:'trainer',id,x:p[0],y:p[1],name,trainerClass:cls,team,label:S.defeatedTrainers[id]?`Talk to ${name}`:`Battle ${name}`,female:/Lass|Beauty|Picnicker/.test(cls)||i%2===1,defeated:!!S.defeatedTrainers[id],dir:i%2?'down':'up'};
    });
  };

  classicTrainerBattle=function(o){
    if(S.defeatedTrainers[o.id]){showDialogue([{speaker:(o.name||'TRAINER').toUpperCase(),text:lineFor(o,true)}]);return;}
    const payout=payoutFor(o);
    showDialogue([{speaker:(o.name||'TRAINER').toUpperCase(),text:lineFor(o,false)}],()=>{
      startTrainerBattle(o.name,o.team,()=>{
        S.defeatedTrainers[o.id]=true;S.fieldCredits+=payout;
        mapCache[S.currentArea]=null;if(!currentMap?.roomKind)currentMap=generateMap(S.currentArea);
        saveGame();updateSideUI();
        showDialogue([
          {speaker:(o.name||'TRAINER').toUpperCase(),text:lineFor(o,true)},
          {speaker:'PRIZE MONEY',text:`${o.name} paid ₽${payout} to you.`}
        ]);
      });
    });
  };

  rebuildWildVisuals=function(){wildVisuals=[];};
  if(Array.isArray(wildVisuals))wildVisuals.length=0;

  function weightedWild(area=classicArea()){
    const pool=classicEncounterPool(area);if(!pool.length)return null;
    const cap=bstCap();
    const weighted=[];
    pool.forEach((id,index)=>{
      const bst=classicBST(id),strength=Math.max(0,cap-bst);
      let copies=Math.max(1,Math.round(2+strength/42));
      copies=Math.max(1,copies-Math.floor(index/2));
      for(let i=0;i<copies;i++)weighted.push(id);
    });
    return weighted[Math.floor(Math.random()*weighted.length)]||pool[0];
  }

  function ensureEncounterState(){
    if(!Number.isFinite(S.grassEncounterMeter))S.grassEncounterMeter=.08;
    if(!Number.isFinite(S.grassEncounterCooldown))S.grassEncounterCooldown=3;
  }
  function grassEncounterStep(){
    if(B||inputLocked||activePanel||currentMap?.roomKind)return;
    const tile=currentMap?.tiles?.[S.player.y]?.[S.player.x];
    ensureEncounterState();
    if(tile!=='grass'){
      S.grassEncounterMeter=Math.max(.05,S.grassEncounterMeter*.45);
      return;
    }
    if(S.grassEncounterCooldown>0){S.grassEncounterCooldown--;return;}
    const area=classicArea(),pool=classicEncounterPool(area);if(!pool.length)return;
    S.grassEncounterMeter+=.14+Math.random()*.16;
    const trigger=S.grassEncounterMeter>=1 || Math.random()<(.035+Math.min(.045,S.grassEncounterMeter*.035));
    if(!trigger)return;
    const species=weightedWild(area);if(!species)return;
    S.grassEncounterMeter=.06;S.grassEncounterCooldown=4;inputLocked=true;
    const frame=document.getElementById('worldFrame');if(frame){frame.classList.remove('grassEncounter');void frame.offsetWidth;frame.classList.add('grassEncounter');setTimeout(()=>frame.classList.remove('grassEncounter'),520);}
    setTimeout(()=>{inputLocked=false;if(!B)startBattle(species,{level:classicLevel(area)});},260);
  }

  const V91_TRY_MOVE=tryMove;
  tryMove=function(dx,dy){
    const ox=S.player.x,oy=S.player.y;V91_TRY_MOVE(dx,dy);
    if(S.player.x!==ox||S.player.y!==oy)setTimeout(grassEncounterStep,18);
  };

  const V91_BLACKOUT=blackout;
  blackout=function(){
    const before=Math.max(0,S.fieldCredits||0),lost=Math.min(before,Math.max(0,Math.floor(before*.08/10)*10));
    if(lost)S.fieldCredits-=lost;
    V91_BLACKOUT();
    if(lost)setTimeout(()=>toast(`You dropped ₽${lost} while rushing back to the Pokémon Center.`),900);
  };

  const V90_UPDATE_SIDE=updateSideUI;
  updateSideUI=function(){
    V90_UPDATE_SIDE();
    if(!S.started)return;
    const desc=DOM.questDescription;if(desc&&classicArea().kind!=='town'&&classicArea().kind!=='league')desc.textContent='Walk through tall grass to find wild Pokémon. Trainers battle on sight, and routes hide items, TMs, caves, and field-move shortcuts.';
    const pulseTitle=document.querySelector('.pulseSection .sectionLabel');if(pulseTitle)pulseTitle.textContent='GRASS ENCOUNTERS';
  };

  try{Object.keys(mapCache||{}).forEach(k=>delete mapCache[k]);}catch(_e){}

  window.__DRIFTBOUND_V92__={weightedWild,grassEncounterStep,trainerClass,payoutFor};
})();
