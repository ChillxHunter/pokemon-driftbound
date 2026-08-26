/* Pokémon: Driftbound v102 — Pokémon Center exterior + silent empty interactions. */
(function(){
  'use strict';

  const THREE=window.THREE;
  const World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  const previousMakeBuilding=World.prototype.makeBuilding;

  function mesh(world,geometry,material,opts){
    return world.mesh(geometry,material,opts);
  }
  function mat(world,color,opts={}){
    return world.material(color,opts);
  }

  /*
   * A large, recognizable Pokémon-Center-inspired exterior built only from
   * original Three.js geometry.  It intentionally keeps the game's own art
   * direction while borrowing the familiar visual language: white shell,
   * broad red roof, blue glass, centered entrance and round healing emblem.
   */
  World.prototype.makeBuilding=function(kind,p){
    if(kind!=='center')return previousMakeBuilding.call(this,kind,p);

    const g=new THREE.Group();
    g.name='DriftboundPokemonCenterV102';

    const W=10.2,D=7.1,H=5.15;
    const white='#f7f7f2',white2='#e9eeec',red='#e8444c',redDark='#bb2733';
    const glass='#80cde4',glassDark='#397b96',frame='#d9e2e1',dark='#26333a';

    // Wide stepped foundation so the building feels planted in the town.
    const base=mesh(this,new THREE.BoxGeometry(W+.9,.28,D+.8),mat(this,'#cfcfc7',{roughness:1}));
    base.position.y=.14;g.add(base);
    const step=mesh(this,new THREE.BoxGeometry(3.4,.18,1.35),mat(this,'#ded9cd',{roughness:.95}));
    step.position.set(0,.22,D/2+.66);g.add(step);

    // Main white shell, split into a broad lower block and smaller upper crown.
    const body=mesh(this,new THREE.BoxGeometry(W,H,D),mat(this,white,{roughness:.8}));
    body.position.y=.3+H/2;g.add(body);
    const upper=mesh(this,new THREE.BoxGeometry(W*.72,1.18,D*.72),mat(this,white2,{roughness:.78}));
    upper.position.set(0,H+.15,0);g.add(upper);

    // Red lower belt and strong red roof cap.
    const belt=mesh(this,new THREE.BoxGeometry(W+.08,.38,D+.08),mat(this,redDark,{roughness:.76}));
    belt.position.y=.63;g.add(belt);
    const roofLower=mesh(this,new THREE.BoxGeometry(W+.55,.46,D+.5),mat(this,redDark,{roughness:.65}));
    roofLower.position.y=H+.28;g.add(roofLower);
    const roof=mesh(this,new THREE.BoxGeometry(W+.05,.72,D+.02),mat(this,red,{roughness:.6}));
    roof.position.y=H+.72;g.add(roof);

    // Rounded red roof crown to break the old "box house" silhouette.
    const crown=mesh(this,new THREE.CylinderGeometry(W*.34,W*.34,1.0,32,1,false,0,Math.PI),mat(this,red,{roughness:.58}));
    crown.rotation.z=Math.PI/2;
    crown.rotation.y=Math.PI/2;
    crown.scale.z=.78;
    crown.position.set(0,H+1.05,0);g.add(crown);

    // Recessed front entrance bay.
    const entranceBack=mesh(this,new THREE.BoxGeometry(3.35,3.45,.28),mat(this,'#e4ebe9',{roughness:.72}));
    entranceBack.position.set(0,2.0,D/2+.16);g.add(entranceBack);
    const entranceFrame=mesh(this,new THREE.BoxGeometry(3.1,3.1,.24),mat(this,red,{roughness:.64}));
    entranceFrame.position.set(0,1.88,D/2+.34);g.add(entranceFrame);
    const entranceCut=mesh(this,new THREE.BoxGeometry(2.46,2.72,.31),mat(this,dark,{roughness:.7}));
    entranceCut.position.set(0,1.66,D/2+.5);g.add(entranceCut);

    // Double automatic glass doors. Door height is deliberately > player height.
    const doorMat=new THREE.MeshStandardMaterial({color:glass,emissive:glassDark,emissiveIntensity:.13,roughness:.16,metalness:.03,transparent:true,opacity:.84});
    [-.58,.58].forEach((x,i)=>{
      const door=mesh(this,new THREE.BoxGeometry(1.08,2.58,.09),doorMat,{cast:false,receive:false});
      door.position.set(x,1.62,D/2+.69);g.add(door);
      const rail=mesh(this,new THREE.BoxGeometry(.055,2.58,.035),mat(this,'#eff8f8',{roughness:.35}),{cast:false,receive:false});
      rail.position.set(i?-.04:.04,1.62,D/2+.75);g.add(rail);
    });

    // Large projecting red canopy over entrance.
    const canopy=mesh(this,new THREE.BoxGeometry(4.25,.22,1.38),mat(this,red,{roughness:.6}));
    canopy.position.set(0,3.45,D/2+.88);canopy.rotation.x=-.08;g.add(canopy);
    const canopyLip=mesh(this,new THREE.BoxGeometry(4.32,.15,.24),mat(this,redDark,{roughness:.66}));
    canopyLip.position.set(0,3.29,D/2+1.49);g.add(canopyLip);

    // Tall blue-glass windows with white/red surrounds.
    const windowMat=new THREE.MeshStandardMaterial({color:glass,emissive:glassDark,emissiveIntensity:.09,roughness:.18,metalness:.02,transparent:true,opacity:.86});
    [-3.45,3.45].forEach(x=>{
      const surround=mesh(this,new THREE.BoxGeometry(2.15,2.35,.18),mat(this,frame,{roughness:.68}),{cast:false,receive:false});
      surround.position.set(x,2.3,D/2+.11);g.add(surround);
      const pane=mesh(this,new THREE.BoxGeometry(1.82,2.02,.13),windowMat,{cast:false,receive:false});
      pane.position.set(x,2.3,D/2+.25);g.add(pane);
      const mullion=mesh(this,new THREE.BoxGeometry(.08,2.02,.04),mat(this,'#eef4f3',{roughness:.4}),{cast:false,receive:false});
      mullion.position.set(x,2.3,D/2+.34);g.add(mullion);
    });

    // Center emblem: original geometry using the familiar healing-center motif.
    const signBack=mesh(this,new THREE.CylinderGeometry(1.03,1.03,.22,40),mat(this,'#ffffff',{roughness:.58}));
    signBack.rotation.x=Math.PI/2;signBack.position.set(0,4.65,D/2+.29);g.add(signBack);
    const signRed=mesh(this,new THREE.CylinderGeometry(.86,.86,.08,40,1,false,0,Math.PI),mat(this,red,{roughness:.55}),{cast:false,receive:false});
    signRed.rotation.x=Math.PI/2;signRed.rotation.z=Math.PI;signRed.position.set(0,4.65,D/2+.43);g.add(signRed);
    const signBand=mesh(this,new THREE.BoxGeometry(1.72,.15,.07),mat(this,dark,{roughness:.58}),{cast:false,receive:false});
    signBand.position.set(0,4.65,D/2+.48);g.add(signBand);
    const signDot=mesh(this,new THREE.CylinderGeometry(.24,.24,.08,24),mat(this,'#ffffff',{roughness:.48}),{cast:false,receive:false});
    signDot.rotation.x=Math.PI/2;signDot.position.set(0,4.65,D/2+.52);g.add(signDot);
    const signDotRing=mesh(this,new THREE.TorusGeometry(.27,.055,10,28),mat(this,dark,{roughness:.5}),{cast:false,receive:false});
    signDotRing.position.set(0,4.65,D/2+.57);g.add(signDotRing);

    // Small side roof accents add depth when viewed diagonally.
    [-4.25,4.25].forEach(x=>{
      const fin=mesh(this,new THREE.BoxGeometry(1.25,.3,1.35),mat(this,redDark,{roughness:.7}));
      fin.position.set(x,H+.43,0);g.add(fin);
    });

    // Exterior lights around the door.
    [-1.72,1.72].forEach(x=>{
      const lampBase=mesh(this,new THREE.BoxGeometry(.25,.42,.18),mat(this,dark,{roughness:.65}));
      lampBase.position.set(x,3.03,D/2+.55);g.add(lampBase);
      const lamp=mesh(this,new THREE.SphereGeometry(.12,12,8),new THREE.MeshStandardMaterial({color:'#fff2bb',emissive:'#ffd86a',emissiveIntensity:.75,roughness:.3}),{cast:false,receive:false});
      lamp.position.set(x,3.03,D/2+.7);g.add(lamp);
    });

    g.traverse(o=>{
      if(o.isMesh){
        if(o.material!==doorMat&&o.material!==windowMat)o.castShadow=true;
        o.receiveShadow=true;
      }
    });
    return g;
  };

  // Empty A/E presses should simply do nothing. No "nothing to interact with" toast.
  try{
    interactNearest=function(){
      if(inputLocked||B||activePanel)return;
      if(!DOM.dialogue.classList.contains('hidden')){advanceDialogue();return;}
      const o=nearbyObject();
      if(!o)return;
      if(o.type==='center')openCenterPanel();
      else if(o.type==='mart')openMartPanel();
      else if(o.type==='gym')openGymPanel(o.gym);
      else if(o.type==='lab')interactLab();
      else if(o.type==='trainer'||o.type==='rival')classicTrainerBattle(o);
      else if(o.type==='hmGate')useHmGate(o);
      else if(o.type==='puzzleSwitch')togglePuzzle(o);
      else if(o.type==='puzzleDoor')showDialogue([{speaker:'SEALED DOOR',text:'Three switches in this cave must all be active.'}]);
      else if(o.type==='itemPickup'||o.type==='tmPickup')claimPickup(o);
      else if(o.type==='leagueGate')startLeague();
      else if(o.type==='sign'||o.type==='exitSign')readClassicSign(o);
      else if(o.type==='wild')startBattle(o.species,{level:o.level||classicLevel()});
    };
    window.interactNearest=interactNearest;
  }catch(_e){}

  // Force a world rebuild once so an already-loaded town gets the new model.
  function refreshWorld(){
    try{
      if(typeof currentMap!=='undefined'&&currentMap&&window.driftboundWorld3D){
        window.driftboundWorld3D.rebuild(currentMap,S?.currentTitan||'verdant',S);
      }
    }catch(_e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshWorld,120),{once:true});
  else setTimeout(refreshWorld,120);
})();
