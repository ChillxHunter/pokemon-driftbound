/* Pokémon: Driftbound v102 — automatic building doors + scene transitions. */
(function(){
  'use strict';
  const THREE=window.THREE,World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  const BUILDINGS=new Set(['center','mart','gym','lab']);
  const previousMakeBuilding=World.prototype.makeBuilding;
  const previousUpdatePlayer=World.prototype.updatePlayer;
  let doorBusy=false;
  let walkAnim=null;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

  function material(world,color,opts={}){return world.material(color,opts);}
  function addSlidingDoors(world,g,kind){
    // Pokémon Center already has its larger custom glass doors from v102.
    if(kind==='center'){
      const candidates=[];
      g.traverse(o=>{
        if(!o.isMesh||!o.geometry?.parameters)return;
        const q=o.geometry.parameters;
        if(Math.abs((q.width||0)-1.08)<.08&&Math.abs((q.height||0)-2.58)<.12)candidates.push(o);
      });
      candidates.sort((a,b)=>a.position.x-b.position.x).slice(0,2).forEach((d,i)=>{
        d.name=i===0?'dbSlideDoorLeft':'dbSlideDoorRight';
        d.userData.closedX=d.position.x;
        d.userData.openOffset=i===0?-1.02:1.02;
      });
      return;
    }

    // Hide the old single Mart door, then put a proper pair of glass sliders over it.
    g.traverse(o=>{
      if(!o.isMesh||!o.geometry?.parameters)return;
      const q=o.geometry.parameters;
      if(Math.abs((q.width||0)-1.15)<.08&&Math.abs((q.height||0)-2.12)<.12)o.visible=false;
    });
    const D=5.2,z=D/2+.22;
    const glass=new THREE.MeshStandardMaterial({color:'#7fc9e2',emissive:'#356f88',emissiveIntensity:.12,roughness:.16,transparent:true,opacity:.86});
    [-.3,.3].forEach((x,i)=>{
      const d=world.mesh(new THREE.BoxGeometry(.58,2.14,.085),glass,{cast:false,receive:false});
      d.position.set(x,1.2,z);d.name=i===0?'dbSlideDoorLeft':'dbSlideDoorRight';d.userData.closedX=x;d.userData.openOffset=i===0?-.62:.62;g.add(d);
    });
  }

  function addHingedDoor(world,g,kind){
    // Replace the old static door with a door attached to a real hinge pivot.
    g.traverse(o=>{
      if(!o.isMesh||!o.geometry?.parameters)return;
      const q=o.geometry.parameters;
      if(Math.abs((q.width||0)-1.15)<.08&&Math.abs((q.height||0)-2.12)<.12)o.visible=false;
    });
    const D=kind==='gym'?6.0:5.2,z=D/2+.18;
    const pivot=new THREE.Group();pivot.name='dbHingedDoorPivot';pivot.position.set(-.575,1.2,z);
    const door=world.mesh(new THREE.BoxGeometry(1.15,2.12,.11),material(world,kind==='gym'?'#59463a':'#655041',{roughness:.72}));
    door.position.set(.575,0,0);pivot.add(door);
    const glass=world.mesh(new THREE.BoxGeometry(.52,.7,.035),material(world,'#8ec9d9',{emissive:'#3b7180',emissiveIntensity:.08,roughness:.25}),{cast:false,receive:false});
    glass.position.set(.575,.28,.07);pivot.add(glass);
    pivot.userData.closedRotation=0;pivot.userData.openRotation=-Math.PI*.48;g.add(pivot);
  }

  World.prototype.makeBuilding=function(kind,p){
    const g=previousMakeBuilding.call(this,kind,p);
    g.userData.buildingKind=kind;
    if(kind==='center'||kind==='mart')addSlidingDoors(this,g,kind);
    else addHingedDoor(this,g,kind);
    return g;
  };

  // During the short automatic walk through a doorway, temporarily take over
  // only the player's visual position. Logical collision coordinates stay safe.
  World.prototype.updatePlayer=function(state,time,frameDelta){
    if(!walkAnim)return previousUpdatePlayer.call(this,state,time,frameDelta);
    this.player.visible=!!state.started;
    const t=Math.min(1,Math.max(0,(performance.now()-walkAnim.start)/walkAnim.duration));
    this.player.position.lerpVectors(walkAnim.from,walkAnim.to,ease(t));
    const targetRot=walkAnim.dir==='down'?Math.PI:0;
    let d=(targetRot-this.player.rotation.y+Math.PI)%(Math.PI*2)-Math.PI;if(d<-Math.PI)d+=Math.PI*2;
    this.player.rotation.y+=d*(1-Math.exp(-frameDelta*18));
    if(this.player.userData?.isCalem&&typeof this.animateCalem==='function'){
      this.jogPhase+=frameDelta*11.5;this.animateCalem(true,this.jogPhase,frameDelta);
    }
    const cameraGoal=this.player.position.clone().add(new THREE.Vector3(0,4.75,6.75));
    this.camera.position.lerp(cameraGoal,1-Math.exp(-frameDelta*6));
    const lookGoal=this.player.position.clone().add(new THREE.Vector3(0,.68,-3.25));
    this.cameraLook.lerp(lookGoal,1-Math.exp(-frameDelta*7));this.camera.lookAt(this.cameraLook);
  };

  function transitionElement(){
    let el=document.getElementById('buildingSceneTransition');
    if(el)return el;
    const style=document.createElement('style');
    style.textContent=`
      #buildingSceneTransition{position:absolute;inset:0;z-index:95;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 52%,rgba(255,255,255,.22) 0 6%,rgba(6,14,22,.86) 38%,#020609 75%);transition:opacity .22s ease;}
      #buildingSceneTransition::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 0 42%,rgba(255,255,255,.8) 48%,transparent 56%);transform:translateY(-120%);opacity:0;}
      #buildingSceneTransition.active{opacity:1;}
      #buildingSceneTransition.active::after{opacity:.45;animation:dbDoorSweep .42s ease both;}
      @keyframes dbDoorSweep{to{transform:translateY(120%)}}
    `;document.head.appendChild(style);
    el=document.createElement('div');el.id='buildingSceneTransition';
    const frame=document.getElementById('worldFrame');(frame||document.body).appendChild(el);return el;
  }

  function buildingDoorPoint(o){return {x:o.x,y:o.y+3};}
  function nearestBuildingGroup(o){
    if(typeof WORLD3D==='undefined'||!WORLD3D?.worldRoot)return null;
    const target=WORLD3D.gridPosition(o.x,o.y,.38),found=[];
    WORLD3D.worldRoot.traverse(n=>{
      if(n.userData?.buildingKind!==o.type)return;
      const wp=new THREE.Vector3();n.getWorldPosition(wp);found.push({n,d:wp.distanceToSquared(target)});
    });
    return found.sort((a,b)=>a.d-b.d)[0]?.n||null;
  }

  function animateDoor(o,open=true){
    const g=nearestBuildingGroup(o);if(!g)return Promise.resolve();
    const parts=[];g.traverse(n=>{if(n.name==='dbSlideDoorLeft'||n.name==='dbSlideDoorRight'||n.name==='dbHingedDoorPivot')parts.push(n);});
    if(!parts.length)return Promise.resolve();
    const start=performance.now(),duration=260;
    return new Promise(resolve=>{
      function frame(now){
        const t=ease(Math.min(1,(now-start)/duration));
        parts.forEach(n=>{
          if(n.name==='dbHingedDoorPivot'){
            const a=n.userData.closedRotation||0,b=n.userData.openRotation||-Math.PI*.48;
            n.rotation.y=open?a+(b-a)*t:b+(a-b)*t;
          }else{
            const a=n.userData.closedX??n.position.x,b=a+(n.userData.openOffset||0);
            n.position.x=open?a+(b-a)*t:b+(a-b)*t;
          }
        });
        if(t<1)requestAnimationFrame(frame);else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  function visualWalk(x1,y1,x2,y2,dir='up',duration=360){
    if(typeof WORLD3D==='undefined')return sleep(duration);
    walkAnim={from:WORLD3D.gridPosition(x1,y1,WORLD3D.groundHeightAt?.(x1,y1)||.38),to:WORLD3D.gridPosition(x2,y2,WORLD3D.groundHeightAt?.(x1,y1)||.38),start:performance.now(),duration,dir};
    return sleep(duration).then(()=>{walkAnim=null;});
  }

  async function fadeSwap(fn){
    const t=transitionElement();t.classList.add('active');await sleep(235);fn();await sleep(120);t.classList.remove('active');await sleep(240);
  }

  async function enterAutomatically(o){
    if(doorBusy||!window.__DRIFTBOUND_V91__?.enterBuilding)return;
    doorBusy=true;inputLocked=true;
    const door=buildingDoorPoint(o);
    await animateDoor(o,true);
    await visualWalk(door.x,door.y,door.x,door.y-1.7,'up',370);
    await fadeSwap(()=>window.__DRIFTBOUND_V91__.enterBuilding(o));
    inputLocked=false;doorBusy=false;
  }

  async function exitAutomatically(){
    if(doorBusy||!window.__DRIFTBOUND_V91__?.exitBuilding)return;
    doorBusy=true;inputLocked=true;
    await fadeSwap(()=>window.__DRIFTBOUND_V91__.exitBuilding());
    // The exterior door is now present again. Open it, walk the player out one tile,
    // then close it behind them.
    const areaObjects=currentMap?.objects||[];
    const o=areaObjects.find(x=>BUILDINGS.has(x.type)&&Math.abs((x.x)-S.player.x)<=1&&Math.abs((x.y+3)-S.player.y)<=2);
    if(o){
      await animateDoor(o,true);
      const startY=S.player.y;S.player.dir='down';
      await visualWalk(S.player.x,startY,S.player.x,startY+1,'down',320);
      if(walkable(S.player.x,startY+1))S.player.y=startY+1;
      await animateDoor(o,false);
    }
    inputLocked=false;doorBusy=false;updateInteractionHint?.();
  }

  const previousTryMove=tryMove;
  tryMove=function(dx,dy){
    if(doorBusy)return;
    const wasInterior=!!currentMap?.roomKind;
    const ox=S.player.x,oy=S.player.y;
    previousTryMove(dx,dy);
    const moved=S.player.x!==ox||S.player.y!==oy;if(!moved||B)return;

    if(!wasInterior&&dy<0&&!currentMap?.roomKind){
      const hit=(currentMap.objects||[]).find(o=>{
        if(!BUILDINGS.has(o.type))return false;
        const p=buildingDoorPoint(o);return p.x===S.player.x&&p.y===S.player.y;
      });
      if(hit){setTimeout(()=>enterAutomatically(hit),20);return;}
    }

    if(wasInterior&&currentMap?.roomKind&&dy>0){
      const exit=(currentMap.objects||[]).find(o=>o.type==='exitBuilding'&&o.x===S.player.x&&o.y===S.player.y);
      if(exit)setTimeout(exitAutomatically,20);
    }
  };

  // Keep A/E for NPCs and objects, but doors no longer require a button.
  interactNearest=function(){
    if(inputLocked||B||activePanel)return;
    if(!DOM.dialogue.classList.contains('hidden')){advanceDialogue();return;}
    const o=nearbyObject();if(!o)return;
    if(o.type==='exitBuilding'){exitAutomatically();return;}
    if(o.type==='nurse'){showDialogue([{speaker:'POKÉMON CENTER',text:'Welcome! I will restore your Pokémon to full health.'}],()=>{healParty();S.lastCenter=S.currentArea;saveGame();updateSideUI();toast('Your Pokémon are fully healed.');});return;}
    if(o.type==='pc'){openStoragePanel();return;}
    if(o.type==='clerk'){openMartPanel();return;}
    if(o.type==='professor'){interactLab();return;}
    if(o.type==='gymGuide'){const g=GYMS[o.gym];showDialogue([{speaker:'GYM GUIDE',text:S.badges[o.gym]?`You already defeated ${g.leader}. Nice work!`:`Welcome! ${g.leader} specializes in ${g.type}-type Pokémon. Prepare before you challenge them.`}]);return;}
    if(o.type==='gymLeader'){openGymPanel(o.gym);return;}
    if(o.type==='npc'){showDialogue([{speaker:(o.name||'TRAINER').toUpperCase(),text:o.line||'Good luck on your journey!'}]);return;}
    if(o.type==='trainer'||o.type==='rival'){classicTrainerBattle(o);return;}
    if(o.type==='hmGate'){useHmGate(o);return;}
    if(o.type==='puzzleSwitch'){togglePuzzle(o);return;}
    if(o.type==='puzzleDoor'){showDialogue([{speaker:'SEALED DOOR',text:'Three switches in this cave must all be active.'}]);return;}
    if(o.type==='itemPickup'||o.type==='tmPickup'){claimPickup(o);return;}
    if(o.type==='leagueGate'){startLeague();return;}
    if(o.type==='sign'||o.type==='exitSign'){readClassicSign(o);return;}
    if(o.type==='wild')startBattle(o.species,{level:o.level||classicLevel()});
  };
  window.interactNearest=interactNearest;
  window.__DRIFTBOUND_V102_DOORS__={enterAutomatically,exitAutomatically,animateDoor};
})();
