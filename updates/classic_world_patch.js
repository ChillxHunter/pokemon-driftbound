/* Pokémon: Driftbound v90 — traditional-region world renderer upgrade. */
(function(){
  'use strict';
  const THREE=window.THREE,World=window.DriftboundWorld3D;
  if(!THREE||!World)return;
  const UNIT=1.05,COLS=60,ROWS=40;
  const oldUpdateAnimations=World.prototype.updateAnimations;
  const oldMakeLandmark=World.prototype.makeLandmark;

  World.prototype.makeClassicGround=function(map,p){
    const ground=this.mesh(new THREE.BoxGeometry(COLS*UNIT+3,.55,ROWS*UNIT+3),this.material(p.ground,{roughness:.96}),{cast:false,receive:true});
    ground.position.y=.02;this.worldRoot.add(ground);
    const inner=this.mesh(new THREE.PlaneGeometry(COLS*UNIT,ROWS*UNIT,12,8),this.material(p.ground2,{roughness:1,transparent:true,opacity:.14,depthWrite:false}),{cast:false,receive:true});
    inner.rotation.x=-Math.PI/2;inner.position.y=.315;this.worldRoot.add(inner);
    if(map.biome==='coast'){
      const waterMat=this.material(p.water,{roughness:.22,metalness:.04,transparent:true,opacity:.88});
      const water=this.mesh(new THREE.PlaneGeometry(COLS*UNIT+22,15,18,5),waterMat,{cast:false,receive:true});
      water.rotation.x=-Math.PI/2;water.position.set(0,.25,-ROWS*UNIT*.47-5.2);water.userData.base=Float32Array.from(water.geometry.attributes.position.array);this.worldRoot.add(water);this.ocean=water;
    }
  };

  World.prototype.makeTree=function(rand,{snow=false,dead=false,palm=false}={}){
    const g=new THREE.Group();
    const bark=this.material(dead?'#54473e':palm?'#8a6846':'#6c4c32',{roughness:1});
    const trunk=this.mesh(new THREE.CylinderGeometry(.12,.22,1.38,9),bark);trunk.position.y=.68;trunk.rotation.z=(rand()-.5)*.045;g.add(trunk);
    if(palm){
      for(let i=0;i<7;i++){
        const leaf=this.mesh(new THREE.ConeGeometry(.13,.82,5),this.material(i%2?'#3f8d58':'#52a667',{side:THREE.DoubleSide}),{cast:true,receive:false});
        leaf.position.set(0,1.42,0);leaf.rotation.z=Math.PI/2-.22;leaf.rotation.y=i/7*Math.PI*2;leaf.translateY(.34);g.add(leaf);
      }
    }else if(dead){
      for(const side of [-1,1]){
        const branch=this.mesh(new THREE.CylinderGeometry(.045,.07,.72,7),bark);branch.position.set(side*.24,1.05,0);branch.rotation.z=side*.72;g.add(branch);
      }
    }else{
      const leafColors=snow?['#bed8d2','#dce9e4','#8eaca7']:['#2f7046','#3f8652','#4d965c','#285e3d'];
      const clusters=[
        [0,1.55,0,.56],[-.34,1.35,.03,.44],[.34,1.34,.05,.45],[-.17,1.66,-.22,.38],[.19,1.7,-.18,.39],[0,1.33,.3,.43]
      ];
      clusters.forEach((c,i)=>{
        const crown=this.mesh(new THREE.IcosahedronGeometry(c[3]*(.88+rand()*.2),1),this.material(leafColors[i%leafColors.length],{roughness:1}));
        crown.position.set(c[0]+(rand()-.5)*.08,c[1]+(rand()-.5)*.07,c[2]+(rand()-.5)*.08);crown.scale.y=.9+rand()*.18;g.add(crown);
      });
      if(snow){
        const cap=this.mesh(new THREE.ConeGeometry(.64,.58,8),this.material('#eaf4f2',{roughness:.95}),{cast:false,receive:true});cap.position.y=1.78;g.add(cap);
      }
    }
    g.userData.windBaseZ=g.rotation.z;this.animations.push({object:g,type:'treeWind',phase:rand()*6.28,strength:.012+rand()*.012});
    return g;
  };

  World.prototype.makeObstacle=function(titanId,p,rand){
    const biome=this.navMap?.biome||'plains';
    if(['town','plains','forest','route','lake'].includes(biome))return this.makeTree(rand);
    if(biome==='coast')return rand()<.65?this.makeTree(rand,{palm:true}):this.makeTree(rand);
    if(biome==='snow')return this.makeTree(rand,{snow:true});
    if(biome==='graveyard'){
      if(rand()<.58)return this.makeTree(rand,{dead:true});
      const g=new THREE.Group(),stone=this.material('#6b6a73',{roughness:1});
      const slab=this.mesh(new THREE.BoxGeometry(.42,.72,.16),stone);slab.position.y=.36;slab.rotation.z=(rand()-.5)*.08;g.add(slab);
      const top=this.mesh(new THREE.SphereGeometry(.21,10,6,0,Math.PI*2,0,Math.PI/2),stone);top.scale.z=.38;top.position.y=.72;g.add(top);return g;
    }
    const g=new THREE.Group(),rockMat=this.material(biome==='cave'?'#515965':'#6a6159',{roughness:1});
    const base=this.mesh(new THREE.DodecahedronGeometry(.5+rand()*.18,1),rockMat);base.position.y=.42;base.scale.set(1,.8+rand()*.35,.9);base.rotation.y=rand()*Math.PI;g.add(base);
    if(biome==='volcanic'&&rand()<.35){const glow=this.mesh(new THREE.ConeGeometry(.1,.45,5),new THREE.MeshStandardMaterial({color:'#ff8b3d',emissive:'#d94b22',emissiveIntensity:.7}));glow.position.set(.12,.72,.03);g.add(glow)}
    return g;
  };

  World.prototype.makeTerrainDetails=function(map,p){
    const rand=this.seed(this.hash(`classic-scene-${map.areaId||map.titanId}`));let detailCount=0;
    for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){
      const tile=map.tiles[y][x];
      if(tile==='obstacle'){
        const detail=this.makeObstacle(map.titanId,p,rand);detail.position.copy(this.gridPosition(x,y,.38));detail.rotation.y=rand()*Math.PI*2;detail.scale.multiplyScalar(.82+rand()*.34);this.worldRoot.add(detail);detailCount++;
      }else if(tile==='grass'&&detailCount<520&&rand()<.94){
        const patch=this.makeGrassPatch(map.titanId,p,rand);patch.position.copy(this.gridPosition(x+(rand()-.5)*.22,y+(rand()-.5)*.22,.37));this.worldRoot.add(patch);detailCount++;
      }else if(['ground','rough'].includes(tile)&&rand()<.055){
        const pebble=this.mesh(new THREE.DodecahedronGeometry(.09+rand()*.11,0),this.material(p.edge),{cast:true,receive:true});pebble.scale.y=.38;pebble.position.copy(this.gridPosition(x+(rand()-.5)*.55,y+(rand()-.5)*.55,.39));this.worldRoot.add(pebble);
      }
    }
  };

  World.prototype.makeGrassPatch=function(titanId,p,rand){
    const group=new THREE.Group(),biome=this.navMap?.biome||'plains';
    const baseColor=biome==='snow'?'#a9cdb9':biome==='graveyard'?'#536b58':biome==='cave'?'#557761':biome==='coast'?'#5f9c57':'#438d4f';
    const mat=this.material(baseColor,{side:THREE.DoubleSide,roughness:1});
    const dark=this.material(biome==='snow'?'#799f8b':'#2f7041',{side:THREE.DoubleSide,roughness:1});
    const count=10+Math.floor(rand()*7);
    for(let i=0;i<count;i++){
      const h=.28+rand()*.34,w=.05+rand()*.025;
      const geo=new THREE.PlaneGeometry(w,h,1,2);geo.translate(0,h/2,0);
      const blade=this.mesh(geo,i%3?mat:dark,{cast:false,receive:true});
      const a=rand()*Math.PI*2,r=rand()*.38;blade.position.set(Math.cos(a)*r,0,Math.sin(a)*r);blade.rotation.y=rand()*Math.PI;blade.rotation.z=(rand()-.5)*.16;group.add(blade);
      if(i%3===0){const cross=blade.clone();cross.rotation.y+=Math.PI/2;group.add(cross)}
    }
    group.userData.windBaseZ=group.rotation.z;group.userData.windBaseX=group.rotation.x;
    this.animations.push({object:group,type:'grassWind',phase:rand()*6.28,strength:.035+rand()*.025});
    return group;
  };

  World.prototype.makeClassicTrainer=function(color='#4378aa',accent='#f4d36d',female=false){
    const g=new THREE.Group(),skin=this.material('#e9b98f'),shirt=this.material(color),pants=this.material('#344356'),shoe=this.material('#2b3038'),hair=this.material(female?'#52382f':'#45352e');
    [-.11,.11].forEach(x=>{const leg=this.mesh(new THREE.CylinderGeometry(.065,.078,.48,8),pants);leg.position.set(x,.3,0);g.add(leg);const boot=this.mesh(new THREE.BoxGeometry(.17,.11,.26),shoe);boot.position.set(x,.06,.05);g.add(boot)});
    const torso=this.mesh(new THREE.BoxGeometry(.39,.48,.23),shirt);torso.position.y=.82;g.add(torso);
    [-.245,.245].forEach((x,i)=>{const arm=this.mesh(new THREE.CylinderGeometry(.05,.06,.5,8),skin);arm.position.set(x,.82,.02);arm.rotation.z=(i?-.18:.18);g.add(arm)});
    const head=this.mesh(new THREE.SphereGeometry(.19,14,10),skin);head.position.y=1.22;g.add(head);
    const cap=this.mesh(new THREE.SphereGeometry(.195,14,7,0,Math.PI*2,0,Math.PI*.54),hair);cap.position.y=1.27;g.add(cap);
    const stripe=this.mesh(new THREE.BoxGeometry(.4,.055,.25),this.material(accent));stripe.position.set(0,.92,.13);g.add(stripe);
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
  };

  World.prototype.makeBuilding=function(kind,p){
    const g=new THREE.Group();
    const wallColor=kind==='center'?'#f5eee3':kind==='mart'?'#e9f1f5':kind==='gym'?'#ebe8dc':'#e8dfcf';
    const roofColor=kind==='center'?'#d84b4b':kind==='mart'?'#3f78b8':kind==='gym'?p.accent:'#5a7d6f';
    const wall=this.mesh(new THREE.BoxGeometry(2.45,1.35,1.75),this.material(wallColor,{roughness:.95}));wall.position.y=.68;g.add(wall);
    const roof=this.mesh(new THREE.ConeGeometry(1.75,.72,4),this.material(roofColor,{roughness:.85}));roof.rotation.y=Math.PI/4;roof.scale.z=.72;roof.position.y=1.63;g.add(roof);
    const door=this.mesh(new THREE.BoxGeometry(.48,.83,.08),this.material('#584536'));door.position.set(0,.43,.9);g.add(door);
    const winMat=this.material('#9fd9e7',{emissive:'#578fa0',emissiveIntensity:.12,roughness:.35});[-.72,.72].forEach(x=>{const w=this.mesh(new THREE.BoxGeometry(.45,.42,.06),winMat,{cast:false,receive:false});w.position.set(x,.83,.9);g.add(w)});
    const label=kind==='center'?'P':kind==='mart'?'M':kind==='gym'?'GYM':'LAB';
    const sign=this.makeTextPlane(label,kind==='center'?'#ffffff':kind==='mart'?'#ffffff':'#fff3a8');sign.position.set(0,1.25,.94);sign.scale.multiplyScalar(kind==='gym'?.48:.4);g.add(sign);
    return g;
  };

  World.prototype.makeLandmark=function(o,titanId,p,state){
    const g=new THREE.Group();
    if(o.type==='center')g.add(this.makeBuilding('center',p));
    else if(o.type==='mart')g.add(this.makeBuilding('mart',p));
    else if(o.type==='gym')g.add(this.makeBuilding('gym',p));
    else if(o.type==='lab')g.add(this.makeBuilding('lab',p));
    else if(['trainer','rival','elite'].includes(o.type))g.add(this.makeClassicTrainer(o.color||'#4978a6',o.accent||p.accent,o.female));
    else if(o.type==='sign'||o.type==='exitSign'){
      const post=this.mesh(new THREE.CylinderGeometry(.045,.06,.82,7),this.material('#765336'));post.position.y=.4;g.add(post);
      const board=this.mesh(new THREE.BoxGeometry(.9,.48,.08),this.material('#d5b47a'));board.position.y=.87;g.add(board);
      const text=this.makeTextPlane((o.short||'!').slice(0,8),'#3a3327');text.position.set(0,.87,.06);text.scale.multiplyScalar(.25);g.add(text);
    }else if(o.type==='hmGate'){
      if(o.hm==='Cut')g.add(this.makeTree(()=>.43));
      else if(o.hm==='Surf'){
        const water=this.mesh(new THREE.BoxGeometry(1.05,.08,1.05),this.material(p.water,{roughness:.22,transparent:true,opacity:.9}),{cast:false,receive:true});water.position.y=.04;g.add(water);
      }else{
        const rock=this.mesh(new THREE.DodecahedronGeometry(.58,1),this.material('#66615d'));rock.position.y=.42;g.add(rock);
        const mark=this.makeTextPlane(o.hm==='Strength'?'S':'✕','#f2d37c');mark.position.set(0,.7,.5);mark.scale.multiplyScalar(.3);g.add(mark);
      }
    }else if(o.type==='puzzleSwitch'){
      const base=this.mesh(new THREE.CylinderGeometry(.38,.45,.18,12),this.material('#5e6770'));base.position.y=.09;g.add(base);
      const orb=this.mesh(new THREE.SphereGeometry(.15,12,8),new THREE.MeshStandardMaterial({color:o.active?'#78e89a':'#e8c65a',emissive:o.active?'#37c86a':'#a57d22',emissiveIntensity:.65}));orb.position.y=.34;g.add(orb);this.animations.push({object:orb,type:'itemFloat',phase:(o.index||0)*.9,baseY:.34});
    }else if(o.type==='puzzleDoor'){
      const mat=this.material('#565e67');[-.48,.48].forEach(x=>{const col=this.mesh(new THREE.BoxGeometry(.32,1.4,.32),mat);col.position.set(x,.7,0);g.add(col)});const cap=this.mesh(new THREE.BoxGeometry(1.3,.32,.36),mat);cap.position.y=1.35;g.add(cap);
    }else if(o.type==='itemPickup'||o.type==='tmPickup'){
      const ball=this.mesh(new THREE.SphereGeometry(.16,12,8),this.material(o.type==='tmPickup'?'#e4b55f':'#f4f4f4',{metalness:.08,roughness:.35}),{cast:true,receive:false});ball.position.y=.35;g.add(ball);
      const band=this.mesh(new THREE.TorusGeometry(.16,.025,6,18),this.material(o.type==='tmPickup'?'#7b5ec6':'#d64b4b'));band.rotation.x=Math.PI/2;band.position.y=.35;g.add(band);this.animations.push({object:g,type:'itemFloat',phase:(o.x+o.y)*.11,baseY:0});
    }else if(o.type==='leagueGate'){
      const mat=this.material('#d9d1b5');[-.8,.8].forEach(x=>{const col=this.mesh(new THREE.CylinderGeometry(.17,.22,1.8,10),mat);col.position.set(x,.9,0);g.add(col)});const arch=this.mesh(new THREE.TorusGeometry(.8,.17,8,28,Math.PI),mat);arch.position.y=1.65;g.add(arch);const sig=this.makeTextPlane('LEAGUE','#fff1a8');sig.position.set(0,1.7,.18);sig.scale.multiplyScalar(.28);g.add(sig);
    }else return oldMakeLandmark.call(this,o,titanId,p,state);
    g.position.copy(this.gridPosition(o.x,o.y,.38));this.worldRoot.add(g);
  };

  World.prototype.rebuild=function(map,area,state){
    this.clearWorld();this.navMap=map;
    const p=area.palette||{ground:'#78a96b',ground2:'#5f925c',path:'#c9ae77',edge:'#5b6a51',water:'#6aa8c7',accent:'#f0ca62'};
    const interior=!!map.interior,biome=map.biome||'plains';
    const skies={town:'#a9d5e4',plains:'#a7d9e7',forest:'#7eb9b1',cave:'#1d2932',mountain:'#9db5c7',volcanic:'#b37c6a',lake:'#9bd6e4',coast:'#9fd9ec',graveyard:'#736f91',snow:'#d6e7ed',league:'#b9d4e7'};
    const fogs={cave:'#202a33',graveyard:'#6b6883',forest:'#8cbfb5',snow:'#dbe9eb'};
    this.scene.background=new THREE.Color(skies[biome]||'#a8d4df');this.scene.fog=new THREE.Fog(fogs[biome]||skies[biome]||'#a8d4df',interior?12:28,interior?46:88);
    const hemi=new THREE.HemisphereLight(interior?0x94b6b1:0xe5f6ff,biome==='graveyard'?0x2e2a3d:0x4f6148,interior?.48:.68);this.worldRoot.add(hemi);
    const sun=new THREE.DirectionalLight(biome==='graveyard'?0xd4c9ff:0xfff0d3,interior?.58:1.04);sun.position.set(-10,18,12);sun.castShadow=true;sun.shadow.mapSize.set(768,768);sun.shadow.camera.left=-34;sun.shadow.camera.right=34;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;sun.shadow.bias=-.00065;this.worldRoot.add(sun);
    const rim=new THREE.DirectionalLight(p.accent,.18);rim.position.set(12,8,-11);this.worldRoot.add(rim);
    this.makeClassicGround(map,p);this.makePaths(map,p);this.makeTerrainDetails(map,p);map.objects.forEach(o=>this.makeLandmark(o,map.titanId,p,state));
    if(!interior){
      const rand=this.seed(this.hash(`horizon-${map.areaId||map.titanId}`));
      for(let i=0;i<26;i++){
        const a=i/26*Math.PI*2,r=31+rand()*5,obj=['mountain','cave','volcanic'].includes(biome)?this.makeObstacle('cinder',p,rand):this.makeTree(rand,{snow:biome==='snow',dead:biome==='graveyard'});obj.position.set(Math.cos(a)*r,-.05,Math.sin(a)*r*.66);obj.scale.multiplyScalar(1.2+rand()*.8);this.worldRoot.add(obj);
      }
    }
  };

  World.prototype.updateAnimations=function(time){
    oldUpdateAnimations.call(this,time);
    for(const a of this.animations){
      if(a.type==='grassWind'){
        const gust=Math.sin(time*.0021+a.phase)+Math.sin(time*.00073+a.phase*1.7)*.45;a.object.rotation.z=(a.object.userData.windBaseZ||0)+gust*a.strength;a.object.rotation.x=(a.object.userData.windBaseX||0)+Math.sin(time*.0016+a.phase*.7)*a.strength*.34;
      }else if(a.type==='treeWind')a.object.rotation.z=(a.object.userData.windBaseZ||0)+Math.sin(time*.00095+a.phase)*a.strength;
      else if(a.type==='itemFloat')a.object.position.y=(a.baseY||0)+Math.sin(time*.0024+a.phase)*.08;
    }
  };

  World.prototype.render=function(time,{state,map,titan,wilds}){
    if(!state?.started||!map||!titan)return;
    const delta=this.lastRenderTime?Math.min(.05,Math.max(.001,(time-this.lastRenderTime)/1000)):1/60;this.lastRenderTime=time;this.resize();
    const puzzleKey=JSON.stringify(state.puzzleState?.[map.areaId]||{}),clearedKey=Object.keys(state.clearedObstacles||{}).filter(k=>k.startsWith(`${map.areaId}:`)).sort().join(',');
    const key=`classic:${map.areaId||map.titanId}:${puzzleKey}:${clearedKey}:${(state.defeatedTrainers&&Object.keys(state.defeatedTrainers).length)||0}`;
    if(key!==this.buildKey){
      this.buildKey=key;this.rebuild(map,titan,state);
      const spawn=this.gridPosition(state.player.x,state.player.y,this.groundHeightAt(state.player.x,state.player.y));this.player.position.copy(spawn);this.playerTarget.copy(spawn);this.playerMoveFrom.copy(spawn);this.playerMoveStart=time-155;this.playerMoveProgress=1;this.lastPlayerGrid={x:state.player.x,y:state.player.y};this.movePulse=0;this.camera.position.copy(this.player.position).add(new THREE.Vector3(0,4.75,6.75));
    }
    this.syncWilds(wilds||[]);this.updatePlayer(state,time,delta);if(this.ocean)this.updateOcean(time,map.titanId);this.updateAnimations(time);this.updateWilds(time,state);this.renderer.render(this.scene,this.camera);
  };
})();

/* v90 classic-region guarantee: roaming wild Pokémon never leave encounter grass. */
(function(){
  const World=window.DriftboundWorld3D;if(!World)return;
  const old=World.prototype.wildWalkable;
  World.prototype.wildWalkable=function(x,y,state,item){
    if(this.navMap?.classic){
      if(this.navMap.tiles?.[y]?.[x]!=='grass')return false;
      if(this.navMap.objects.some(object=>object.x===x&&object.y===y))return false;
      if(state&&state.player.x===x&&state.player.y===y)return false;
      return !this.wildEls.some(other=>other!==item&&Math.round(other.targetX)===x&&Math.round(other.targetY)===y);
    }
    return old.call(this,x,y,state,item);
  };
})();
