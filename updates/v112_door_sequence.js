/* Pokémon: Driftbound v112 — clear doorway traversal + steep entrance/exit camera. */
(function(){
  'use strict';

  const THREE=window.THREE;
  const World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  const BUILDINGS=new Set(['center','mart','gym','lab']);
  const CAPTURE_DEPTH=3;
  const CAPTURE_HALF_WIDTH=2;

  const STAGE_OUTSIDE_TILES=1.65;
  const VESTIBULE_TILES=.72;
  const EXIT_LANDING_TILES=2;

  const ENTRY_CAMERA_HEIGHT=12.25;
  const ENTRY_CAMERA_BACK=4.80;
  const ENTRY_LOOK_Y=.18;
  const ENTRY_LOOK_AHEAD=.05;

  const previousUpdatePlayer=World.prototype.updatePlayer;
  const previousTryMove=tryMove;
  const previousMakeBuilding=World.prototype.makeBuilding;
  const previousInteractNearest=interactNearest;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

  let guideBusy=false;
  let guideWalk=null;

  function doorPoint(o){return {x:o.x,y:o.y+3};}

  function buildingInApproachZone(x,y){
    if(currentMap?.roomKind)return null;
    return (currentMap?.objects||[]).find(o=>{
      if(!BUILDINGS.has(o.type))return false;
      const d=doorPoint(o),depth=y-d.y;
      return depth>=1&&depth<=CAPTURE_DEPTH&&Math.abs(x-d.x)<=CAPTURE_HALF_WIDTH;
    })||null;
  }

  function addCenterVestibule(world,g){
    const D=7.1;
    const floorColor='#f4eee3';
    const wallColor='#f8f5ed';
    const groutColor='#ddd3c4';

    g.traverse(o=>{
      if(!o.isMesh||!o.geometry?.parameters)return;
      const q=o.geometry.parameters;
      if(Math.abs((q.width||0)-2.46)<.06&&
         Math.abs((q.height||0)-2.72)<.08&&
         Math.abs((q.depth||0)-.31)<.06){
        o.visible=false;
      }
    });

    const back=world.mesh(
      new THREE.BoxGeometry(2.40,2.52,.065),
      world.material(wallColor,{roughness:.88}),
      {cast:false,receive:true}
    );
    back.name='dbCenterVestibuleBack';
    back.position.set(0,1.64,D/2+.455);
    g.add(back);

    const floor=world.mesh(
      new THREE.BoxGeometry(2.38,.075,1.28),
      world.material(floorColor,{roughness:.96}),
      {cast:false,receive:true}
    );
    floor.name='dbCenterVestibuleFloor';
    floor.position.set(0,.385,D/2+.20);
    g.add(floor);

    const seamMat=world.material(groutColor,{roughness:1});
    [-.22,.14,.50].forEach(zOffset=>{
      const seam=world.mesh(new THREE.BoxGeometry(2.27,.012,.022),seamMat,{cast:false,receive:false});
      seam.position.set(0,.428,D/2+zOffset);
      g.add(seam);
    });
    const centerSeam=world.mesh(new THREE.BoxGeometry(.022,.012,1.08),seamMat,{cast:false,receive:false});
    centerSeam.position.set(0,.428,D/2+.23);
    g.add(centerSeam);
  }

  World.prototype.makeBuilding=function(kind,p){
    const g=previousMakeBuilding.call(this,kind,p);
    if(kind==='center')addCenterVestibule(this,g);
    return g;
  };

  function ensureTransitionElement(){
    if(!document.getElementById('v112DoorTransitionStyle')){
      const style=document.createElement('style');
      style.id='v112DoorTransitionStyle';
      style.textContent=`
        #buildingSceneTransition{position:absolute;inset:0;z-index:95;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 52%,rgba(255,255,255,.22) 0 6%,rgba(6,14,22,.86) 38%,#020609 75%);transition:opacity .22s ease;}
        #buildingSceneTransition::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 0 42%,rgba(255,255,255,.8) 48%,transparent 56%);transform:translateY(-120%);opacity:0;}
        #buildingSceneTransition.active{opacity:1;}
        #buildingSceneTransition.active::after{opacity:.45;animation:dbDoorSweep112 .42s ease both;}
        @keyframes dbDoorSweep112{to{transform:translateY(120%)}}
      `;
      document.head.appendChild(style);
    }
    let el=document.getElementById('buildingSceneTransition');
    if(!el){
      el=document.createElement('div');
      el.id='buildingSceneTransition';
      const frame=document.getElementById('worldFrame');
      (frame||document.body).appendChild(el);
    }
    return el;
  }

  function makeWalk(world,toX,toY,duration,forcedRot=null){
    const from=world.player.position.clone();
    const ground=world.groundHeightAt?.(toX,toY)||.38;
    const to=world.gridPosition(toX,toY,ground);
    const dx=to.x-from.x,dz=to.z-from.z;
    const walk={
      from,
      to,
      start:performance.now(),
      duration,
      targetRot:forcedRot??Math.atan2(-dx,-dz),
      moving:true
    };
    guideWalk=walk;
    return walk;
  }

  function startVisualWalk(world,toX,toY,duration,forcedRot=null){
    const walk=makeWalk(world,toX,toY,duration,forcedRot);
    return sleep(duration).then(()=>{
      if(guideWalk===walk){
        walk.from.copy(walk.to);
        walk.start=performance.now();
        walk.duration=1;
        walk.moving=false;
      }
    });
  }

  function holdVisualAt(world,x,y,targetRot){
    const ground=world.groundHeightAt?.(x,y)||.38;
    const p=world.gridPosition(x,y,ground);
    guideWalk={
      from:p.clone(),
      to:p.clone(),
      start:performance.now(),
      duration:1,
      targetRot,
      moving:false
    };
    world.player.position.copy(p);
  }

  World.prototype.updatePlayer=function(state,time,frameDelta){
    if(!guideWalk)return previousUpdatePlayer.call(this,state,time,frameDelta);

    this.player.visible=!!state.started;
    const t=Math.min(1,Math.max(0,(performance.now()-guideWalk.start)/Math.max(1,guideWalk.duration)));
    this.player.position.lerpVectors(guideWalk.from,guideWalk.to,ease(t));

    let delta=(guideWalk.targetRot-this.player.rotation.y+Math.PI)%(Math.PI*2)-Math.PI;
    if(delta<-Math.PI)delta+=Math.PI*2;
    this.player.rotation.y+=delta*(1-Math.exp(-frameDelta*20));

    if(this.player.userData?.isCalem&&typeof this.animateCalem==='function'){
      if(guideWalk.moving)this.jogPhase+=frameDelta*11.5;
      this.animateCalem(!!guideWalk.moving,this.jogPhase,frameDelta,guideWalk.moving?1:0,Math.max(-1,Math.min(1,delta*1.4)));
    }

    const cameraGoal=this.player.position.clone().add(new THREE.Vector3(0,ENTRY_CAMERA_HEIGHT,ENTRY_CAMERA_BACK));
    this.camera.position.lerp(cameraGoal,1-Math.exp(-frameDelta*11));
    const lookGoal=this.player.position.clone().add(new THREE.Vector3(0,ENTRY_LOOK_Y,ENTRY_LOOK_AHEAD));
    this.cameraLook.lerp(lookGoal,1-Math.exp(-frameDelta*12));
    this.camera.lookAt(this.cameraLook);
  };

  function nearestExteriorBuilding(kind,anchorX,anchorY){
    const candidates=(currentMap?.objects||[]).filter(o=>o.type===kind);
    if(!candidates.length)return null;
    candidates.sort((a,b)=>{
      const da=Math.abs(a.x-anchorX)+Math.abs((a.y+3)-anchorY);
      const db=Math.abs(b.x-anchorX)+Math.abs((b.y+3)-anchorY);
      return da-db;
    });
    return candidates[0]||null;
  }

  async function transitionInside(o,d){
    const transition=ensureTransitionElement();
    transition.classList.add('active');
    await sleep(235);

    S.player.x=d.x;
    S.player.y=d.y;
    S.player.dir='up';
    window.__DRIFTBOUND_V91__.enterBuilding(o);
    guideWalk=null;

    await sleep(120);
    transition.classList.remove('active');
    await sleep(240);
  }

  async function guidedEntry(o){
    if(guideBusy||B||currentMap?.roomKind)return;
    const doors=window.__DRIFTBOUND_V102_DOORS__;
    const region=window.__DRIFTBOUND_V91__;
    if(!doors?.animateDoor||!region?.enterBuilding)return;

    guideBusy=true;
    inputLocked=true;

    try{
      const d=doorPoint(o);
      const stageY=d.y+STAGE_OUTSIDE_TILES;
      const logicalDistance=Math.hypot(d.x-S.player.x,stageY-S.player.y);
      const stageDuration=Math.max(280,Math.min(620,240+logicalDistance*115));

      await startVisualWalk(WORLD3D,d.x,stageY,stageDuration,0);
      await sleep(180);
      await doors.animateDoor(o,true);
      await sleep(100);

      // Cross the glass threshold only. v111 walked too far into the Center's
      // solid shell mesh, which looked like an invisible wall.
      await startVisualWalk(WORLD3D,d.x,d.y+VESTIBULE_TILES,390,0);
      await sleep(70);

      await doors.animateDoor(o,false);
      await sleep(110);
      await transitionInside(o,d);
    }catch(error){
      console.error('Driftbound v112 entry sequence failed',error);
      guideWalk=null;
    }finally{
      inputLocked=false;
      guideBusy=false;
      updateInteractionHint?.();
    }
  }

  async function exitAutomatically(){
    if(guideBusy||B||!currentMap?.roomKind)return;
    const doors=window.__DRIFTBOUND_V102_DOORS__;
    const region=window.__DRIFTBOUND_V91__;
    if(!doors?.animateDoor||!region?.exitBuilding)return;

    guideBusy=true;
    inputLocked=true;

    const roomKind=currentMap.roomKind;
    const oldX=S.player.x,oldY=S.player.y;
    const transition=ensureTransitionElement();

    try{
      transition.classList.add('active');
      await sleep(235);
      region.exitBuilding();

      const building=nearestExteriorBuilding(roomKind,S.player.x,S.player.y);
      if(!building)throw new Error(`No exterior ${roomKind} building found after exit`);

      const d=doorPoint(building);
      holdVisualAt(WORLD3D,d.x,d.y+VESTIBULE_TILES,Math.PI);

      // End two tiles outside if possible, never on the doorway tile.
      const landingY=(typeof walkable==='function'&&walkable(d.x,d.y+EXIT_LANDING_TILES))
        ? d.y+EXIT_LANDING_TILES
        : d.y+1;
      S.player.x=d.x;
      S.player.y=landingY;
      S.player.dir='down';

      await sleep(110);
      transition.classList.remove('active');
      await sleep(220);

      await doors.animateDoor(building,true);
      await sleep(90);
      await startVisualWalk(WORLD3D,d.x,landingY,500,Math.PI);
      await sleep(70);
      await doors.animateDoor(building,false);
      await sleep(100);
      guideWalk=null;
    }catch(error){
      console.error('Driftbound v112 exit sequence failed',error);
      guideWalk=null;
      if(currentMap?.roomKind){
        S.player.x=oldX;
        S.player.y=oldY;
      }
      transition.classList.remove('active');
    }finally{
      inputLocked=false;
      guideBusy=false;
      updateInteractionHint?.();
    }
  }

  tryMove=function(dx,dy){
    if(guideBusy)return;

    // Replace v102's one-tile exit before the old handler can run.
    if(!B&&currentMap?.roomKind&&dy>0){
      const tx=S.player.x+dx,ty=S.player.y+dy;
      const exit=(currentMap.objects||[]).find(o=>o.type==='exitBuilding'&&o.x===tx&&o.y===ty);
      if(exit){
        S.player.x=tx;
        S.player.y=ty;
        S.player.dir='down';
        void exitAutomatically();
        return;
      }
    }

    if(!B&&!currentMap?.roomKind&&dy<0){
      const waiting=buildingInApproachZone(S.player.x,S.player.y);
      if(waiting){
        void guidedEntry(waiting);
        return;
      }
    }

    const oldX=S.player.x,oldY=S.player.y;
    previousTryMove(dx,dy);

    if(guideBusy||B||currentMap?.roomKind||dy>=0)return;
    if(S.player.x===oldX&&S.player.y===oldY)return;

    const hit=buildingInApproachZone(S.player.x,S.player.y);
    if(hit)void guidedEntry(hit);
  };

  interactNearest=function(){
    if(guideBusy)return;
    try{
      const o=typeof nearbyObject==='function'?nearbyObject():null;
      if(currentMap?.roomKind&&o?.type==='exitBuilding'){
        void exitAutomatically();
        return;
      }
    }catch(_e){}
    return previousInteractNearest();
  };

  window.tryMove=tryMove;
  window.interactNearest=interactNearest;
  window.__DRIFTBOUND_V112_DOOR_SEQUENCE__={guidedEntry,exitAutomatically,buildingInApproachZone};
})();
