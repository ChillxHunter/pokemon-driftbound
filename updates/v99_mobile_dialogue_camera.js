/* Pokémon: Driftbound v99 — tap-to-advance dialogue + ~20% mobile camera zoom-out. */
(function(){
  'use strict';

  function isMobile(){
    return document.body.classList.contains('gameboy-mobile') || document.body.classList.contains('driftbound-mobile') || window.innerWidth<=760 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
  }
  function visible(el){return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display!=='none';}

  function installTapAdvance(){
    const frame=document.getElementById('worldFrame');
    const dialogue=document.getElementById('dialogue');
    const next=document.getElementById('dialogueNext');
    if(!frame||!dialogue)return;

    const syncActive=()=>document.body.classList.toggle('dialogue-active',isMobile()&&visible(dialogue));
    new MutationObserver(syncActive).observe(dialogue,{attributes:true,attributeFilter:['class','style']});
    syncActive();

    frame.addEventListener('pointerup',e=>{
      if(!isMobile()||!visible(dialogue))return;
      if(e.pointerType==='mouse'&&e.button!==0)return;
      const target=e.target;
      if(target.closest('.mobilePad,.mobileGameMenuButton,.mobileGameMenuDrawer,button,input,select,a'))return;
      const enabledChoices=[...dialogue.querySelectorAll('.dialogueChoices button:not(:disabled)')].filter(visible);
      if(enabledChoices.length)return; // Choices still require an intentional selection.
      if(next&&visible(next)){
        e.preventDefault();
        next.click();
      }
    },{passive:false});
  }

  function installCameraZoom(){
    const THREE=window.THREE,World=window.DriftboundWorld3D;
    if(!THREE||!World||World.prototype.__v99CameraZoom)return;
    const old=World.prototype.updatePlayer;
    if(typeof old!=='function')return;

    World.prototype.updatePlayer=function(state,time,frameDelta){
      const out=old.apply(this,arguments);
      if(isMobile()&&this.player&&this.camera&&state?.started){
        // Base movement camera is 4.75 up / 6.75 back. Scale distance by 1.2
        // to show ~20% more of the route without changing UI scale.
        const goal=this.player.position.clone().add(new THREE.Vector3(0,5.70,8.10));
        this.camera.position.lerp(goal,1-Math.exp(-Math.max(.001,frameDelta||.016)*8.5));
        if(this.cameraLook){
          const look=this.player.position.clone().add(new THREE.Vector3(0,.72,-3.25));
          this.cameraLook.lerp(look,1-Math.exp(-Math.max(.001,frameDelta||.016)*9.5));
          this.camera.lookAt(this.cameraLook);
        }
      }
      return out;
    };
    World.prototype.__v99CameraZoom=true;
  }

  function install(){installTapAdvance();installCameraZoom();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
