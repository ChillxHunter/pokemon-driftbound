/* Pokémon: Driftbound v108 — early automatic doorway approach + steering. */
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

  let guideBusy=false;
  let guideWalk=null;

  function doorPoint(o){
    return {x:o.x,y:o.y+3};
  }

  function approachHit(x,y){
    if(currentMap?.roomKind)return null;
    return (currentMap?.objects||[]).find(o=>{
      if(!BUILDINGS.has(o.type))return false;
      const d=doorPoint(o);
      return y===d.y+1&&Math.abs(x-d.x)<=1;
    })||null;
  }

  function transitionElement(){
    let el=document.getElementById('buildingSceneTransition');
    if(el)return el;

    if(!document.getElementById('v108DoorGuideStyle')){
      const style=document.createElement('style');
      style.id='v108DoorGuideStyle';
      style.textContent=`
        #buildingSceneTransition{position:absolute;inset:0;z-index:95;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 52%,rgba(255,255,255,.22) 0 6%,rgba(6,14,22,.86) 38%,#020609 75%);transition:opacity .22s ease;}
        #buildingSceneTransition::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 0 42%,rgba(255,255,255,.8) 48%,transparent 56%);transform:translateY(-120%);opacity:0;}
        #buildingSceneTransition.active{opacity:1;}
        #buildingSceneTransition.active::after{opacity:.45;animation:dbDoorSweep .42s ease both;}
        @keyframes dbDoorSweep{to{transform:translateY(120%)}}
      `;
      document.head.appendChild(style);
    }

    el=document.createElement('div');
    el.id='buildingSceneTransition';
    const frame=document.getElementById('worldFrame');
    (frame||document.body).appendChild(el);
    return el;
  }

  function startVisualWalk(world,x1,y1,x2,y2,duration){
    const ground=world.groundHeightAt?.(x1,y1)||.38;
    guideWalk={
      from:world.gridPosition(x1,y1,ground),
      to:world.gridPosition(x2,y2,ground),
      start:performance.now(),
      duration,
      targetRot:Math.atan2(-(x2-x1),-(y2-y1))
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

  async function fadeIntoBuilding(o){
    const transition=transitionElement();
    transition.classList.add('active');
    await sleep(235);
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
      const startX=S.player.x;
      const startY=S.player.y;

      // First pull the player onto the center line while still clearly outside.
      // The door begins opening during this approach so there is no stop at the glass.
      const alignY=d.y+.42;
      const alignDistance=Math.hypot(d.x-startX,alignY-startY);
      const alignDuration=Math.max(210,Math.min(390,190+alignDistance*115));

      await Promise.all([
        doors.animateDoor(o,true),
        startVisualWalk(WORLD3D,startX,startY,d.x,alignY,alignDuration)
      ]);

      // Continue straight through the doorway once centered.
      await startVisualWalk(WORLD3D,d.x,alignY,d.x,d.y-1.7,390);
      await fadeIntoBuilding(o);
    }catch(error){
      console.error('Driftbound v108 door approach failed',error);
      guideWalk=null;
    }finally{
      inputLocked=false;
      guideBusy=false;
      updateInteractionHint?.();
    }
  }

  tryMove=function(dx,dy){
    if(guideBusy)return;

    // If the player is already on the tile immediately in front of a doorway,
    // intercept the next upward step BEFORE v102 can move them into the glass.
    if(!B&&!currentMap?.roomKind&&dy<0){
      const waiting=approachHit(S.player.x,S.player.y);
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

    // Trigger one full logical tile before the old v102 doorway trigger.
    // A one-tile horizontal tolerance lets diagonal approaches auto-center too.
    const hit=approachHit(S.player.x,S.player.y);
    if(hit)void guidedEntry(hit);
  };

  window.tryMove=tryMove;
  window.__DRIFTBOUND_V108_DOOR_APPROACH__={guidedEntry};
})();
