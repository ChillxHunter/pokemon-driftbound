/* Pokémon: Driftbound v109 — broad automatic doorway capture + steering. */
(function(){
  'use strict';

  const THREE=window.THREE;
  const World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  const BUILDINGS=new Set(['center','mart','gym','lab']);
  const previousUpdatePlayer=World.prototype.updatePlayer;
  const previousTryMove=tryMove;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

  // Three tiles deep and five tiles wide. The player must still be moving north
  // toward the building, so simply walking past the front does not steal input.
  const CAPTURE_DEPTH=3;
  const CAPTURE_HALF_WIDTH=2;

  let guideBusy=false;
  let guideWalk=null;

  function doorPoint(o){
    return {x:o.x,y:o.y+3};
  }

  function buildingInApproachZone(x,y){
    if(currentMap?.roomKind)return null;
    return (currentMap?.objects||[]).find(o=>{
      if(!BUILDINGS.has(o.type))return false;
      const d=doorPoint(o);
      const depth=y-d.y;
      return depth>=1&&depth<=CAPTURE_DEPTH&&Math.abs(x-d.x)<=CAPTURE_HALF_WIDTH;
    })||null;
  }

  function transitionElement(){
    let el=document.getElementById('buildingSceneTransition');
    if(el)return el;
    el=document.createElement('div');
    el.id='buildingSceneTransition';
    const frame=document.getElementById('worldFrame');
    (frame||document.body).appendChild(el);
    return el;
  }

  function startVisualWalk(world,toX,toY,duration){
    const from=world.player.position.clone();
    const ground=world.groundHeightAt?.(toX,toY)||.38;
    const to=world.gridPosition(toX,toY,ground);
    const dx=to.x-from.x;
    const dz=to.z-from.z;
    guideWalk={
      from,
      to,
      start:performance.now(),
      duration,
      targetRot:Math.atan2(-dx,-dz)
    };
    return sleep(duration);
  }

  World.prototype.updatePlayer=function(state,time,frameDelta){
    if(!guideWalk)return previousUpdatePlayer.call(this,state,time,frameDelta);

    this.player.visible=!!state.started;
    const t=Math.min(1,Math.max(0,(performance.now()-guideWalk.start)/guideWalk.duration));
    this.player.position.lerpVectors(guideWalk.from,guideWalk.to,ease(t));

    let delta=(guideWalk.targetRot-this.player.rotation.y+Math.PI)%(Math.PI*2)-Math.PI;
    if(delta<-Math.PI)delta+=Math.PI*2;
    this.player.rotation.y+=delta*(1-Math.exp(-frameDelta*18));

    if(this.player.userData?.isCalem&&typeof this.animateCalem==='function'){
      this.jogPhase+=frameDelta*11.5;
      this.animateCalem(true,this.jogPhase,frameDelta,1,Math.max(-1,Math.min(1,delta*1.4)));
    }

    const cameraGoal=this.player.position.clone().add(new THREE.Vector3(0,4.75,6.75));
    this.camera.position.lerp(cameraGoal,1-Math.exp(-frameDelta*7));
    const lookGoal=this.player.position.clone().add(new THREE.Vector3(0,.68,-3.25));
    this.cameraLook.lerp(lookGoal,1-Math.exp(-frameDelta*8.5));
    this.camera.lookAt(this.cameraLook);
  };

  async function fadeIntoBuilding(o,d){
    const transition=transitionElement();
    transition.classList.add('active');
    await sleep(235);

    // Match the logical position v102 used when entering normally. This keeps
    // the existing automatic exit/door-close sequence working on the way out.
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

      // Aim just outside the threshold first. From as far as three tiles away
      // this produces one smooth diagonal correction instead of a sideways snap.
      const approachY=d.y+.72;
      const logicalDistance=Math.hypot(d.x-S.player.x,approachY-S.player.y);
      const approachDuration=Math.max(280,Math.min(560,230+logicalDistance*105));

      await Promise.all([
        doors.animateDoor(o,true),
        startVisualWalk(WORLD3D,d.x,approachY,approachDuration)
      ]);

      // Once centered, continue directly through the open doorway.
      await startVisualWalk(WORLD3D,d.x,d.y-1.7,420);
      await fadeIntoBuilding(o,d);
    }catch(error){
      console.error('Driftbound v109 door approach failed',error);
      guideWalk=null;
    }finally{
      inputLocked=false;
      guideBusy=false;
      updateInteractionHint?.();
    }
  }

  tryMove=function(dx,dy){
    if(guideBusy)return;

    // Only northward movement can start an exterior building entry.
    if(!B&&!currentMap?.roomKind&&dy<0){
      // Already inside the capture zone: take control before another logical
      // movement step can push the character closer to/through the glass.
      const waiting=buildingInApproachZone(S.player.x,S.player.y);
      if(waiting){
        void guidedEntry(waiting);
        return;
      }
    }

    const oldX=S.player.x;
    const oldY=S.player.y;
    previousTryMove(dx,dy);

    if(guideBusy||B||currentMap?.roomKind||dy>=0)return;
    if(S.player.x===oldX&&S.player.y===oldY)return;

    // Entering the outer edge of the capture zone starts steering immediately.
    const hit=buildingInApproachZone(S.player.x,S.player.y);
    if(hit)void guidedEntry(hit);
  };

  window.tryMove=tryMove;
  window.__DRIFTBOUND_V109_DOOR_APPROACH__={guidedEntry,buildingInApproachZone};
})();
