/* Pokémon: Driftbound v115 — real trainer NPCs + proper Pokémon Center rework. */
(function(){
  'use strict';

  const THREE=window.THREE;
  const World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  const UNIT=1.05;
  const previousMakeBuilding=World.prototype.makeBuilding;
  const previousMakeLandmark=World.prototype.makeLandmark;
  const previousRebuildInterior=World.prototype.rebuildClassicInterior;
  const previousUpdateAnimations=World.prototype.updateAnimations;
  const TRAINER_DATA=window.__DRIFTBOUND_TRAINER_MESH_DATA__||{};
  const modelPromises=new Map();

  const NPC_TYPES=new Set([
    'trainer','rival','elite','nurse','clerk','professor',
    'gymGuide','gymLeader','npc'
  ]);

  function worldMat(world,color,opts={}){return world.material(color,opts);}
  function worldMesh(world,geo,mat,opts){return world.mesh(geo,mat,opts);}

  function bytesFromBase64(text){
    const raw=atob(text),bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    return bytes;
  }

  async function gunzipBase64(text){
    const compressed=bytesFromBase64(text);
    if(typeof DecompressionStream!=='function'){
      throw new Error('This browser does not support DecompressionStream.');
    }
    const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).arrayBuffer();
  }

  function buildTrainerGeometry(buffer,key){
    const view=new DataView(buffer);
    const count=view.getUint32(0,true);
    const positions=new Float32Array(count*3);
    const colors=new Float32Array(count*3);
    let offset=4;
    for(let i=0;i<count;i++){
      positions[i*3]=view.getInt16(offset,true)/10000;offset+=2;
      positions[i*3+1]=view.getInt16(offset,true)/10000;offset+=2;
      positions[i*3+2]=view.getInt16(offset,true)/10000;offset+=2;
      colors[i*3]=view.getUint8(offset++)/255;
      colors[i*3+1]=view.getUint8(offset++)/255;
      colors[i*3+2]=view.getUint8(offset++)/255;
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const material=new THREE.MeshStandardMaterial({
      vertexColors:true,
      roughness:.72,
      metalness:0,
      side:THREE.DoubleSide
    });
    const mesh=new THREE.Mesh(geometry,material);
    mesh.castShadow=true;
    mesh.receiveShadow=true;

    const root=new THREE.Group();
    root.name=`realTrainer:${key}`;
    root.userData.actualTrainer=true;
    root.userData.trainerKey=key;
    root.rotation.y=Math.PI;
    root.add(mesh);
    return root;
  }

  function trainerPrototype(key){
    if(modelPromises.has(key))return modelPromises.get(key);
    const encoded=TRAINER_DATA[key];
    if(!encoded)return Promise.resolve(null);
    const promise=gunzipBase64(encoded)
      .then(buffer=>buildTrainerGeometry(buffer,key))
      .catch(error=>{
        console.error(`Could not load trainer model ${key}`,error);
        return null;
      });
    modelPromises.set(key,promise);
    return promise;
  }

  function loadTrainerInto(slot,key){
    trainerPrototype(key).then(proto=>{
      if(!proto||!slot?.parent)return;
      while(slot.children.length)slot.remove(slot.children[0]);
      slot.add(proto.clone(true));
    });
  }

  const ROUTE_POOL=['youngster','lass','rising_male','ace_female','hiker','police','gentleman','worker'];
  const NPC_POOL=['lass','youngster','rising_male','gentleman','worker','hiker','police'];

  function hashText(text){
    let h=2166136261>>>0;
    for(const c of String(text||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
    return h>>>0;
  }

  function trainerKeyFor(o){
    if(o.type==='nurse')return 'center_lady';
    if(o.type==='professor')return 'scientist';
    if(o.type==='clerk')return 'worker';
    if(o.type==='gymGuide')return 'police';
    if(o.type==='gymLeader')return 'ace_female';
    if(o.type==='elite')return 'ace_female';
    if(o.type==='npc')return NPC_POOL[hashText(`${o.name||''}:${o.x}:${o.y}`)%NPC_POOL.length];
    return ROUTE_POOL[hashText(`${o.id||o.name||o.label||''}:${o.x}:${o.y}`)%ROUTE_POOL.length];
  }

  function makeActualNpc(world,o){
    const key=trainerKeyFor(o);
    if(!TRAINER_DATA[key])return null;

    const holder=new THREE.Group();
    holder.name=`DriftboundNPC:${key}`;
    holder.userData.actualTrainer=true;
    holder.userData.npcHolder=true;
    holder.userData.trainerKey=key;
    holder.userData.idlePhase=((o.x||0)*.73+(o.y||0)*1.11)%6.283;
    const slot=new THREE.Group();
    slot.name='trainerVisualSlot';
    slot.userData.actualTrainer=true;
    slot.userData.visualSlot=true;
    holder.add(slot);
    loadTrainerInto(slot,key);

    const angles={up:0,down:Math.PI,left:Math.PI/2,right:-Math.PI/2};
    holder.rotation.y=angles[o.dir||'down']??Math.PI;
    holder.position.copy(world.gridPosition(o.x,o.y,.38));

    if(o.defeated){
      const bubble=world.makeTextPlane('✓','#d6f5d6');
      bubble.position.set(.28,1.72,0);
      bubble.scale.multiplyScalar(.22);
      holder.add(bubble);
    }
    return holder;
  }

  World.prototype.makeLandmark=function(o,titanId,p,state){
    if(NPC_TYPES.has(o.type)){
      const npc=makeActualNpc(this,o);
      if(npc){
        this.worldRoot.add(npc);
        return;
      }
    }
    return previousMakeLandmark.call(this,o,titanId,p,state);
  };

  function addPokeballWallSign(world,g,z,y=4.02,scale=1){
    const white=worldMat(world,'#ffffff',{roughness:.52});
    const red=worldMat(world,'#e84950',{roughness:.52});
    const dark=worldMat(world,'#283038',{roughness:.56});

    const back=worldMesh(world,new THREE.CylinderGeometry(.72*scale,.72*scale,.11,36),white,{cast:false,receive:false});
    back.rotation.x=Math.PI/2;back.position.set(0,y,z);g.add(back);

    const top=worldMesh(world,new THREE.CylinderGeometry(.61*scale,.61*scale,.035,36,1,false,0,Math.PI),red,{cast:false,receive:false});
    top.rotation.x=Math.PI/2;top.rotation.z=Math.PI;top.position.set(0,y,z+.08);g.add(top);

    const band=worldMesh(world,new THREE.BoxGeometry(1.23*scale,.10*scale,.04),dark,{cast:false,receive:false});
    band.position.set(0,y,z+.11);g.add(band);

    const button=worldMesh(world,new THREE.CylinderGeometry(.16*scale,.16*scale,.04,24),white,{cast:false,receive:false});
    button.rotation.x=Math.PI/2;button.position.set(0,y,z+.14);g.add(button);

    const ring=worldMesh(world,new THREE.TorusGeometry(.18*scale,.035*scale,8,24),dark,{cast:false,receive:false});
    ring.position.set(0,y,z+.17);g.add(ring);
  }

  function makePokemonCenter(world){
    const g=new THREE.Group();
    g.name='DriftboundPokemonCenterV115';
    g.userData.buildingKind='center';

    const W=9.25,D=7.1,H=4.15;
    const white='#f8f8f4',soft='#e9efee',red='#ec4a52',redDark='#c6323b';
    const glass='#86d2e7',glassDark='#397990',frame='#f1f5f4',dark='#26333a';

    const foundation=worldMesh(world,new THREE.BoxGeometry(W+.72,.25,D+.72),worldMat(world,'#d8d5cc',{roughness:1}));
    foundation.position.y=.125;g.add(foundation);

    const frontStep=worldMesh(world,new THREE.BoxGeometry(3.5,.16,1.45),worldMat(world,'#ece7dc',{roughness:.96}));
    frontStep.position.set(0,.20,D/2+.72);g.add(frontStep);

    const body=worldMesh(world,new THREE.BoxGeometry(W,H,D),worldMat(world,white,{roughness:.78}));
    body.position.y=.25+H/2;g.add(body);

    const roofBase=worldMesh(world,new THREE.BoxGeometry(W+.55,.34,D+.48),worldMat(world,redDark,{roughness:.62}));
    roofBase.position.y=H+.34;g.add(roofBase);
    const roof=worldMesh(world,new THREE.BoxGeometry(W+.15,.72,D+.12),worldMat(world,red,{roughness:.58}));
    roof.position.y=H+.78;g.add(roof);

    const crown=worldMesh(world,new THREE.CylinderGeometry(1.65,1.65,.72,32,1,false,0,Math.PI),worldMat(world,soft,{roughness:.7}));
    crown.rotation.z=Math.PI/2;
    crown.rotation.y=Math.PI/2;
    crown.scale.z=.74;
    crown.position.set(0,H+1.08,0);g.add(crown);

    const windowMat=new THREE.MeshStandardMaterial({
      color:glass,emissive:glassDark,emissiveIntensity:.08,roughness:.17,
      transparent:true,opacity:.83
    });
    [-3.0,3.0].forEach(x=>{
      const surround=worldMesh(world,new THREE.BoxGeometry(2.05,2.25,.18),worldMat(world,frame,{roughness:.62}),{cast:false,receive:false});
      surround.position.set(x,2.12,D/2+.15);g.add(surround);
      const pane=worldMesh(world,new THREE.BoxGeometry(1.75,1.95,.11),windowMat,{cast:false,receive:false});
      pane.position.set(x,2.12,D/2+.26);g.add(pane);
      const barV=worldMesh(world,new THREE.BoxGeometry(.06,1.95,.035),worldMat(world,'#ffffff',{roughness:.35}),{cast:false,receive:false});
      barV.position.set(x,2.12,D/2+.33);g.add(barV);
    });

    const portal=worldMesh(world,new THREE.BoxGeometry(3.18,3.15,.30),worldMat(world,'#eef3f1',{roughness:.7}));
    portal.position.set(0,1.75,D/2+.17);g.add(portal);
    const portalTop=worldMesh(world,new THREE.BoxGeometry(3.62,.43,.42),worldMat(world,red,{roughness:.58}));
    portalTop.position.set(0,3.17,D/2+.49);g.add(portalTop);
    [-1.47,1.47].forEach(x=>{
      const pillar=worldMesh(world,new THREE.BoxGeometry(.28,2.82,.34),worldMat(world,redDark,{roughness:.68}));
      pillar.position.set(x,1.66,D/2+.46);g.add(pillar);
    });

    const doorMat=new THREE.MeshStandardMaterial({
      color:glass,emissive:glassDark,emissiveIntensity:.11,roughness:.13,
      metalness:.02,transparent:true,opacity:.78
    });
    [-.58,.58].forEach((x,index)=>{
      const door=worldMesh(world,new THREE.BoxGeometry(1.08,2.58,.09),doorMat,{cast:false,receive:false});
      door.position.set(x,1.62,D/2+.69);
      door.name=index===0?'dbSlideDoorLeft':'dbSlideDoorRight';
      door.userData.closedX=x;
      door.userData.openOffset=index===0?-1.02:1.02;
      g.add(door);
      const rail=worldMesh(world,new THREE.BoxGeometry(.045,2.58,.03),worldMat(world,'#ffffff',{roughness:.3}),{cast:false,receive:false});
      rail.position.set(index?-.03:.03,1.62,D/2+.75);g.add(rail);
    });

    const canopy=worldMesh(world,new THREE.BoxGeometry(4.45,.20,1.22),worldMat(world,red,{roughness:.58}));
    canopy.position.set(0,3.55,D/2+.90);canopy.rotation.x=-.055;g.add(canopy);

    addPokeballWallSign(world,g,D/2+.39,4.56,1.30);

    [-1.78,1.78].forEach(x=>{
      const base=worldMesh(world,new THREE.BoxGeometry(.22,.34,.16),worldMat(world,dark,{roughness:.7}));
      base.position.set(x,3.05,D/2+.56);g.add(base);
      const lamp=worldMesh(world,new THREE.SphereGeometry(.105,12,8),
        new THREE.MeshStandardMaterial({color:'#fff4c9',emissive:'#ffd86f',emissiveIntensity:.8,roughness:.25}),
        {cast:false,receive:false});
      lamp.position.set(x,3.05,D/2+.68);g.add(lamp);
    });

    g.traverse(o=>{
      if(o.isMesh){
        if(o.material!==doorMat&&o.material!==windowMat)o.castShadow=true;
        o.receiveShadow=true;
      }
    });
    return g;
  }

  World.prototype.makeBuilding=function(kind,p){
    if(kind==='center')return makePokemonCenter(this);
    return previousMakeBuilding.call(this,kind,p);
  };

  function addFloorPokeball(world,center){
    const white=worldMat(world,'#faf9f4',{roughness:.92});
    const red=worldMat(world,'#df5157',{roughness:.9});
    const dark=worldMat(world,'#5c5652',{roughness:.92});
    const disk=worldMesh(world,new THREE.CylinderGeometry(2.45,2.45,.025,48),white,{cast:false,receive:true});
    disk.position.set(center.x,.315,center.z);world.worldRoot.add(disk);
    const redHalf=worldMesh(world,new THREE.CylinderGeometry(2.25,2.25,.018,48,1,false,0,Math.PI),red,{cast:false,receive:true});
    redHalf.position.set(center.x,.334,center.z);redHalf.rotation.y=Math.PI/2;world.worldRoot.add(redHalf);
    const band=worldMesh(world,new THREE.BoxGeometry(4.65,.022,.22),dark,{cast:false,receive:true});
    band.position.set(center.x,.347,center.z);world.worldRoot.add(band);
    const button=worldMesh(world,new THREE.CylinderGeometry(.55,.55,.027,32),white,{cast:false,receive:true});
    button.position.set(center.x,.36,center.z);world.worldRoot.add(button);
    const ring=worldMesh(world,new THREE.TorusGeometry(.58,.085,10,36),dark,{cast:false,receive:true});
    ring.rotation.x=Math.PI/2;ring.position.set(center.x,.375,center.z);world.worldRoot.add(ring);
  }

  function addCenterBench(world,x,y,rot=0){
    const g=new THREE.Group();
    const seat=worldMesh(world,new THREE.BoxGeometry(2.55,.22,.78),worldMat(world,'#d9545b',{roughness:.78}));
    seat.position.y=.48;g.add(seat);
    const back=worldMesh(world,new THREE.BoxGeometry(2.55,.92,.20),worldMat(world,'#e46469',{roughness:.76}));
    back.position.set(0,.93,-.31);g.add(back);
    [-1.0,1.0].forEach(px=>{
      const leg=worldMesh(world,new THREE.BoxGeometry(.15,.43,.15),worldMat(world,'#77736c',{roughness:.9}));
      leg.position.set(px,.22,0);g.add(leg);
    });
    g.position.copy(world.gridPosition(x,y,.38));
    g.rotation.y=rot;
    world.worldRoot.add(g);
  }

  function addCenterPlant(world,x,y){
    const g=new THREE.Group();
    const pot=worldMesh(world,new THREE.CylinderGeometry(.28,.36,.48,12),worldMat(world,'#e8e1d5',{roughness:.9}));
    pot.position.y=.24;g.add(pot);
    const stem=worldMesh(world,new THREE.CylinderGeometry(.045,.06,.65,8),worldMat(world,'#4e8456',{roughness:1}));
    stem.position.y=.77;g.add(stem);
    [-.18,.18,0].forEach((px,i)=>{
      const leaf=worldMesh(world,new THREE.SphereGeometry(.27,10,8),worldMat(world,i===1?'#6ba46e':'#5b9561',{roughness:1}));
      leaf.scale.set(1,.65,.72);leaf.position.set(px,.98+i*.08,(i-1)*.10);g.add(leaf);
    });
    g.position.copy(world.gridPosition(x,y,.38));world.worldRoot.add(g);
  }

  function addHealingMachine(world,centerX,z){
    const shell=worldMat(world,'#f7f6f2',{roughness:.68});
    const red=worldMat(world,'#df4c54',{roughness:.62});
    const dark=worldMat(world,'#424a50',{roughness:.65});

    const base=worldMesh(world,new THREE.BoxGeometry(3.0,1.65,.78),shell);
    base.position.set(centerX,1.65,z-.36);world.worldRoot.add(base);
    const redTop=worldMesh(world,new THREE.BoxGeometry(3.08,.28,.84),red);
    redTop.position.set(centerX,2.55,z-.36);world.worldRoot.add(redTop);

    for(let i=-2;i<=2;i++){
      const cradle=worldMesh(world,new THREE.CylinderGeometry(.20,.20,.08,18),
        new THREE.MeshStandardMaterial({color:i%2?'#f7f7f4':'#e84f56',emissive:'#c64349',emissiveIntensity:.22,roughness:.35}),
        {cast:false,receive:false});
      cradle.position.set(centerX+i*.50,2.82,z-.03);world.worldRoot.add(cradle);
    }

    const screen=worldMesh(world,new THREE.BoxGeometry(.84,.42,.06),
      new THREE.MeshStandardMaterial({color:'#77d5e7',emissive:'#3ba5bd',emissiveIntensity:.55,roughness:.18}),
      {cast:false,receive:false});
    screen.position.set(centerX+1.62,1.82,z+.05);world.worldRoot.add(screen);

    addPokeballWallSign(world,world.worldRoot,z-.80,3.75,.9);
  }

  World.prototype.rebuildClassicInterior=function(map,area,state){
    if(map?.roomKind!=='center')return previousRebuildInterior.call(this,map,area,state);

    this.clearWorld();
    this.navMap=map;
    this.scene.background=new THREE.Color('#e9f0ef');
    this.scene.fog=new THREE.Fog('#e9f0ef',31,65);

    const hemi=new THREE.HemisphereLight(0xffffff,0x7e8b86,1.15);
    this.worldRoot.add(hemi);
    const key=new THREE.DirectionalLight(0xfff5df,.95);
    key.position.set(-6,14,8);
    key.castShadow=true;
    key.shadow.mapSize.set(512,512);
    key.shadow.camera.left=-14;key.shadow.camera.right=14;
    key.shadow.camera.top=14;key.shadow.camera.bottom=-14;
    this.worldRoot.add(key);

    const roomCenter=this.gridPosition(30,21,.3);
    const roomW=21*UNIT,roomD=22*UNIT;
    const floor=worldMesh(this,new THREE.BoxGeometry(roomW,.28,roomD),worldMat(this,'#f3eee5',{roughness:.9}),{cast:false,receive:true});
    floor.position.set(roomCenter.x,.15,roomCenter.z);this.worldRoot.add(floor);

    addFloorPokeball(this,this.gridPosition(30,22,.3));

    const wallMat=worldMat(this,'#faf9f5',{roughness:.93});
    const redMat=worldMat(this,'#dc4e55',{roughness:.72});
    const backZ=this.gridPosition(30,10).z;
    const back=worldMesh(this,new THREE.BoxGeometry(roomW,4.65,.35),wallMat);
    back.position.set(roomCenter.x,2.32,backZ);this.worldRoot.add(back);
    [-1,1].forEach(side=>{
      const wall=worldMesh(this,new THREE.BoxGeometry(.35,4.65,roomD),wallMat);
      wall.position.set(roomCenter.x+side*roomW/2,2.32,roomCenter.z);this.worldRoot.add(wall);
    });

    const stripe=worldMesh(this,new THREE.BoxGeometry(roomW,.42,.09),redMat,{cast:false,receive:false});
    stripe.position.set(roomCenter.x,2.82,backZ+.23);this.worldRoot.add(stripe);

    const counterZ=this.gridPosition(30,15).z;
    const counterBase=worldMesh(this,new THREE.BoxGeometry(8.7,.88,1.32),worldMat(this,'#faf8f2',{roughness:.74}));
    counterBase.position.set(roomCenter.x,.70,counterZ);this.worldRoot.add(counterBase);
    const counterFront=worldMesh(this,new THREE.BoxGeometry(8.82,.28,1.38),redMat);
    counterFront.position.set(roomCenter.x,1.05,counterZ);this.worldRoot.add(counterFront);
    const counterTop=worldMesh(this,new THREE.BoxGeometry(8.95,.16,1.48),worldMat(this,'#eee9df',{roughness:.58}));
    counterTop.position.set(roomCenter.x,1.28,counterZ);this.worldRoot.add(counterTop);

    addHealingMachine(this,roomCenter.x,backZ+1.05);

    const terminalX=this.gridPosition(23,17).x;
    const terminalZ=this.gridPosition(23,17).z;
    const pcDesk=worldMesh(this,new THREE.BoxGeometry(3.0,.78,1.0),worldMat(this,'#e9e5dc',{roughness:.8}));
    pcDesk.position.set(terminalX,.58,terminalZ);this.worldRoot.add(pcDesk);
    for(let i=-1;i<=1;i++){
      const monitor=worldMesh(this,new THREE.BoxGeometry(.72,.52,.08),
        new THREE.MeshStandardMaterial({color:'#74cfe3',emissive:'#3a9eb4',emissiveIntensity:.52,roughness:.18}),
        {cast:false,receive:false});
      monitor.position.set(terminalX+i*.92,1.20,terminalZ-.28);this.worldRoot.add(monitor);
    }

    addCenterBench(this,36,20,-Math.PI/2);
    addCenterBench(this,36,24,-Math.PI/2);
    addCenterPlant(this,22,13);
    addCenterPlant(this,38,13);

    const board=worldMesh(this,new THREE.BoxGeometry(2.75,1.45,.08),worldMat(this,'#87c6d3',{roughness:.55}),{cast:false,receive:false});
    board.position.set(this.gridPosition(37,12).x,2.10,backZ+.23);this.worldRoot.add(board);
    const boardHead=this.makeTextPlane('POKÉMON CENTER','#ffffff');
    boardHead.position.set(this.gridPosition(37,12).x,2.35,backZ+.29);
    boardHead.scale.multiplyScalar(.34);this.worldRoot.add(boardHead);

    const path=worldMesh(this,new THREE.BoxGeometry(2.35,.025,8.8),worldMat(this,'#ead4d2',{roughness:.96}),{cast:false,receive:true});
    path.position.set(roomCenter.x,.305,this.gridPosition(30,26).z);this.worldRoot.add(path);
    const rug=worldMesh(this,new THREE.BoxGeometry(3.2,.035,1.15),redMat,{cast:false,receive:true});
    rug.position.set(roomCenter.x,.325,this.gridPosition(30,29).z);this.worldRoot.add(rug);

    map.objects.forEach(o=>this.makeLandmark(o,map.titanId,area.palette||{accent:'#e4c969'},state));
  };

  World.prototype.updateAnimations=function(time,frameDelta){
    if(typeof previousUpdateAnimations==='function')previousUpdateAnimations.call(this,time,frameDelta);
    const t=(Number(time)||0)*.001;
    this.worldRoot?.traverse?.(o=>{
      if(!o.userData?.actualTrainer||!o.children?.length)return;
      const visual=o.children.find(c=>c.userData?.visualSlot);
      if(!visual)return;
      const phase=o.userData.idlePhase||0;
      visual.position.y=Math.sin(t*1.45+phase)*.008;
      visual.rotation.z=Math.sin(t*.72+phase)*.004;
    });
  };

  function refresh(){
    try{
      if(typeof currentMap!=='undefined'&&currentMap&&window.driftboundWorld3D){
        window.driftboundWorld3D.rebuild(currentMap,S?.currentTitan||'verdant',S);
      }
    }catch(_e){}
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,100),{once:true});
  }else setTimeout(refresh,100);

  window.__DRIFTBOUND_V115_WORLD__={
    actualTrainerModels:Object.keys(TRAINER_DATA),
    centerVersion:115
  };
})();
