/* Pokémon: Driftbound v115 — continuous tile motion + stable global camera. */
(function(){
  'use strict';

  const THREE=window.THREE;
  const World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  const UNIT=1.05;
  const TILE_SPEED=6.7; // tiles per second
  const CAMERA_HEIGHT=12.25;
  const CAMERA_BACK=4.80;
  const LOOK_Y=.18;
  const LOOK_AHEAD=.05;
  const CAMERA_RESPONSE=9.4;
  const LOOK_RESPONSE=10.6;
  const TURN_RESPONSE=18.0;
  const TELEPORT_TILES=2.6;

  function directionAngle(dir){
    return ({
      up:0,down:Math.PI,left:Math.PI/2,right:-Math.PI/2,
      'up-right':-Math.PI/4,'up-left':Math.PI/4,
      'down-right':-Math.PI*3/4,'down-left':Math.PI*3/4
    })[dir]??0;
  }

  function shortestAngle(from,to){
    let d=(to-from+Math.PI)%(Math.PI*2)-Math.PI;
    if(d<-Math.PI)d+=Math.PI*2;
    return d;
  }

  function inputVector(){
    const v=window.__DRIFTBOUND_MOVE_INPUT__;
    if(!Array.isArray(v)||v.length<2)return [0,0];
    return [Math.sign(Number(v[0])||0),Math.sign(Number(v[1])||0)];
  }

  function blocked(){
    try{return !!window.__DRIFTBOUND_MOVE_BLOCKED__?.();}catch(_e){return false;}
  }

  function walkable(x,y){
    try{return !!window.__DRIFTBOUND_WALKABLE__?.(x,y);}catch(_e){return false;}
  }

  function canStartStep(state,dx,dy){
    if(!dx&&!dy)return false;
    const x=state.player.x,y=state.player.y;
    if(dx&&dy){
      const sideX=walkable(x+dx,y);
      const sideY=walkable(x,y+dy);
      if(!sideX&&!sideY)return false;
    }
    return walkable(x+dx,y+dy);
  }

  function startStep(world,state,dx,dy){
    if(!canStartStep(state,dx,dy))return false;
    const from=world.player.position.clone();
    const tx=state.player.x+dx,ty=state.player.y+dy;
    const to=world.gridPosition(tx,ty,world.groundHeightAt(tx,ty));
    const tiles=Math.hypot(dx,dy);
    world.__v115Step={
      from,to,dx,dy,
      elapsed:0,
      duration:tiles/TILE_SPEED,
      startLogicalX:state.player.x,
      startLogicalY:state.player.y
    };
    return true;
  }

  function commitStep(world,state,step){
    const beforeX=state.player.x,beforeY=state.player.y;
    const mover=window.tryMove;
    if(typeof mover==='function')mover(step.dx,step.dy);
    const moved=state.player.x!==beforeX||state.player.y!==beforeY;

    // v112 can intentionally intercept this move and take over with its
    // doorway guide without changing the logical tile. In that case inputLocked
    // becomes true and its visual guide owns the player on the next frame.
    if(!moved){
      if(blocked())return 'guided';
      const logical=world.gridPosition(
        state.player.x,state.player.y,
        world.groundHeightAt(state.player.x,state.player.y)
      );
      world.player.position.copy(logical);
      return 'blocked';
    }
    return 'moved';
  }

  World.prototype.updatePlayer=function(state,time,frameDelta){
    this.player.visible=!!state.started;
    const dt=Math.max(1/240,Math.min(.05,Number(frameDelta)||1/60));

    if(!this.__v115Perf){
      this.__v115Perf=true;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.15));
      this.renderer.shadowMap.type=THREE.PCFShadowMap;
      this.worldRoot.traverse(o=>{
        if(o.isDirectionalLight&&o.castShadow){
          o.shadow.mapSize.set(512,512);
          o.shadow.needsUpdate=true;
        }
      });
      this.resize();
    }

    const logicalTarget=this.gridPosition(
      state.player.x,state.player.y,
      this.groundHeightAt(state.player.x,state.player.y)
    );
    const fresh=!this.__v115Ready||this.__v115BuildKey!==this.buildKey;

    if(fresh){
      this.__v115Ready=true;
      this.__v115BuildKey=this.buildKey;
      this.__v115Step=null;
      this.__v115LastLogicalX=state.player.x;
      this.__v115LastLogicalY=state.player.y;
      this.__v115Speed=0;
      this.player.position.copy(logicalTarget);

      const cameraGoal=logicalTarget.clone().add(new THREE.Vector3(0,CAMERA_HEIGHT,CAMERA_BACK));
      const lookGoal=logicalTarget.clone().add(new THREE.Vector3(0,LOOK_Y,LOOK_AHEAD));
      this.camera.position.copy(cameraGoal);
      this.cameraLook.copy(lookGoal);
      this.camera.lookAt(this.cameraLook);
    }else{
      // External teleports/map swaps bypass the movement controller. Snap them
      // immediately rather than dragging a stale segment across the map.
      const logicalChangedExternally=
        (state.player.x!==this.__v115LastLogicalX||state.player.y!==this.__v115LastLogicalY) &&
        !this.__v115Committing;
      const distanceToLogical=this.player.position.distanceTo(logicalTarget);
      if(logicalChangedExternally && distanceToLogical>UNIT*TELEPORT_TILES){
        this.__v115Step=null;
        this.player.position.copy(logicalTarget);
      }

      let remaining=dt;
      let movedWorld=0;
      let guard=0;

      // Chain completed grid segments in the same animation frame. There is no
      // idle frame between tiles, so holding WASD produces one continuous path.
      while(remaining>0.000001&&guard++<4){
        let step=this.__v115Step;

        if(!step){
          if(blocked())break;
          const [dx,dy]=inputVector();
          if(!startStep(this,state,dx,dy))break;
          step=this.__v115Step;
        }

        // If something else changed the logical coordinate while this step was
        // underway, abandon the stale segment safely.
        if(state.player.x!==step.startLogicalX||state.player.y!==step.startLogicalY){
          this.__v115Step=null;
          this.player.position.copy(logicalTarget);
          break;
        }

        const before=this.player.position.clone();
        const left=Math.max(0,step.duration-step.elapsed);
        const consume=Math.min(remaining,left);
        step.elapsed+=consume;
        remaining-=consume;

        // Linear interpolation gives constant velocity. The previous
        // exponential chase accelerated/decelerated on every tile and caused
        // the visible pulsing/jank in v114.
        const t=Math.min(1,step.elapsed/Math.max(.0001,step.duration));
        this.player.position.lerpVectors(step.from,step.to,t);
        movedWorld+=this.player.position.distanceTo(before);

        if(t>=1-1e-6){
          this.player.position.copy(step.to);
          this.__v115Step=null;
          this.__v115Committing=true;
          const result=commitStep(this,state,step);
          this.__v115Committing=false;
          this.__v115LastLogicalX=state.player.x;
          this.__v115LastLogicalY=state.player.y;
          if(result!=='moved')break;
          // If the key is still held, the next loop iteration starts the next
          // tile immediately using any sub-frame time that remains.
        }else break;
      }

      this.__v115LastLogicalX=state.player.x;
      this.__v115LastLogicalY=state.player.y;

      const instantSpeed=movedWorld/dt;
      this.__v115Speed=THREE.MathUtils.lerp(
        this.__v115Speed||0,
        instantSpeed,
        1-Math.exp(-dt*16)
      );

      let desired=directionAngle(state.player.dir);
      if(this.__v115Step){
        desired=Math.atan2(
          -(this.__v115Step.to.x-this.player.position.x),
          -(this.__v115Step.to.z-this.player.position.z)
        );
      }else{
        const [dx,dy]=inputVector();
        if(dx||dy)desired=Math.atan2(-dx,-dy);
      }

      const turnDelta=shortestAngle(this.player.rotation.y,desired);
      this.player.rotation.y+=turnDelta*(1-Math.exp(-dt*TURN_RESPONSE));

      const speedBlend=Math.min(1,(this.__v115Speed||0)/(UNIT*TILE_SPEED));
      const jogging=movedWorld>.00002||(this.__v115Speed||0)>.08;
      if(movedWorld>.000001)this.jogPhase+=movedWorld*1.08;
      const d=this.player.userData;
      if(d?.isCalem&&typeof this.animateCalem==='function'){
        const turnLean=Math.max(-1,Math.min(1,turnDelta*1.2));
        this.animateCalem(jogging,this.jogPhase,dt,speedBlend,turnLean);
      }else if(d?.leftLeg){
        const stride=Math.sin(this.jogPhase)*.48*speedBlend;
        d.leftLeg.rotation.x=stride;
        d.rightLeg.rotation.x=-stride;
        d.leftArm.rotation.x=-stride*.4;
        d.rightArm.rotation.x=stride*.4;
      }
    }

    // One camera update only. It follows the already-smoothed player transform,
    // so both character and scene motion stay stable.
    const cameraGoal=this.player.position.clone().add(new THREE.Vector3(0,CAMERA_HEIGHT,CAMERA_BACK));
    this.camera.position.lerp(cameraGoal,1-Math.exp(-dt*CAMERA_RESPONSE));

    const lookGoal=this.player.position.clone().add(new THREE.Vector3(0,LOOK_Y,LOOK_AHEAD));
    this.cameraLook.lerp(lookGoal,1-Math.exp(-dt*LOOK_RESPONSE));
    this.camera.lookAt(this.cameraLook);
  };

  window.__DRIFTBOUND_V115_MOVEMENT__={
    tileSpeed:TILE_SPEED,
    cameraHeight:CAMERA_HEIGHT,
    cameraBack:CAMERA_BACK
  };
})();
