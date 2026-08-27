/* Pokémon: Driftbound v120 — World Foundation rebuild.
   Exterior visuals only. Battles and music are intentionally untouched. */
(function(){
  'use strict';
  const THREE=window.THREE;
  const World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  const PREV_REBUILD=World.prototype.rebuild;
  const PREV_RENDER=World.prototype.render;
  const PREV_UPDATE_PLAYER=World.prototype.updatePlayer;

  const COLORS={
    verdant:{ground:'#4fae55',ground2:'#68c965',dark:'#246b39',grass:'#2f9e45',grass2:'#6bd65f',leaf:'#1f7436',leaf2:'#3f9d45',leaf3:'#72bd4c',trunk:'#5b3520',rock:'#756d57',flowers:['#ffffff','#ffd45f','#ff8fc2','#9fd7ff','#f5906f','#d0a5ff']},
    cinder:{ground:'#9a7041',ground2:'#c28d4f',dark:'#654527',grass:'#8f7339',grass2:'#b59b4c',leaf:'#81713d',leaf2:'#a28a42',leaf3:'#c09b49',trunk:'#4d3023',rock:'#74564a',flowers:['#ffc457','#ff8664','#ffe2a7']},
    tide:{ground:'#42aa87',ground2:'#67c6a0',dark:'#246d63',grass:'#2d9a79',grass2:'#68d0a4',leaf:'#287d64',leaf2:'#46a77c',leaf3:'#73c396',trunk:'#574730',rock:'#5f7770',flowers:['#ffffff','#ffd9a0','#ffa5b5','#a9eaff']},
    frost:{ground:'#b8ded7',ground2:'#d2ece7',dark:'#729d9a',grass:'#9bc9c2',grass2:'#d3ece5',leaf:'#79afa6',leaf2:'#9ccbc1',leaf3:'#c1e2d7',trunk:'#6d625c',rock:'#879da1',flowers:['#ffffff','#b8dbff','#d9c3ff']},
    dusk:{ground:'#5e547b',ground2:'#776594',dark:'#39324f',grass:'#54426f',grass2:'#8165a0',leaf:'#383058',leaf2:'#55456f',leaf3:'#75598e',trunk:'#382b39',rock:'#5e586e',flowers:['#cba6ff','#93b7ff','#ff9ad8']},
    sky:{ground:'#91cfb9',ground2:'#b4dfcc',dark:'#5d9584',grass:'#7ebca6',grass2:'#b6e1ca',leaf:'#65a98f',leaf2:'#8cc7aa',leaf3:'#b2dec0',trunk:'#655b48',rock:'#899c93',flowers:['#ffffff','#fff3a7','#aee2ff']}
  };

  function M(color,extra={}){
    return new THREE.MeshStandardMaterial(Object.assign({color,roughness:.9,metalness:0},extra));
  }
  function seeded(world,label){return world.seed(world.hash(label));}
  function ext(map){return map && !map.interior && !map.roomKind;}

  function addGround(world,map){
    const c=COLORS[map.titanId]||COLORS.verdant;
    const geo=new THREE.PlaneGeometry(61.6,40.3,18,12);
    const mat=M(c.ground,{roughness:1});
    const ground=world.mesh(geo,mat,{cast:false,receive:true});
    ground.name='V120_RichGround';
    ground.rotation.x=-Math.PI/2;
    ground.position.y=.345;
    world.worldRoot.add(ground);

    const rand=seeded(world,'v120-ground-'+(map.id||map.name||'')+'-'+map.titanId);
    const patchMat=M(c.ground2,{transparent:true,opacity:.5,depthWrite:false,roughness:1});
    for(let i=0;i<22;i++){
      const patch=world.mesh(new THREE.CircleGeometry(2.4+rand()*4.6,20),patchMat,{cast:false,receive:false});
      patch.name='V120_GroundPatch';
      patch.rotation.x=-Math.PI/2;
      patch.scale.set(.8+rand()*1.5,.55+rand()*.9,1);
      patch.position.set((rand()-.5)*54,.355,(rand()-.5)*33);
      world.worldRoot.add(patch);
    }
  }

  function giantTree(world,c,rand,scale=1){
    const g=new THREE.Group();g.name='V120_GiantTree';
    const h=(8.5+rand()*5.5)*scale;
    const r=(.42+rand()*.22)*scale;
    const trunkMat=M(c.trunk,{roughness:1});
    const trunk=world.mesh(new THREE.CylinderGeometry(r*.74,r,h,10),trunkMat);
    trunk.position.y=h/2;g.add(trunk);

    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2+rand()*.25;
      const root=world.mesh(new THREE.CylinderGeometry(.07*scale,.22*scale,2.2*scale,6),trunkMat);
      root.rotation.z=Math.PI/2.7;root.rotation.y=a;
      root.position.set(Math.cos(a)*.65*scale,.17*scale,Math.sin(a)*.65*scale);
      g.add(root);
    }

    const mats=[M(c.leaf,{roughness:1}),M(c.leaf2,{roughness:1}),M(c.leaf3,{roughness:1})];
    const y=h*.78;
    const crowns=[
      [0,0,0,3.25],[-2.6,-.1,.2,2.35],[2.5,.15,-.15,2.4],
      [-1.1,1.35,-1.8,2.15],[1.5,1.1,1.65,2.2],[0,2.0,.1,2.0],
      [-2.0,.45,1.75,1.95],[2.1,.35,-1.8,1.9]
    ];
    crowns.forEach((v,i)=>{
      const crown=world.mesh(new THREE.DodecahedronGeometry(v[3]*scale*(.88+rand()*.22),1),mats[i%3]);
      crown.position.set(v[0]*scale,y+v[1]*scale,v[2]*scale);
      crown.scale.set(1.12,.78+rand()*.2,1.08);
      crown.rotation.set(rand()*.1,rand()*Math.PI,rand()*.08);
      g.add(crown);
    });
    return g;
  }

  function addForest(world,map){
    const c=COLORS[map.titanId]||COLORS.verdant;
    const rand=seeded(world,'v120-forest-'+(map.id||map.name||'')+'-'+map.titanId);
    const obstacles=[];
    for(let y=1;y<map.tiles.length-1;y++)for(let x=1;x<map.tiles[y].length-1;x++){
      if(map.tiles[y][x]==='obstacle')obstacles.push([x,y]);
    }

    if(map.titanId==='verdant'){
      const step=Math.max(1,Math.floor(obstacles.length/26));
      for(let i=0;i<obstacles.length&&i/step<26;i+=step){
        const [x,y]=obstacles[i];
        const pos=world.gridPosition(x+(rand()-.5)*.35,y+(rand()-.5)*.35,.36);
        const tree=giantTree(world,c,rand,.92+rand()*.34);
        tree.position.copy(pos);tree.rotation.y=rand()*Math.PI*2;
        world.worldRoot.add(tree);
      }
    }

    if(['verdant','tide','dusk'].includes(map.titanId)){
      for(let i=0;i<34;i++){
        const a=i/34*Math.PI*2+(rand()-.5)*.07;
        const rx=34+rand()*8,rz=24+rand()*6;
        const tree=giantTree(world,c,rand,1.05+rand()*.72);
        tree.position.set(Math.cos(a)*rx,-.25,Math.sin(a)*rz);
        tree.rotation.y=rand()*Math.PI*2;
        world.worldRoot.add(tree);
      }
    }
  }

  function addGrass(world,map){
    const c=COLORS[map.titanId]||COLORS.verdant;
    const rand=seeded(world,'v120-grass-'+(map.id||map.name||'')+'-'+map.titanId);
    const tiles=[];
    for(let y=1;y<map.tiles.length-1;y++)for(let x=1;x<map.tiles[y].length-1;x++)if(map.tiles[y][x]==='grass')tiles.push([x,y]);
    if(!tiles.length)return;

    const perTile=map.titanId==='verdant'?17:10;
    const max=Math.min(4600,tiles.length*perTile);
    const bladeGeo=new THREE.ConeGeometry(.04,1.15,4);
    bladeGeo.translate(0,.575,0);
    const grass=new THREE.InstancedMesh(bladeGeo,M(c.grass,{side:THREE.DoubleSide,roughness:1}),max);
    grass.name='V120_DenseTallGrass';grass.castShadow=false;grass.receiveShadow=true;
    const dummy=new THREE.Object3D();let n=0;
    outer:for(const [x,y] of tiles){
      for(let i=0;i<perTile;i++){
        if(n>=max)break outer;
        const pos=world.gridPosition(x+(rand()-.5)*.9,y+(rand()-.5)*.9,.37);
        dummy.position.copy(pos);
        dummy.rotation.set((rand()-.5)*.15,rand()*Math.PI,(rand()-.5)*.32);
        const sy=.7+rand()*.75;dummy.scale.set(.75+rand()*.6,sy,.75+rand()*.5);
        dummy.updateMatrix();grass.setMatrixAt(n++,dummy.matrix);
      }
    }
    grass.count=n;grass.instanceMatrix.needsUpdate=true;world.worldRoot.add(grass);

    const flowerMatCache={};
    const count=Math.min(180,Math.floor(tiles.length*.9));
    for(let i=0;i<count;i++){
      const [x,y]=tiles[Math.floor(rand()*tiles.length)];
      const pos=world.gridPosition(x+(rand()-.5)*.85,y+(rand()-.5)*.85,.39);
      if(rand()<.35){
        const bush=world.mesh(new THREE.DodecahedronGeometry(.18+rand()*.2,1),M(rand()<.5?c.leaf2:c.leaf3,{roughness:1}),{cast:false,receive:true});
        bush.scale.set(1.4,.75,1.15);bush.position.copy(pos);bush.position.y+=.13;world.worldRoot.add(bush);
      }else{
        const color=c.flowers[Math.floor(rand()*c.flowers.length)];
        flowerMatCache[color] ||= M(color,{roughness:.7,emissive:color,emissiveIntensity:.035});
        const stem=world.mesh(new THREE.CylinderGeometry(.009,.013,.22+rand()*.18,5),M('#337843'),{cast:false,receive:false});
        stem.position.copy(pos);stem.position.y+=.11;world.worldRoot.add(stem);
        const bloom=world.mesh(new THREE.SphereGeometry(.045+rand()*.035,6,4),flowerMatCache[color],{cast:false,receive:false});
        bloom.scale.y=.42;bloom.position.copy(pos);bloom.position.y+=.25+rand()*.12;world.worldRoot.add(bloom);
      }
    }
  }

  function addLandforms(world,map){
    const c=COLORS[map.titanId]||COLORS.verdant;
    const rand=seeded(world,'v120-landforms-'+(map.id||map.name||'')+'-'+map.titanId);
    const rockMat=M(c.rock,{roughness:1});
    for(let i=0;i<16;i++){
      const a=i/16*Math.PI*2+.15;
      const rock=world.mesh(new THREE.DodecahedronGeometry(3.2+rand()*3.8,1),rockMat);
      rock.name='V120_DistantCliff';
      rock.scale.set(1.4+rand()*1.7,2.0+rand()*3.4,.8+rand()*.9);
      rock.position.set(Math.cos(a)*(45+rand()*10),4.5+rand()*6,Math.sin(a)*(34+rand()*8));
      rock.rotation.set(rand()*.15,rand()*Math.PI,rand()*.12);
      world.worldRoot.add(rock);
    }
  }

  function lighting(world,map){
    const c=COLORS[map.titanId]||COLORS.verdant;
    world.renderer.toneMapping=THREE.ReinhardToneMapping;
    world.renderer.toneMappingExposure=1.04;
    const skies={verdant:'#63c8ff',cinder:'#f3a56e',tide:'#69d5ef',frost:'#b6e6f6',dusk:'#766aa6',sky:'#8bd8ff'};
    const fogs={verdant:'#b8e6d0',cinder:'#d49c7a',tide:'#b7eee0',frost:'#e2f4f2',dusk:'#77718e',sky:'#d5eff0'};
    world.scene.background=new THREE.Color(skies[map.titanId]||skies.verdant);
    world.scene.fog=new THREE.Fog(fogs[map.titanId]||fogs.verdant,42,145);
    world.camera.far=210;world.camera.updateProjectionMatrix();
    world.worldRoot.traverse(o=>{
      if(o.isHemisphereLight){o.intensity=1.0;o.color.set('#f7fcff');o.groundColor.set(c.dark);}
      if(o.isDirectionalLight){o.intensity=Math.max(o.intensity,1.2);}
    });
    const warm=new THREE.DirectionalLight(0xfff3c4,.42);warm.position.set(-18,24,14);world.worldRoot.add(warm);
    const skyFill=new THREE.DirectionalLight(0xb9e8ff,.24);skyFill.position.set(14,10,-16);world.worldRoot.add(skyFill);
  }

  function applyWorld(world,map){
    lighting(world,map);
    addGround(world,map);
    addForest(world,map);
    addGrass(world,map);
    addLandforms(world,map);
    const marker=new THREE.Object3D();marker.name='V120_WORLD_READY';world.worldRoot.add(marker);
  }

  World.prototype.rebuild=function(map,titan,state){
    PREV_REBUILD.call(this,map,titan,state);
    if(ext(map))applyWorld(this,map);
  };

  World.prototype.render=function(time,ctx){
    if(ctx&&ext(ctx.map)){
      const id=(ctx.map.id||ctx.map.name||ctx.map.titanId)+'|'+ctx.map.titanId;
      if(this.__v120ForcedMap!==id){
        this.__v120ForcedMap=id;
        this.buildKey='';
      }
    }
    return PREV_RENDER.call(this,time,ctx);
  };

  World.prototype.updatePlayer=function(state,time,delta){
    PREV_UPDATE_PLAYER.call(this,state,time,delta);
    if(this.navMap&&ext(this.navMap)&&this.player){
      const goal=this.player.position.clone().add(new THREE.Vector3(0,5.25,7.8));
      this.camera.position.lerp(goal,1-Math.exp(-delta*5.5));
      const look=this.player.position.clone().add(new THREE.Vector3(0,1.05,-3.9));
      this.cameraLook.lerp(look,1-Math.exp(-delta*7));
      this.camera.lookAt(this.cameraLook);
    }
  };

  console.info('[Driftbound v120] world foundation active: forced first rebuild, giant canopy, dense grass, saturated terrain.');
})();
