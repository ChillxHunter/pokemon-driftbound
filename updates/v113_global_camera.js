/* Pokémon: Driftbound v113 — global steeper exploration camera. */
(function(){
  'use strict';

  const THREE=window.THREE;
  const World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  // Use the same high/top-down composition everywhere that v112 used only
  // during doorway sequences. This keeps buildings from blocking the player
  // during normal exploration as well as entry/exit animations.
  const CAMERA_HEIGHT=12.25;
  const CAMERA_BACK=4.80;
  const LOOK_Y=.18;
  const LOOK_AHEAD=.05;

  const previousUpdatePlayer=World.prototype.updatePlayer;

  World.prototype.updatePlayer=function(state,time,frameDelta){
    previousUpdatePlayer.call(this,state,time,frameDelta);
    if(!this.player||!this.camera||!this.cameraLook)return;

    const cameraGoal=this.player.position.clone().add(new THREE.Vector3(0,CAMERA_HEIGHT,CAMERA_BACK));
    this.camera.position.lerp(cameraGoal,1-Math.exp(-frameDelta*9.5));

    const lookGoal=this.player.position.clone().add(new THREE.Vector3(0,LOOK_Y,LOOK_AHEAD));
    this.cameraLook.lerp(lookGoal,1-Math.exp(-frameDelta*10.5));
    this.camera.lookAt(this.cameraLook);
  };

  window.__DRIFTBOUND_V113_GLOBAL_CAMERA__={
    height:CAMERA_HEIGHT,
    back:CAMERA_BACK,
    lookY:LOOK_Y,
    lookAhead:LOOK_AHEAD
  };
})();
