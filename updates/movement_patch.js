/* Driftbound v89 — diagonal continuous motion + relaxed natural Calem gait. */
(function(){
  'use strict';
  const THREE=window.THREE,World=window.DriftboundWorld3D;
  if(!THREE||!World)return;
  const UNIT=1.05;
  const GRID_STEP_SECONDS=.155;
  const BASE_TILE_SPEED=1/GRID_STEP_SECONDS;

  World.prototype.animateCalem=function(jogging,phase,frameDelta,speedBlend=0,turnLean=0){
    const d=this.player.userData,b=d.bones;
    const set=(name,axis,offset)=>{const bone=b[name];if(bone)bone.object.rotation[axis]=bone.base[axis]+offset;};
    const response=jogging?7.0:5.2;
    d.jogBlend=THREE.MathUtils.lerp(d.jogBlend||0,jogging?1:0,1-Math.exp(-frameDelta*response));
    d.motionClock=(d.motionClock||0)+frameDelta;
    const blend=d.jogBlend;
    const speedEase=Math.max(0,Math.min(1,speedBlend));
    const pace=.72+.28*speedEase;
    const leftStep=Math.sin(phase+.06);
    const rightStep=Math.sin(phase+Math.PI-.045);
    const leftStride=(leftStep*.34+Math.sin(phase*2+.3)*.018)*blend*pace;
    const rightStride=(rightStep*.325+Math.sin(phase*2-.15)*.014)*blend*pace;
    const leftLift=Math.max(0,-leftStep);
    const rightLift=Math.max(0,-rightStep);
    const bob=(.5-.5*Math.cos(phase*2))*blend;
    const sideWeight=Math.sin(phase+Math.PI/2)*blend;
    const leftArm=(Math.sin(phase+Math.PI+.17)*.19+Math.sin(phase*2+.5)*.012)*blend*pace;
    const rightArm=(Math.sin(phase-.11)*.175+Math.sin(phase*2-.28)*.010)*blend*pace;
    const leftElbow=(.135+Math.max(0,-leftArm)*.12+leftLift*.018)*blend;
    const rightElbow=(.145+Math.max(0,-rightArm)*.105+rightLift*.015)*blend;
    const torsoTwist=(Math.sin(phase+.10)*.014+Math.sin(phase*2-.4)*.0035)*blend;
    const idleBreath=Math.sin(d.motionClock*1.52)*(1-blend);
    set('Hips','y',-(leftStride+rightStride)*.018);
    set('Hips','z',sideWeight*.0065);
    set('Hips','x',bob*.0032);
    set('LThigh','y',leftStride);
    set('RThigh','y',rightStride);
    set('LLeg','y',(leftLift*.26+bob*.012)*blend);
    set('RLeg','y',(rightLift*.245+bob*.010)*blend);
    set('LFoot','y',(-leftLift*.105+rightLift*.015)*blend);
    set('RFoot','y',(-rightLift*.10+leftLift*.012)*blend);
    set('LFoot','z',sideWeight*.003);
    set('RFoot','z',-sideWeight*.003);
    set('LShoulder','y',-leftArm*.012);
    set('RShoulder','y',-rightArm*.012);
    set('LShoulder','z',turnLean*.0035);
    set('RShoulder','z',turnLean*.0035);
    set('LArmA','y',leftArm);
    set('RArmA','y',rightArm);
    set('LArmA','x',blend*.006);
    set('RArmA','x',blend*.004);
    set('LArmA','z',sideWeight*.0015);
    set('RArmA','z',-sideWeight*.0013);
    set('LArmB','y',leftArm*.010);
    set('RArmB','y',rightArm*.009);
    set('LForeArm','y',-leftElbow);
    set('RForeArm','y',-rightElbow);
    set('LForeArm','z',blend*.002);
    set('RForeArm','z',-blend*.0015);
    set('LHand','y',leftElbow*.004);
    set('RHand','y',rightElbow*.003);
    set('Spine2','y',torsoTwist);
    set('Spine2','x',blend*.0045+bob*.0015+idleBreath*.0035);
    set('Spine2','z',-sideWeight*.0022-turnLean*.005);
    set('Spine3','y',torsoTwist*.65);
    set('Spine3','z',-sideWeight*.0018-turnLean*.0035);
    set('Head','y',-torsoTwist*.20);
    set('Head','x',-bob*.0015-idleBreath*.0015);
    set('Head','z',turnLean*.002);
    set('BagA','y',-Math.sin(phase-.48)*.026*blend);
    set('BagB','y',-Math.sin(phase-.70)*.017*blend);
    set('BagC','x',Math.sin(phase-.96)*.008*blend);
    set('BagD','x',Math.sin(phase-1.12)*.006*blend);
    d.modelRoot.position.x=d.modelBaseX+sideWeight*.004;
    d.modelRoot.position.y=d.modelBaseY+bob*.0085+idleBreath*.004;
    d.modelRoot.position.z=d.modelBaseZ;
    d.modelRoot.rotation.y=d.modelBaseRotationY+torsoTwist*.18;
    d.modelRoot.rotation.x=d.modelBaseRotationX+blend*.002;
    d.modelRoot.rotation.z=sideWeight*.0025-turnLean*.006;
  };

  World.prototype.updatePlayer=function(state,time,frameDelta){
    this.player.visible=!!state.started;
    if(!this.__v88Perf){
      this.__v88Perf=true;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.15));
      this.renderer.shadowMap.type=THREE.PCFShadowMap;
      this.worldRoot.traverse(o=>{if(o.isDirectionalLight&&o.castShadow){o.shadow.mapSize.set(512,512);o.shadow.needsUpdate=true;}});
      this.resize();
    }
    const lx=state.player.x,ly=state.player.y;
    if(!this.__v88Ready||this.__v88BuildKey!==this.buildKey){
      this.__v88Ready=true;this.__v88BuildKey=this.buildKey;
      this.__v88GX=lx;this.__v88GY=ly;this.__v88LastLX=lx;this.__v88LastLY=ly;this.__v88Queue=[];
      const spawn=this.gridPosition(lx,ly,this.groundHeightAt(lx,ly));
      this.player.position.copy(spawn);this.__v88PrevWorld=spawn.clone();
      this.__v88TurnVel=0;this.__v88Speed=0;
    }
    if(lx!==this.__v88LastLX||ly!==this.__v88LastLY){
      const gx=this.__v88LastLX,gy=this.__v88LastLY;
      const stepX=Math.abs(lx-gx),stepY=Math.abs(ly-gy);
      const adjacent=Math.max(stepX,stepY)===1&&(stepX||stepY);
      if(adjacent){
        const q=this.__v88Queue;
        const tail=q.length?q[q.length-1]:null;
        if(!tail||tail.x!==lx||tail.y!==ly)q.push({x:lx,y:ly});
      }else{
        this.__v88GX=lx;this.__v88GY=ly;this.__v88Queue.length=0;
      }
      this.__v88LastLX=lx;this.__v88LastLY=ly;
    }
    let gx=this.__v88GX,gy=this.__v88GY;
    const queue=this.__v88Queue;
    let remaining=frameDelta*BASE_TILE_SPEED*(queue.length>1?1.10:.985);
    let movedTiles=0,guard=0;
    while(remaining>0&&queue.length&&guard++<5){
      const target=queue[0],dx=target.x-gx,dy=target.y-gy,dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<.000001){gx=target.x;gy=target.y;queue.shift();continue;}
      if(remaining>=dist){gx=target.x;gy=target.y;remaining-=dist;movedTiles+=dist;queue.shift();}
      else{const f=remaining/dist;gx+=dx*f;gy+=dy*f;movedTiles+=remaining;remaining=0;}
    }
    this.__v88GX=gx;this.__v88GY=gy;
    const worldPos=this.gridPosition(gx,gy,this.groundHeightAt(gx,gy));
    const prev=this.__v88PrevWorld||worldPos;
    const worldDistance=Math.hypot(worldPos.x-prev.x,worldPos.z-prev.z);
    const instantSpeed=worldDistance/Math.max(.001,frameDelta);
    this.__v88Speed=THREE.MathUtils.lerp(this.__v88Speed||0,instantSpeed,1-Math.exp(-frameDelta*15));
    this.__v88PrevWorld=worldPos.clone();
    this.player.position.copy(worldPos);
    const speedBlend=Math.min(1,(this.__v88Speed||0)/(UNIT*BASE_TILE_SPEED));
    let desired;
    if(queue.length){
      const tx=queue[0].x-gx,ty=queue[0].y-gy;
      desired=Math.atan2(-tx,-ty);
    }else{
      desired=({up:0,down:Math.PI,left:Math.PI/2,right:-Math.PI/2,'up-right':-Math.PI/4,'up-left':Math.PI/4,'down-right':-Math.PI*3/4,'down-left':Math.PI*3/4})[state.player.dir]??0;
    }
    let angleError=(desired-this.player.rotation.y+Math.PI)%(Math.PI*2)-Math.PI;if(angleError<-Math.PI)angleError+=Math.PI*2;
    let turnVel=this.__v88TurnVel||0;
    turnVel+=(angleError*56-turnVel*12.8)*frameDelta;
    turnVel=Math.max(-10,Math.min(10,turnVel));
    this.player.rotation.y+=turnVel*frameDelta;this.__v88TurnVel=turnVel;
    const turnLean=Math.max(-1,Math.min(1,turnVel/8));
    const jogging=worldDistance>.00001||queue.length>0||this.__v88Speed>.12;
    if(worldDistance>.000001)this.jogPhase+=worldDistance*1.02;
    const d=this.player.userData;
    if(d.isCalem)this.animateCalem(jogging,this.jogPhase,frameDelta,speedBlend,turnLean);
    else{const step=Math.sin(this.jogPhase)*.48*speedBlend;d.leftLeg.rotation.x=step;d.rightLeg.rotation.x=-step;d.leftArm.rotation.x=-step*.4;d.rightArm.rotation.x=step*.4;}
    const cameraGoal=this.player.position.clone().add(new THREE.Vector3(0,4.75,6.75));
    this.camera.position.lerp(cameraGoal,1-Math.exp(-frameDelta*7.6));
    const lookGoal=this.player.position.clone().add(new THREE.Vector3(0,.68,-3.25));
    this.cameraLook.lerp(lookGoal,1-Math.exp(-frameDelta*9.2));
    this.camera.lookAt(this.cameraLook);
  };
})();
