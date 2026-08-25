/* Pokémon: Driftbound v90 — FULL traditional-region rework. */
'use strict';

const CLASSIC_SAVE_KEY='pokemon-driftbound-save-v90-asterra-region';
const LEGACY_FRESH_STATE=freshState;
const LEGACY_NORMALIZE_STATE=normalizeLoadedState;
const LEGACY_START_BATTLE=startBattle;
const LEGACY_RUN_BATTLE_ENTRANCE=runBattleEntrance;

/* ----------------------------- Region data ----------------------------- */
const CLASSIC_REGION_NAME='Asterra';
const CLASSIC_AREAS={
  seabreeze:{name:'Seabreeze Town',subtitle:'Where every journey begins',kind:'town',biome:'town',theme:'verdant',weather:'Clear morning',encounters:[],level:[2,4],next:'route1',objective:'Visit Professor Linden, then head north to Route 1.'},
  route1:{name:'Route 1',subtitle:'Meadow Trail',kind:'route',biome:'plains',theme:'verdant',weather:'Light breeze',encounters:['pidgey','oddish','mareep','hoothoot'],level:[3,6],prev:'seabreeze',next:'willowmere'},
  willowmere:{name:'Willowmere Town',subtitle:'The Garden Crossroads',kind:'town',biome:'town',theme:'verdant',weather:'Mild sun',encounters:[],level:[5,8],prev:'route1',next:'route2',gym:'leaf'},
  route2:{name:'Route 2',subtitle:'Canopy Road',kind:'route',biome:'forest',theme:'verdant',weather:'Forest wind',encounters:['oddish','pidgey','hoothoot','mareep','eevee'],level:[6,10],prev:'willowmere',next:'whisperwood',hmGate:{hm:'Cut',id:'route2:cut-main',x:30,y:8}},
  whisperwood:{name:'Whisperwood',subtitle:'Old-growth forest',kind:'route',biome:'forest',theme:'verdant',weather:'Leafy shade',encounters:['oddish','hoothoot','heracross','eevee','pidgey'],level:[8,12],prev:'route2',next:'stonebridge'},
  stonebridge:{name:'Stonebridge City',subtitle:'City of carved cliffs',kind:'town',biome:'town',theme:'cinder',weather:'Dry mountain air',encounters:[],level:[10,14],prev:'whisperwood',next:'route3',gym:'stone'},
  route3:{name:'Route 3',subtitle:'Highland Switchbacks',kind:'route',biome:'mountain',theme:'cinder',weather:'Mountain gusts',encounters:['geodude','zubat','cubone','teddiursa'],level:[11,16],prev:'stonebridge',next:'echo_cave'},
  echo_cave:{name:'Echo Cave',subtitle:'Crystal tunnels below Asterra',kind:'cave',biome:'cave',theme:'cinder',weather:'Underground',encounters:['zubat','geodude','cubone','gastly'],level:[13,18],prev:'route3',next:'voltaris',puzzle:'echo',hmGate:{hm:'Flash',id:'echo_cave:flash',x:30,y:20}},
  voltaris:{name:'Voltaris City',subtitle:'The city that never dims',kind:'town',biome:'town',theme:'sky',weather:'Charged air',encounters:[],level:[16,21],prev:'echo_cave',next:'route4',gym:'spark'},
  route4:{name:'Route 4',subtitle:'Sunstone Highway',kind:'route',biome:'mountain',theme:'cinder',weather:'Warm crosswind',encounters:['vulpix','houndour','geodude','pikachu','abra'],level:[17,23],prev:'voltaris',next:'lakeshore',hmGate:{hm:'Rock Smash',id:'route4:smash',x:30,y:9}},
  lakeshore:{name:'Lakeshore Town',subtitle:'Homes along the blue mirror',kind:'town',biome:'lake',theme:'tide',weather:'Cool lake breeze',encounters:[],level:[20,26],prev:'route4',next:'route5',gym:'tide'},
  route5:{name:'Route 5',subtitle:'Marshwater Causeway',kind:'route',biome:'lake',theme:'tide',weather:'Damp breeze',encounters:['wooper','poliwag','psyduck','horsea','totodile'],level:[22,29],prev:'lakeshore',next:'gravehollow',hmGate:{hm:'Surf',id:'route5:surf',x:30,y:7}},
  gravehollow:{name:'Gravehollow',subtitle:'The moonlit memorial road',kind:'route',biome:'graveyard',theme:'dusk',weather:'Cold mist',encounters:['gastly','misdreavus','hoothoot','cubone','sneasel'],level:[25,32],prev:'route5',next:'nocturne'},
  nocturne:{name:'Nocturne City',subtitle:'Lanterns beneath the old clock',kind:'town',biome:'graveyard',theme:'dusk',weather:'Silver fog',encounters:[],level:[28,34],prev:'gravehollow',next:'route6',gym:'shade'},
  route6:{name:'Route 6',subtitle:'Pinecrest Trail',kind:'route',biome:'snow',theme:'frost',weather:'Light snowfall',encounters:['sneasel','teddiursa','skarmory','lapras','dratini'],level:[30,37],prev:'nocturne',next:'frostfall_cave'},
  frostfall_cave:{name:'Frostfall Cavern',subtitle:'An icebound passage',kind:'cave',biome:'snow',theme:'frost',weather:'Frozen cavern',encounters:['sneasel','zubat','lapras','dratini'],level:[33,40],prev:'route6',next:'snowcrest',puzzle:'frost',hmGate:{hm:'Strength',id:'frostfall_cave:strength',x:30,y:20}},
  snowcrest:{name:'Snowcrest Town',subtitle:'At the foot of Whitehorn Peak',kind:'town',biome:'snow',theme:'frost',weather:'Powder snow',encounters:[],level:[36,42],prev:'frostfall_cave',next:'route7',gym:'rime'},
  route7:{name:'Route 7',subtitle:'Skyline Cliffs',kind:'route',biome:'coast',theme:'sky',weather:'Strong sea wind',encounters:['pidgey','skarmory','scyther','eevee','pikachu'],level:[38,45],prev:'snowcrest',next:'auroria'},
  auroria:{name:'Auroria City',subtitle:'A city of observatories',kind:'town',biome:'town',theme:'sky',weather:'Clear high sky',encounters:[],level:[41,47],prev:'route7',next:'route8',gym:'mind'},
  route8:{name:'Route 8',subtitle:'Starfall Plains',kind:'route',biome:'plains',theme:'sky',weather:'Golden wind',encounters:['abra','scyther','eevee','pikachu','skarmory'],level:[43,49],prev:'auroria',next:'dragonpass'},
  dragonpass:{name:'Dragonspine Pass',subtitle:'Ancient road to the summit',kind:'route',biome:'mountain',theme:'sky',weather:'Thin mountain air',encounters:['dratini','dragonair','larvitar','onix','skarmory'],level:[45,52],prev:'route8',next:'summit'},
  summit:{name:'Summit City',subtitle:'Seat of the final Gym',kind:'town',biome:'mountain',theme:'sky',weather:'Highland wind',encounters:[],level:[48,54],prev:'dragonpass',next:'victory_road',gym:'wyrm'},
  victory_road:{name:'Victory Road',subtitle:'The final test before the League',kind:'cave',biome:'cave',theme:'frost',weather:'Deep mountain cavern',encounters:['onix','larvitar','sneasel','skarmory','dratini','dragonair'],level:[50,57],prev:'summit',next:'league',puzzle:'victory',hmGate:{hm:'Waterfall',id:'victory_road:waterfall',x:30,y:19}},
  league:{name:'Asterra Pokémon League',subtitle:'Elite Four and Champion',kind:'league',biome:'league',theme:'sky',weather:'Clear summit sky',encounters:[],level:[55,60],prev:'victory_road',next:null}
};
const CLASSIC_AREA_ORDER=Object.keys(CLASSIC_AREAS);

const GYMS={
  leaf:{index:1,badge:'Verdant Badge',leader:'Leader Mira',type:'Grass',tm:'razorLeaf',hm:'Cut',team:[['oddish',10],['chikorita',12]],puzzle:[['Three planters hide the switch. Which receives the most morning sun?',['West','Center','East'],2],['The vines open when watered from...',['roots upward','leaves downward','both at once'],0]]},
  stone:{index:2,badge:'Granite Badge',leader:'Leader Bram',type:'Rock',tm:'rockThrow',hm:'Flash',team:[['geodude',15],['onix',17]],puzzle:[['A bridge balances on three stones. Which stone belongs in the middle?',['Light','Heavy','Equal'],2],['The carved rune reads: pressure travels...',['downward','sideways','nowhere'],0]]},
  spark:{index:3,badge:'Circuit Badge',leader:'Leader Nova',type:'Electric',tm:'spark',hm:'Rock Smash',team:[['mareep',20],['pikachu',22]],puzzle:[['Complete the circuit: positive must connect to...',['positive','negative','ground only'],1],['Which material carries a charge best?',['Rubber','Copper','Dry wood'],1]]},
  tide:{index:4,badge:'Current Badge',leader:'Leader Marina',type:'Water',tm:'aquaTail',hm:'Surf',team:[['psyduck',25],['poliwag',26],['totodile',28]],puzzle:[['Raise the sluice that fills the upper channel first.',['Left gate','Right gate','Drain'],0],['Water reaches the wheel fastest through the...',['wide level pipe','narrow downhill pipe','closed pipe'],1]]},
  shade:{index:5,badge:'Lantern Badge',leader:'Leader Vale',type:'Ghost',tm:'shadowSneak',hm:'Strength',team:[['gastly',31],['misdreavus',33],['cubone',32]],puzzle:[['Only one lantern casts no shadow. Choose it.',['Blue','White','Black'],2],['A bell rings with nobody there. Follow the sound...',['toward it','away from it','stand still'],0]]},
  rime:{index:6,badge:'Glacier Badge',leader:'Leader Freya',type:'Ice',tm:'icyWind',hm:'Fly',team:[['sneasel',37],['lapras',39],['teddiursa',38]],puzzle:[['Cross thin ice by spreading your weight...',['over more surface','onto one foot','by jumping'],0],['The coldest air settles...',['high','low','nowhere'],1]]},
  mind:{index:7,badge:'Orbit Badge',leader:'Leader Sol',type:'Psychic',tm:'psybeam',hm:'Waterfall',team:[['abra',43],['eevee',42],['scyther',44]],puzzle:[['The observatory mirrors a star twice. Which image is real?',['nearest','brightest','the one that moves with you'],2],['A pendulum points north after...',['one swing','it settles','being stopped'],1]]},
  wyrm:{index:8,badge:'Apex Badge',leader:'Leader Kael',type:'Dragon',tm:'dragonBreath',hm:null,team:[['dratini',49],['skarmory',50],['dragonair',52]],puzzle:[['The old dragon gate opens for trainers who choose...',['power','patience','fear'],1],['A dragon circles the peak against the wind because...',['it is lost','lift is stronger','the mountain commands it'],1]]}
};

const CLASSIC_HMS={
  Cut:{move:'cut',badge:1,desc:'Cuts small trees blocking routes.'},
  Flash:{move:'flash',badge:2,desc:'Illuminates dark cave passages.'},
  'Rock Smash':{move:'rockSmash',badge:3,desc:'Breaks cracked rocks.'},
  Surf:{move:'surf',badge:4,desc:'Crosses deep water.'},
  Strength:{move:'strength',badge:5,desc:'Moves heavy boulders.'},
  Fly:{move:'fly',badge:6,desc:'Fast-travels to visited towns.'},
  Waterfall:{move:'waterfall',badge:7,desc:'Climbs strong waterfalls.'}
};
const TM_NAMES={razorLeaf:'TM12 Razor Leaf',rockThrow:'TM18 Rock Throw',spark:'TM24 Spark',aquaTail:'TM37 Aqua Tail',shadowSneak:'TM41 Shadow Sneak',icyWind:'TM52 Icy Wind',psybeam:'TM63 Psybeam',dragonBreath:'TM79 Dragon Breath',quickAttack:'TM08 Quick Attack',bite:'TM21 Bite',metalClaw:'TM46 Metal Claw',fairyWind:'TM58 Fairy Wind'};
const AREA_TM_PICKUPS={route1:'quickAttack',whisperwood:'bugBite',route3:'mudShot',echo_cave:'metalClaw',route4:'bite',route5:'waterGun',gravehollow:'astonish',route6:'iceShard',route7:'wingAttack',route8:'fairyWind',dragonpass:'dragonBreath',victory_road:'lowKick'};

MOVES.cut={name:'Cut',type:'Normal',category:'Physical',power:50,accuracy:95,pp:30};
MOVES.flash={name:'Flash',type:'Normal',category:'Status',power:0,accuracy:100,pp:20,debuff:'def'};
MOVES.rockSmash={name:'Rock Smash',type:'Fighting',category:'Physical',power:40,accuracy:100,pp:15};
MOVES.surf={name:'Surf',type:'Water',category:'Special',power:90,accuracy:100,pp:15};
MOVES.strength={name:'Strength',type:'Normal',category:'Physical',power:80,accuracy:100,pp:15};
MOVES.fly={name:'Fly',type:'Flying',category:'Physical',power:90,accuracy:95,pp:15};
MOVES.waterfall={name:'Waterfall',type:'Water',category:'Physical',power:80,accuracy:100,pp:15};
ITEMS['Ultra Ball']={icon:'ultra-ball.png',kind:'ball',power:2,desc:'A high-performance Ball with a much better catch rate.'};
ITEMS['Hyper Potion']={icon:'hyper-potion.png',kind:'heal',amount:120,desc:'Restores 120 HP to one Pokémon.'};

const CLASSIC_VISUALS={
  verdant:{palette:{ground:'#79ad67',ground2:'#5e9859',path:'#cdb37d',edge:'#4d6b48',water:'#69a9c6',accent:'#f0d167'},battle:'forest.jpg'},
  cinder:{palette:{ground:'#9e8267',ground2:'#746454',path:'#d1b37a',edge:'#544d48',water:'#6f9dad',accent:'#e4b35d'},battle:'mountain.jpg'},
  tide:{palette:{ground:'#76aa76',ground2:'#5b936b',path:'#d0b47e',edge:'#4f6f5c',water:'#5da6ca',accent:'#68c9dc'},battle:'lake.jpg'},
  dusk:{palette:{ground:'#696b64',ground2:'#545d55',path:'#a89678',edge:'#4b4856',water:'#596f86',accent:'#bda7dc'},battle:'ghostly.jpg'},
  frost:{palette:{ground:'#a8c9bd',ground2:'#8eafa8',path:'#d7c49a',edge:'#677a79',water:'#76aac5',accent:'#d9eef1'},battle:'snowy_tundra.jpg'},
  sky:{palette:{ground:'#8ab480',ground2:'#6c9c71',path:'#d6bf85',edge:'#5b705f',water:'#72acd3',accent:'#f2d26d'},battle:'flower_field.jpg'}
};

function classicArea(id=S.currentArea){return CLASSIC_AREAS[id]||CLASSIC_AREAS.seabreeze}
function classicVisual(id=S.currentArea){const a=classicArea(id),base=CLASSIC_VISUALS[a.theme]||CLASSIC_VISUALS.verdant;return {...base,name:a.name,subtitle:a.subtitle,weather:a.weather,palette:{...base.palette}}}
function badgeCount(){return Object.keys(S.badges||{}).length}
function gymStatusName(){const n=badgeCount();return S.champion?'CHAMPION':n>=8?'LEAGUE READY':n>=6?'ACE TRAINER':n>=3?'GYM CHALLENGER':'NEW TRAINER'}
function classicBST(id){const b=SPECIES[id]?.base;if(!b)return 999;const [spa,spd]=SPECIAL_STATS[id]||[b.atk,b.def];return b.hp+b.atk+b.def+spa+spd+b.spe}
function bstCap(){return [310,330,355,385,415,450,485,525,620][Math.min(8,badgeCount())]}
function levelRange(area=classicArea()){const boost=Math.max(0,badgeCount()-Math.max(0,CLASSIC_AREA_ORDER.indexOf(S.currentArea)/3|0));return [area.level[0]+Math.min(3,boost),area.level[1]+Math.min(4,boost)]}
function classicLevel(area=classicArea()){const [lo,hi]=levelRange(area);return lo+Math.floor(Math.random()*(hi-lo+1))}
function classicEncounterPool(area=classicArea()){
  const cap=bstCap();return (area.encounters||[]).filter(id=>SPECIES[id]&&classicBST(id)<=cap+20);
}
function classicRollEncounter(areaId=S.currentArea){const pool=classicEncounterPool(CLASSIC_AREAS[areaId]);return pool.length?choose(pool):null}
function knowsMove(mon,moveId){return !!mon?.moves?.some(m=>m.id===moveId)}
function partyKnows(moveId){return S.party.some(m=>knowsMove(m,moveId))}
function canUseHM(name){const hm=CLASSIC_HMS[name];return !!hm&&!!S.hmsOwned?.[name]&&badgeCount()>=hm.badge&&partyKnows(hm.move)}

/* ------------------------------ State/save ------------------------------ */
function classicFreshState(){
  const out=LEGACY_FRESH_STATE(90090);
  out.version=90;out.started=false;out.currentArea='seabreeze';out.currentTitan='verdant';out.player={x:30,y:34,dir:'up',frame:0};
  out.fieldCredits=600;out.inventory={'Poke Ball':10,'Great Ball':0,'Ultra Ball':0,'Potion':5,'Super Potion':0,'Hyper Potion':0,'Revive':1};
  out.badges={};out.hmsOwned={};out.tms={};out.defeatedTrainers={};out.pickedItems={};out.clearedObstacles={};out.puzzleState={};out.gymPuzzleProgress={};out.visitedAreas={seabreeze:true};out.visitedTowns={seabreeze:true};out.lastCenter='seabreeze';out.champion=false;out.rivalWins=0;out.storyFlags={lab:false,rival1:false,league:false};out.safeSteps=9999;out.stepsSinceShift=0;out.insideDen=null;out.denReturn=null;out.ending=null;out.lastTicker='Professor Linden is waiting at the lab in Seabreeze Town.';out.tutorial={moved:0,ranger:false,enteredDen:false,wonDen:false,complete:true};
  return out;
}
freshState=classicFreshState;
normalizeLoadedState=function(raw){
  const base=classicFreshState(),out=Object.assign(base,raw||{});out.player=Object.assign({},base.player,raw?.player||{});out.inventory=Object.assign({},base.inventory,raw?.inventory||{});out.badges=Object.assign({},raw?.badges||{});out.hmsOwned=Object.assign({},raw?.hmsOwned||{});out.tms=Object.assign({},raw?.tms||{});out.defeatedTrainers=Object.assign({},raw?.defeatedTrainers||{});out.pickedItems=Object.assign({},raw?.pickedItems||{});out.clearedObstacles=Object.assign({},raw?.clearedObstacles||{});out.puzzleState=Object.assign({},raw?.puzzleState||{});out.gymPuzzleProgress=Object.assign({},raw?.gymPuzzleProgress||{});out.visitedAreas=Object.assign({},base.visitedAreas,raw?.visitedAreas||{});out.visitedTowns=Object.assign({},base.visitedTowns,raw?.visitedTowns||{});out.storyFlags=Object.assign({},base.storyFlags,raw?.storyFlags||{});out.currentArea=CLASSIC_AREAS[raw?.currentArea]?raw.currentArea:'seabreeze';out.currentTitan=classicArea(out.currentArea).theme;out.version=90;
  const restore=m=>{if(!SPECIES[m.species])return null;const rebuilt=createMon(m.species,m.level||5,{starter:m.starter,caughtAt:m.caughtAt});Object.assign(rebuilt,m);rebuilt.stages={atk:0,def:0};rebuilt.moves=(m.moves||rebuilt.moves).filter(mm=>MOVES[mm.id]).map(mm=>({...mm,maxPp:mm.maxPp||MOVES[mm.id].pp,pp:Math.min(mm.pp??MOVES[mm.id].pp,mm.maxPp||MOVES[mm.id].pp)}));return rebuilt};
  out.party=(raw?.party||[]).map(restore).filter(Boolean);out.storage=(raw?.storage||[]).map(restore).filter(Boolean);return out;
};
saveGame=function(showNotice=false){if(!S.started)return;S.lastSaved=Date.now();localStorage.setItem(CLASSIC_SAVE_KEY,JSON.stringify(S));if(showNotice)toast('Game saved.')};
loadGame=function(){try{const raw=localStorage.getItem(CLASSIC_SAVE_KEY);if(!raw)return false;S=normalizeLoadedState(JSON.parse(raw));return !!S.started}catch(err){console.warn('Could not load Asterra save',err);return false}};
hasSave=function(){return !!localStorage.getItem(CLASSIC_SAVE_KEY)};

/* ----------------------------- Map building ----------------------------- */
function classicTiles(fill='ground'){return Array.from({length:ROWS},()=>Array(COLS).fill(fill))}
function classicRect(tiles,x0,y0,x1,y1,kind){for(let y=Math.max(0,y0);y<=Math.min(ROWS-1,y1);y++)for(let x=Math.max(0,x0);x<=Math.min(COLS-1,x1);x++)tiles[y][x]=kind}
function classicBorder(tiles,kind='obstacle'){for(let x=0;x<COLS;x++){tiles[0][x]=kind;tiles[ROWS-1][x]=kind}for(let y=0;y<ROWS;y++){tiles[y][0]=kind;tiles[y][COLS-1]=kind}}
function classicBuildingBlock(tiles,x,y){classicRect(tiles,x-2,y-1,x+2,y,'building');tiles[y+1][x]='path'}
