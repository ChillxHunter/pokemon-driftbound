/* Pokémon: Driftbound v114 — stable single-camera + smoother PC movement rendering. */
(function(){
  'use strict';

  const THREE=window.THREE;
  const World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  const UNIT=1.05;
  const CAMERA_HEIGHT=12.25;
  const CAMERA_BACK=4.80;
  const LOOK_Y=.18;
  const LOOK_AHEAD=.05;

  // Visual follow response. This follows the logical tile position directly
  // instead of maintaining an ever-growing movement queue.
  const MOVE_RESPONSE=20.0;
  const CAMERA_RESPONSE=9.0;
  const LOOK_RESPONSE=10.5;
  const TURN_RESPONSE=17.0;
  const TELEPORT_DISTANCE=UNIT*3.5;
  const NOMINAL_TILE_SPEED=8.0;

  function directionAngle(dir){
    return ({
      up:0,
      down:Math.PI,
      left:Math.PI/2,
      right:-Math.PI/2,
      'up-right':-Math.PI/4,
      'up-left':Math.PI/4,
      'down-right':-Math.PI*3/4,
      'down-left':Math.PI*3/4
    })[dir]??0;
  }

  function shortestAngle(from,to){
    let d=(to-from+Math.PI)%(Math.PI*2)-Math.PI;
    if(d<-Math.PI)d+=Math.PI*2;
    return d;
  }

  World.prototype.updatePlayer=function(state,time,frameDelta){
    this.player.visible=!!state.started;

    const dt=Math.max(1/240,Math.min(.05,Number(frameDelta)||1/60));

    if(!this.__v114Perf){
      this.__v114Perf=true;
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

    const lx=state.player.x;
    const ly=state.player.y;
    const ground=this.groundHeightAt(lx,ly);
    const target=this.gridPosition(lx,ly,ground);

    const freshBuild=!this.__v114Ready||this.__v114BuildKey!==this.buildKey;
    if(freshBuild){
      this.__v114Ready=true;
      this.__v114BuildKey=this.buildKey;
      this.player.position.copy(target);
      this.__v114PrevWorld=target.clone();
      this.__v114Speed=0;

      const cameraGoal=target.clone().add(new THREE.Vector3(0,CAMERA_HEIGHT,CAMERA_BACK));
      const lookGoal=target.clone().add(new THREE.Vector3(0,LOOK_Y,LOOK_AHEAD));
      this.camera.position.copy(cameraGoal);
      this.cameraLook.copy(lookGoal);
      this.camera.lookAt(this.cameraLook);
    }else{
      const before=this.player.position.clone();
      const dx=target.x-before.x;
      const dz=target.z-before.z;
      const planarDistance=Math.hypot(dx,dz);

      if(planarDistance>TELEPORT_DISTANCE){
        // Map changes / scripted teleports should never drag the camera or
        // player across the whole map.
        this.player.position.copy(target);
      }else{
        // One exponential follow, once per frame. No queued tiles and no second
        // camera pass fighting this result.
        const moveAlpha=1-Math.exp(-dt*MOVE_RESPONSE);
        this.player.position.lerp(target,moveAlpha);
      }

      const worldDistance=Math.hypot(
        this.player.position.x-before.x,
        this.player.position.z-before.z
      );
      const instantSpeed=worldDistance/dt;
      this.__v114Speed=THREE.MathUtils.lerp(
        this.__v114Speed||0,
        instantSpeed,
        1-Math.exp(-dt*14)
      );

      let desired=directionAngle(state.player.dir);
      const remainX=target.x-this.player.position.x;
      const remainZ=target.z-this.player.position.z;
      if(Math.hypot(remainX,remainZ)>.025){
        desired=Math.atan2(-remainX,-remainZ);
      }

      const turnAlpha=1-Math.exp(-dt*TURN_RESPONSE);
      const turnDelta=shortestAngle(this.player.rotation.y,desired);
      this.player.rotation.y+=turnDelta*turnAlpha;

      const speedBlend=Math.min(1,(this.__v114Speed||0)/(UNIT*NOMINAL_TILE_SPEED));
      const jogging=worldDistance>.00005||(this.__v114Speed||0)>.10;
      if(worldDistance>.000001)this.jogPhase+=worldDistance*1.05;

      const d=this.player.userData;
      if(d?.isCalem&&typeof this.animateCalem==='function'){
        const turnLean=Math.max(-1,Math.min(1,turnDelta*1.25));
        this.animateCalem(jogging,this.jogPhase,dt,speedBlend,turnLean);
      }else if(d?.leftLeg){
        const step=Math.sin(this.jogPhase)*.48*speedBlend;
        d.leftLeg.rotation.x=step;
        d.rightLeg.rotation.x=-step;
        d.leftArm.rotation.x=-step*.4;
        d.rightArm.rotation.x=step*.4;
      }

      this.__v114PrevWorld=this.player.position.clone();
    }

    const cameraGoal=this.player.position.clone().add(
      new THREE.Vector3(0,CAMERA_HEIGHT,CAMERA_BACK)
    );
    const cameraAlpha=1-Math.exp(-dt*CAMERA_RESPONSE);
    this.camera.position.lerp(cameraGoal,cameraAlpha);

    const lookGoal=this.player.position.clone().add(
      new THREE.Vector3(0,LOOK_Y,LOOK_AHEAD)
    );
    const lookAlpha=1-Math.exp(-dt*LOOK_RESPONSE);
    this.cameraLook.lerp(lookGoal,lookAlpha);
    this.camera.lookAt(this.cameraLook);
  };

  window.__DRIFTBOUND_V114_MOVEMENT_CAMERA__={
    cameraHeight:CAMERA_HEIGHT,
    cameraBack:CAMERA_BACK,
    moveResponse:MOVE_RESPONSE
  };
})();
