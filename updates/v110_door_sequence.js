/* Pokémon: Driftbound v110 — staged door entry + interior-matched vestibule. */
(function(){
  'use strict';

  const THREE=window.THREE;
  const World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  const BUILDINGS=new Set(['center','mart','gym','lab']);
  const CAPTURE_DEPTH=3;
  const CAPTURE_HALF_WIDTH=2;
  const previousUpdatePlayer=World.prototype.updatePlayer;
  const previousTryMove=tryMove;
  const previousMakeBuilding=World.prototype.makeBuilding;
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

    // Remove the old dark faux doorway. It is what made an open Center door
    // look like a black void instead of a continuation of the interior.
    g.traverse(o=>{
      if(!o.isMesh||!o.geometry?.parameters)return;
      const q=o.geometry.parameters;
      if(Math.abs((q.width||0)-2.46)<.06&&Math.abs((q.height||0)-2.72)<.08&&Math.abs((q.depth||0)-.31)<.06){
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

    // Exact Pokémon Center interior floor color from the interior renderer.
    // This shallow slab remains visible through the glass and while the doors
    // are open, so the threshold visually connects exterior and interior.
    const floor=world.mesh(
      new THREE.BoxGeometry(2.38,.075,1.28),
      world.material(floorColor,{roughness:.96}),
      {cast:false,receive:true}
    );
    floor.name='dbCenterVestibuleFloor';
    floor.position.set(0,.385,D/2+.20);
    g.add(floor);

    // Subtle tile seams make the pale surface read as a floor rather than a
    // flat cream wall seen through the glass.
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
    if(!document.getElementById('v110DoorTransitionStyle')){
      const style=document.createElement('style');
      style.id='v110DoorTransitionStyle';
      style.textContent=`
        #buildingSceneTransition{position:absolute;inset:0;z-index:95;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 52%,rgba(255,255,255,.22) 0 6%,rgba(6,14,22,.86) 38%,#020609 75%);transition:opacity .22s ease;}
        #buildingSceneTransition::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 0 42%,rgba(255,255,255,.8) 48%,transparent 56%);transform:translateY(-120%);opacity:0;}
        #buildingSceneTransition.active{opacity:1;}
        #buildingSceneTransition.active::after{opacity:.45;animation:dbDoorSweep110 .42s ease both;}
        @keyframes dbDoorSweep110{to{transform:translateY(120%)}}
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

  function startVisualWalk(world,toX,toY,duration){
    const from=world.player.position.clone();
    const ground=world.groundHeightAt?.(toX,toY)||.38;
    const to=world.gridPosition(toX,toY,ground);
    const dx=to.x-from.x,dz=to.z-from.z;
    const walk={
      from,
      to,
      start:performance.now(),
      duration,
      targetRot:Math.atan2(-dx,-dz),
      moving:true
    };
    guideWalk=walk;
    return sleep(duration).then(()=>{
      if(guideWalk===walk){
        walk.from.copy(walk.to);
        walk.start=performance.now();
        walk.duration=1;
        walk.moving=false;
      }
    });
  }

  World.prototype.updatePlayer=function(state,time,frameDelta){
    if(!guideWalk)return previousUpdatePlayer.call(this,state,time,frameDelta);

    this.player.visible=!!state.started;
    const t=Math.min(1,Math.max(0,(performance.now()-guideWalk.start)/Math.max(1,guideWalk.duration)));
    this.player.position.lerpVectors(guideWalk.from,guideWalk.to,ease(t));

    let delta=(guideWalk.targetRot-this.player.rotation.y+Math.PI)%(Math.PI*2)-Math.PI;
    if(delta<-Math.PI)delta+=Math.PI*2;
    this.player.rotation.y+=delta*(1-Math.exp(-frameDelta*18));

    if(this.player.userData?.isCalem&&typeof this.animateCalem==='function'){
      if(guideWalk.moving)this.jogPhase+=frameDelta*11.5;
      this.animateCalem(!!guideWalk.moving,this.jogPhase,frameDelta,guideWalk.moving?1:0,Math.max(-1,Math.min(1,delta*1.4)));
    }

    const cameraGoal=this.player.position.clone().add(new THREE.Vector3(0,4.75,6.75));
    this.camera.position.lerp(cameraGoal,1-Math.exp(-frameDelta*7));
    const lookGoal=this.player.position.clone().add(new THREE.Vector3(0,.68,-3.25));
    this.cameraLook.lerp(lookGoal,1-Math.exp(-frameDelta*8.5));
    this.camera.lookAt(this.cameraLook);
  };

  async function transitionInside(o,d){
    const transition=ensureTransitionElement();
    transition.classList.add('active');
    await sleep(235);

    // Restore the logical doorway coordinate only after the exterior sequence
    // has completely finished. Existing interior/exit logic can then remain intact.
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
      const stageY=d.y+.78;
      const logicalDistance=Math.hypot(d.x-S.player.x,stageY-S.player.y);
      const stageDuration=Math.max(260,Math.min(560,220+logicalDistance*110));

      // 1) Approach and STOP in front of the CLOSED door.
      await startVisualWalk(WORLD3D,d.x,stageY,stageDuration);
      await sleep(120);

      // 2) Open the door while Calem remains stationary.
      await doors.animateDoor(o,true);
      await sleep(90);

      // 3) Walk straight through the fully open doorway.
      await startVisualWalk(WORLD3D,d.x,d.y-1.72,430);
      await sleep(80);

      // 4) Close the door behind Calem before any scene transition begins.
      await doors.animateDoor(o,false);
      await sleep(110);

      // 5) Only now transition to the actual interior map.
      await transitionInside(o,d);
    }catch(error){
      console.error('Driftbound v110 staged door entry failed',error);
      guideWalk=null;
    }finally{
      inputLocked=false;
      guideBusy=false;
      updateInteractionHint?.();
    }
  }

  tryMove=function(dx,dy){
    if(guideBusy)return;

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

  window.tryMove=tryMove;
  window.__DRIFTBOUND_V110_DOOR_SEQUENCE__={guidedEntry,buildingInApproachZone};
})();
