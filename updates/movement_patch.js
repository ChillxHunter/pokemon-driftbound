/* Driftbound v88 — continuous queued field motion + natural Calem gait. */
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
    const response=jogging?9.5:6.5;
    d.jogBlend=THREE.MathUtils.lerp(d.jogBlend||0,jogging?1:0,1-Math.exp(-frameDelta*response));
    d.motionClock=(d.motionClock||0)+frameDelta;
    const blend=d.jogBlend,pace=.74+.26*Math.max(0,Math.min(1,speedBlend));
    const wave=Math.sin(phase),counter=Math.cos(phase),stride=wave*blend*pace,weight=counter*blend;
    const leftLift=Math.max(0,-wave)*blend,rightLift=Math.max(0,wave)*blend;
    const footFall=Math.abs(wave)*blend,beat=(.5-.5*Math.cos(phase*2))*blend;
    const armWave=Math.sin(phase+.04)*.27*blend*pace;
    const leftElbow=(.17+Math.max(0,wave)*.05)*blend;
    const rightElbow=(.17+Math.max(0,-wave)*.05)*blend;
    const idleBreath=Math.sin(d.motionClock*1.65)*(1-blend);

    set('Hips','y',-stride*.03);set('Hips','z',weight*.009);set('Hips','x',footFall*.0045);
    set('LThigh','y',stride*.41);set('RThigh','y',-stride*.41);
    set('LLeg','y',leftLift*.35);set('RLeg','y',rightLift*.35);
    set('LFoot','y',-leftLift*.14);set('RFoot','y',-rightLift*.14);

    set('LShoulder','y',-armWave*.018);set('RShoulder','y',armWave*.018);
    set('LShoulder','z',turnLean*.007);set('RShoulder','z',turnLean*.007);
    set('LArmA','y',-armWave);set('RArmA','y',armWave);
    set('LArmA','x',0);set('RArmA','x',0);
    set('LArmA','z',weight*.0025);set('RArmA','z',-weight*.0025);
    set('LArmB','y',-armWave*.015);set('RArmB','y',armWave*.015);
    set('LForeArm','y',-leftElbow);set('RForeArm','y',-rightElbow);
    set('LHand','y',leftElbow*.006);set('RHand','y',rightElbow*.006);

    set('Spine2','y',stride*.023);set('Spine2','x',blend*.007+beat*.002+idleBreath*.004);set('Spine2','z',-weight*.003-turnLean*.009);
    set('Spine3','y',stride*.016);set('Spine3','z',-weight*.003-turnLean*.006);
    set('Head','y',-stride*.007);set('Head','x',-beat*.0025-idleBreath*.002);set('Head','z',turnLean*.004);
    set('BagA','y',-Math.sin(phase-.42)*.034*blend);set('BagB','y',-Math.sin(phase-.58)*.024*blend);
    set('BagC','x',Math.sin(phase-.76)*.012*blend);set('BagD','x',Math.sin(phase-.92)*.009*blend);

    d.modelRoot.position.x=d.modelBaseX+weight*.006;
    d.modelRoot.position.y=d.modelBaseY+footFall*.013+idleBreath*.005;
    d.modelRoot.position.z=d.modelBaseZ;
    d.modelRoot.rotation.y=d.modelBaseRotationY+stride*.004;
    d.modelRoot.rotation.x=d.modelBaseRotationX+blend*.0035;
    d.modelRoot.rotation.z=weight*.004-turnLean*.011;
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
      const manhattan=Math.abs(lx-gx)+Math.abs(ly-gy);
      if(manhattan===1){
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
      desired=Math.abs(tx)>Math.abs(ty)?(tx>0?-Math.PI/2:Math.PI/2):(ty>0?Math.PI:0);
    }else{
      desired=({up:0,down:Math.PI,left:Math.PI/2,right:-Math.PI/2})[state.player.dir]??0;
    }
    let angleError=(desired-this.player.rotation.y+Math.PI)%(Math.PI*2)-Math.PI;if(angleError<-Math.PI)angleError+=Math.PI*2;
    let turnVel=this.__v88TurnVel||0;
    turnVel+=(angleError*56-turnVel*12.8)*frameDelta;
    turnVel=Math.max(-10,Math.min(10,turnVel));
    this.player.rotation.y+=turnVel*frameDelta;this.__v88TurnVel=turnVel;
    const turnLean=Math.max(-1,Math.min(1,turnVel/8));

    const jogging=worldDistance>.00001||queue.length>0||this.__v88Speed>.12;
    if(worldDistance>.000001)this.jogPhase+=worldDistance*1.72;
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
