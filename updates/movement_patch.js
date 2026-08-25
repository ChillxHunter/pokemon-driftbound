/* Driftbound v87 — smoother field movement + natural Calem jog gait. */
(function(){
  'use strict';
  const THREE=window.THREE,World=window.DriftboundWorld3D;
  if(!THREE||!World)return;
  const UNIT=1.05,PLAYER_MOVE_MS=155;

  World.prototype.animateCalem=function(jogging,phase,frameDelta,speedBlend=0,turnLean=0){
    const d=this.player.userData,b=d.bones;
    const set=(name,axis,offset)=>{const bone=b[name];if(bone)bone.object.rotation[axis]=bone.base[axis]+offset;};
    const response=jogging?7.2:4.1;
    d.jogBlend=THREE.MathUtils.lerp(d.jogBlend||0,jogging?1:0,1-Math.exp(-frameDelta*response));
    d.motionClock=(d.motionClock||0)+frameDelta;
    const blend=d.jogBlend,pace=.72+.28*Math.max(0,Math.min(1,speedBlend));
    const wave=Math.sin(phase),counter=Math.cos(phase),stride=wave*blend*pace,weight=counter*blend;
    const leftLift=Math.max(0,-wave)*blend,rightLift=Math.max(0,wave)*blend;
    const footFall=Math.abs(wave)*blend,beat=(.5-.5*Math.cos(phase*2))*blend;
    const armWave=(Math.sin(phase+.08)*.34+Math.sin(phase*2-.2)*.018)*blend*pace;
    const leftElbow=(.15+Math.max(0,wave)*.085+beat*.012)*blend;
    const rightElbow=(.15+Math.max(0,-wave)*.085+beat*.012)*blend;
    const idleBreath=Math.sin(d.motionClock*1.75)*(1-blend);

    set('Hips','y',-stride*.042);set('Hips','z',weight*.014);set('Hips','x',footFall*.007);
    set('LThigh','y',stride*.46);set('RThigh','y',-stride*.46);
    set('LLeg','y',leftLift*.42+beat*.012);set('RLeg','y',rightLift*.42+beat*.012);
    set('LFoot','y',-leftLift*.18+rightLift*.025);set('RFoot','y',-rightLift*.18+leftLift*.025);
    set('LFoot','z',weight*.007);set('RFoot','z',-weight*.007);

    set('LShoulder','y',-armWave*.045);set('RShoulder','y',armWave*.045);
    set('LShoulder','x',-weight*.006);set('RShoulder','x',weight*.006);
    set('LShoulder','z',turnLean*.016);set('RShoulder','z',turnLean*.016);
    set('LArmA','y',-armWave);set('RArmA','y',armWave);
    set('LArmA','x',0);set('RArmA','x',0);
    set('LArmA','z',weight*.005);set('RArmA','z',-weight*.005);
    set('LArmB','y',-armWave*.028);set('RArmB','y',armWave*.028);
    set('LForeArm','y',-leftElbow);set('RForeArm','y',-rightElbow);
    set('LForeArm','z',blend*.0035);set('RForeArm','z',blend*-.0035);
    set('LHand','y',leftElbow*.012);set('RHand','y',rightElbow*.012);
    set('LHand','z',-armWave*.005);set('RHand','z',armWave*.005);

    set('Spine2','y',stride*.04);set('Spine2','x',blend*.011+beat*.004+idleBreath*.005);set('Spine2','z',-weight*.007-turnLean*.018);
    set('Spine3','y',stride*.028);set('Spine3','z',-weight*.008-turnLean*.012);
    set('Head','y',-stride*.014);set('Head','x',-beat*.005-idleBreath*.003);set('Head','z',weight*.003+turnLean*.01);
    set('BagA','y',-Math.sin(phase-.42)*.052*blend);set('BagB','y',-Math.sin(phase-.58)*.038*blend);
    set('BagC','x',Math.sin(phase-.76)*.02*blend);set('BagD','x',Math.sin(phase-.92)*.015*blend);
    d.modelRoot.position.x=d.modelBaseX+weight*.012;
    d.modelRoot.position.y=d.modelBaseY+footFall*.022+idleBreath*.007;
    d.modelRoot.position.z=d.modelBaseZ-stride*.004;
    d.modelRoot.rotation.y=d.modelBaseRotationY+stride*.009;
    d.modelRoot.rotation.x=d.modelBaseRotationX+blend*.007+beat*.003;
    d.modelRoot.rotation.z=weight*.009-turnLean*.025;
  };

  World.prototype.updatePlayer=function(state,time,frameDelta){
    this.player.visible=!!state.started;
    const nextTarget=this.gridPosition(state.player.x,state.player.y,this.groundHeightAt(state.player.x,state.player.y));
    if(state.player.x!==this.lastPlayerGrid.x||state.player.y!==this.lastPlayerGrid.y){
      this.playerTarget.copy(nextTarget);this.playerMoveStart=time;this.playerMoveProgress=0;this.movePulse=1;
      this.lastPlayerGrid={x:state.player.x,y:state.player.y};
    }else this.playerTarget.copy(nextTarget);

    const bx=this.player.position.x,by=this.player.position.y,bz=this.player.position.z;
    const distanceToTarget=this.player.position.distanceTo(this.playerTarget);
    const followAlpha=1-Math.exp(-frameDelta*(distanceToTarget>UNIT*.7?17.5:14.5));
    this.player.position.lerp(this.playerTarget,followAlpha);
    if(this.player.position.distanceToSquared(this.playerTarget)<.000025)this.player.position.copy(this.playerTarget);
    this.playerMoveProgress=1-Math.min(1,this.player.position.distanceTo(this.playerTarget)/UNIT);

    const dx=this.player.position.x-bx,dy=this.player.position.y-by,dz=this.player.position.z-bz;
    const rawSpeed=Math.sqrt(dx*dx+dy*dy+dz*dz)/Math.max(.001,frameDelta);
    this.playerVisualSpeed=THREE.MathUtils.lerp(this.playerVisualSpeed||0,rawSpeed,1-Math.exp(-frameDelta*10));
    const normalGridSpeed=UNIT/(PLAYER_MOVE_MS/1000);
    const speedBlend=Math.min(1,this.playerVisualSpeed/Math.max(.001,normalGridSpeed*.82));

    const angles={up:0,down:Math.PI,left:Math.PI/2,right:-Math.PI/2};
    const desired=angles[state.player.dir]??0;
    let directionDelta=(desired-this.player.rotation.y+Math.PI)%(Math.PI*2)-Math.PI;
    if(directionDelta<-Math.PI)directionDelta+=Math.PI*2;
    const turnTarget=Math.max(-1,Math.min(1,directionDelta/(Math.PI*.5)));
    this.playerTurnLean=THREE.MathUtils.lerp(this.playerTurnLean||0,turnTarget,1-Math.exp(-frameDelta*9));
    this.player.rotation.y+=directionDelta*(1-Math.exp(-frameDelta*8.8));

    this.movePulse=Math.max(0,this.movePulse-frameDelta*4.2);
    const jogging=this.playerVisualSpeed>.13||distanceToTarget>.025||this.movePulse>.08;
    if(jogging)this.jogPhase+=frameDelta*(8.7+2.1*speedBlend);
    const step=Math.sin(this.jogPhase)*.52,d=this.player.userData;
    if(d.isCalem)this.animateCalem(jogging,this.jogPhase,frameDelta,speedBlend,this.playerTurnLean);
    else{d.leftLeg.rotation.x=step;d.rightLeg.rotation.x=-step;d.leftArm.rotation.x=-step*.48;d.rightArm.rotation.x=step*.48;}

    const cameraGoal=this.player.position.clone().add(new THREE.Vector3(0,4.75,6.75));
    this.camera.position.lerp(cameraGoal,1-Math.exp(-frameDelta*4.35));
    const lookGoal=this.player.position.clone().add(new THREE.Vector3(0,.68,-3.25));
    this.cameraLook.lerp(lookGoal,1-Math.exp(-frameDelta*5.4));this.camera.lookAt(this.cameraLook);
  };
})();
