/* Pokémon: Driftbound v119 — Living World visual overhaul.
   Exterior-only. Intentionally does NOT touch battles, battle UI, battle logic or audio/music. */
(function(){
  'use strict';
  const THREE=window.THREE;
  const World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  const PREV_REBUILD=World.prototype.rebuild;
  const PREV_OBSTACLE=World.prototype.makeObstacle;
  const PREV_GRASS=World.prototype.makeGrassPatch;

  const palette={
    verdant:{sky:'#69c8ff',fog:'#b9e8cf',grass:'#238c42',grass2:'#48b95f',leaf:'#247e3b',leaf2:'#46a64d',trunk:'#5c3a24',flower:['#fff2a8','#f39ac6','#ffffff','#a9c8ff','#ff8f72']},
    cinder:{sky:'#f4aa72',fog:'#c88262',grass:'#8b6537',grass2:'#b28948',leaf:'#887037',leaf2:'#a98c42',trunk:'#4a3028',flower:['#ffcc66','#ff845f','#f3d8a1']},
    tide:{sky:'#75d9ef',fog:'#b9f2e5',grass:'#228b79',grass2:'#54c0a2',leaf:'#2a8f71',leaf2:'#56b98a',trunk:'#5b5a3a',flower:['#ffb5b0','#ffe092','#c7f7ff']},
    frost:{sky:'#acdff4',fog:'#e3f7f8',grass:'#b7ded7',grass2:'#d5efea',leaf:'#7eb5aa',leaf2:'#b1d7ce',trunk:'#756b64',flower:['#ffffff','#b8ddff','#d8c8ff']},
    dusk:{sky:'#6e6397',fog:'#6e6687',grass:'#4d456f',grass2:'#786397',leaf:'#403b64',leaf2:'#665783',trunk:'#3d3043',flower:['#cfa7ff','#8cb7ff','#ff92d1']},
    sky:{sky:'#8fd8ff',fog:'#d8f1f5',grass:'#8bcbb6',grass2:'#b0dec9',leaf:'#68ad96',leaf2:'#a2d6ba',trunk:'#6d6751',flower:['#fff5ab','#ffffff','#a9ddff']}
  };

  function mat(color,opts={}){return new THREE.MeshStandardMaterial(Object.assign({color,roughness:.92,metalness:0},opts));}
  function seeded(world,text){return world.seed(world.hash(text));}

  function makeGiantTree(world,p,rand,titanId){
    const c=palette[titanId]||palette.verdant;
    const g=new THREE.Group();
    g.name='V119_GiantTree';
    const h=5.7+rand()*4.5;
    const trunkR=.30+rand()*.20;
    const trunk=world.mesh(new THREE.CylinderGeometry(trunkR*.72,trunkR,h,9),mat(c.trunk,{roughness:1}));
    trunk.position.y=h*.5;g.add(trunk);

    const branchMat=mat(c.trunk,{roughness:1});
    for(let i=0;i<5;i++){
      const len=2.1+rand()*2.2;
      const branch=world.mesh(new THREE.CylinderGeometry(.10,.20,len,7),branchMat);
      branch.position.y=h*(.62+rand()*.24);
      branch.rotation.z=Math.PI/2-(rand()-.5)*.55;
      branch.rotation.y=(i/5)*Math.PI*2+rand()*.45;
      branch.position.x=Math.cos(branch.rotation.y)*.5;
      branch.position.z=Math.sin(branch.rotation.y)*.5;
      g.add(branch);
    }

    const leafMats=[mat(c.leaf,{roughness:1}),mat(c.leaf2,{roughness:1})];
    const canopyY=h*.78;
    const crowns=[
      [0,canopyY,0,2.5],[-1.75,canopyY-.15,.35,1.75],[1.7,canopyY+.15,-.2,1.8],
      [.15,canopyY+.9,1.2,1.7],[-.7,canopyY+.7,-1.45,1.65],[1.25,canopyY-.35,1.3,1.5]
    ];
    crowns.forEach((v,i)=>{
      const crown=world.mesh(new THREE.DodecahedronGeometry(v[3]*(.9+rand()*.24),1),leafMats[i%2],{cast:true,receive:true});
      crown.position.set(v[0],v[1],v[2]);
      crown.scale.set(1.12,.82+rand()*.18,1.08);
      crown.rotation.set(rand()*.12,rand()*Math.PI,rand()*.08);
      g.add(crown);
    });

    for(let i=0;i<5;i++){
      const root=world.mesh(new THREE.CylinderGeometry(.07,.17,1.35+rand()*.55,6),branchMat);
      root.rotation.z=Math.PI/2.55;
      root.rotation.y=i/5*Math.PI*2;
      root.position.set(Math.cos(root.rotation.y)*.45,.18,Math.sin(root.rotation.y)*.45);
      g.add(root);
    }
    return g;
  }

  World.prototype.makeObstacle=function(titanId,p,rand){
    if(titanId==='verdant' && rand()>.18)return makeGiantTree(this,p,rand,titanId);
    return PREV_OBSTACLE.call(this,titanId,p,rand);
  };

  World.prototype.makeGrassPatch=function(titanId,p,rand){
    const c=palette[titanId]||palette.verdant;
    const g=new THREE.Group();g.name='V119_TallGrassPatch';
    const materials=[mat(c.grass,{side:THREE.DoubleSide,roughness:1}),mat(c.grass2,{side:THREE.DoubleSide,roughness:1})];
    const count=titanId==='verdant'?12:8;
    for(let i=0;i<count;i++){
      const height=.62+rand()*.64;
      const blade=this.mesh(new THREE.ConeGeometry(.045+rand()*.025,height,4),materials[i%2],{cast:false,receive:true});
      blade.position.set((rand()-.5)*.9,height*.48,(rand()-.5)*.9);
      blade.rotation.z=(rand()-.5)*.38;
      blade.rotation.y=rand()*Math.PI;
      g.add(blade);
    }
    return g;
  };

  function improveLighting(world,map){
    const c=palette[map.titanId]||palette.verdant;
    if(map.interior||map.roomKind)return;
    world.scene.background=new THREE.Color(c.sky);
    world.scene.fog=new THREE.Fog(c.fog,34,118);
    world.camera.far=180;world.camera.updateProjectionMatrix();
    world.worldRoot.traverse(o=>{
      if(o.isHemisphereLight){o.intensity=.82;o.color.set('#f4fbff');o.groundColor.set(map.titanId==='verdant'?'#48664b':'#55585b');}
      if(o.isDirectionalLight){o.intensity=Math.max(o.intensity,1.05);}
    });
    const fill=new THREE.DirectionalLight(0xbde7ff,.24);fill.position.set(12,10,-14);world.worldRoot.add(fill);
  }

  function addDenseVegetation(world,map){
    if(map.interior||map.roomKind)return;
    const c=palette[map.titanId]||palette.verdant;
    const rand=seeded(world,`v119-vegetation-${map.titanId}-${map.id||map.name||''}`);
    const grassTiles=[];
    const groundTiles=[];
    for(let y=1;y<map.tiles.length-1;y++)for(let x=1;x<map.tiles[y].length-1;x++){
      const t=map.tiles[y][x];
      if(t==='grass')grassTiles.push([x,y]);
      else if(t==='ground'||t==='rough')groundTiles.push([x,y]);
    }

    if(grassTiles.length){
      const bladeGeo=new THREE.ConeGeometry(.035,.9,4);
      bladeGeo.translate(0,.45,0);
      const bladeMat=mat(c.grass,{roughness:1,side:THREE.DoubleSide});
      const perTile=map.titanId==='verdant'?9:5;
      const max=Math.min(grassTiles.length*perTile,2600);
      const inst=new THREE.InstancedMesh(bladeGeo,bladeMat,max);
      inst.name='V119_DenseGrass';inst.castShadow=false;inst.receiveShadow=true;
      const dummy=new THREE.Object3D();
      let n=0;
      outer: for(const [x,y] of grassTiles){
        for(let i=0;i<perTile;i++){
          if(n>=max)break outer;
          const pos=world.gridPosition(x+(rand()-.5)*.82,y+(rand()-.5)*.82,.38);
          dummy.position.set(pos.x,pos.y,pos.z);
          dummy.rotation.set((rand()-.5)*.12,rand()*Math.PI,(rand()-.5)*.22);
          const s=.72+rand()*.72;dummy.scale.set(.8+rand()*.55,s,.8+rand()*.55);
          dummy.updateMatrix();inst.setMatrixAt(n++,dummy.matrix);
        }
      }
      inst.count=n;inst.instanceMatrix.needsUpdate=true;world.worldRoot.add(inst);
    }

    const decorTiles=grassTiles.concat(groundTiles);
    const flowerCount=Math.min(125,Math.floor(decorTiles.length*.34));
    for(let i=0;i<flowerCount;i++){
      const [x,y]=decorTiles[Math.floor(rand()*decorTiles.length)]||[];if(x==null)break;
      const pos=world.gridPosition(x+(rand()-.5)*.8,y+(rand()-.5)*.8,.39);
      const g=new THREE.Group();
      const stem=world.mesh(new THREE.CylinderGeometry(.012,.016,.22+rand()*.22,5),mat('#43844a'),{cast:false,receive:false});stem.position.y=.12;g.add(stem);
      const flowerColor=c.flower[Math.floor(rand()*c.flower.length)];
      const bloom=world.mesh(new THREE.SphereGeometry(.055+rand()*.045,6,4),new THREE.MeshStandardMaterial({color:flowerColor,roughness:.72,emissive:flowerColor,emissiveIntensity:.06}),{cast:false,receive:false});
      bloom.scale.y=.45;bloom.position.y=.28+rand()*.12;g.add(bloom);
      g.position.copy(pos);world.worldRoot.add(g);
    }
  }

  function addWorldScaleScenery(world,map){
    if(map.interior||map.roomKind)return;
    const rand=seeded(world,`v119-horizon-${map.titanId}-${map.id||''}`);
    if(map.titanId==='verdant'||map.titanId==='tide'||map.titanId==='dusk'){
      const ringR=39;
      for(let i=0;i<28;i++){
        const a=(i/28)*Math.PI*2+(rand()-.5)*.08;
        const tree=makeGiantTree(world,{},rand,map.titanId);
        tree.position.set(Math.cos(a)*(ringR+rand()*7),-.4,Math.sin(a)*(ringR*.72+rand()*5));
        tree.scale.multiplyScalar(1.3+rand()*1.3);
        world.worldRoot.add(tree);
      }
    }
    const cliffMat=mat(map.titanId==='verdant'?'#7c7358':map.titanId==='frost'?'#9caeb4':'#6e655f',{roughness:1});
    for(let i=0;i<10;i++){
      const a=(i/10)*Math.PI*2+.2;
      const rock=world.mesh(new THREE.DodecahedronGeometry(3.5+rand()*2.7,1),cliffMat);
      rock.scale.set(1.3+rand()*1.2,1.5+rand()*2.5,.8+rand()*.8);
      rock.position.set(Math.cos(a)*(44+rand()*8),4+rand()*4,Math.sin(a)*(34+rand()*7));
      rock.rotation.y=rand()*Math.PI;world.worldRoot.add(rock);
    }
  }

  function makeGrassPokemonReadable(world,map){
    if(map.interior||map.roomKind)return;
    world.worldRoot.traverse(o=>{
      if(o.userData && (o.userData.wildPokemon||o.userData.pokemonEntity||o.userData.species)){
        o.traverse(ch=>{if(ch.material&&'roughness' in ch.material)ch.material.roughness=Math.min(ch.material.roughness,.72);});
      }
    });
  }

  World.prototype.rebuild=function(map,titan,state){
    PREV_REBUILD.call(this,map,titan,state);
    if(map?.interior||map?.roomKind)return;
    improveLighting(this,map);
    addDenseVegetation(this,map);
    addWorldScaleScenery(this,map);
    makeGrassPokemonReadable(this,map);
  };

  console.info('[Driftbound v119] Living World overhaul loaded — battles/music untouched.');
})();
