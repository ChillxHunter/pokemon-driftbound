/* Pokémon: Driftbound v92 — stable green vegetation + richer original trainer archetypes. */
(function(){
  'use strict';
  const THREE=window.THREE,World=window.DriftboundWorld3D;if(!THREE||!World)return;
  const ROWS=40,COLS=60;
  const V91_MAKE_LANDMARK=World.prototype.makeLandmark;
  const V91_UPDATE_ANIMATIONS=World.prototype.updateAnimations;
  const V91_RENDER=World.prototype.render;

  function windMaterial(color,{strength=.045,speed=1.35,roughness=.95,side=THREE.DoubleSide}={}){
    const mat=new THREE.MeshStandardMaterial({color,roughness,metalness:0,side});
    mat.onBeforeCompile=shader=>{
      shader.uniforms.uV92Time={value:0};shader.uniforms.uV92Strength={value:strength};shader.uniforms.uV92Speed={value:speed};
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uV92Time;\nuniform float uV92Strength;\nuniform float uV92Speed;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`vec3 transformed = vec3(position);\n#ifdef USE_INSTANCING\nvec3 v92Origin = vec3(instanceMatrix[3].xyz);\n#else\nvec3 v92Origin = vec3(0.0);\n#endif\nfloat v92Top = clamp(position.y*2.2,0.0,1.0);\nfloat v92Wave = sin(uV92Time*uV92Speed + v92Origin.x*.68 + v92Origin.z*.91);\nfloat v92Gust = sin(uV92Time*.43 + v92Origin.z*.37)*.35;\ntransformed.x += (v92Wave+v92Gust)*uV92Strength*v92Top;\ntransformed.z += cos(uV92Time*uV92Speed*.72 + v92Origin.x*.55)*uV92Strength*.28*v92Top;`);
      mat.userData.v92Shader=shader;
    };
    mat.customProgramCacheKey=()=>`v92wind-${color}-${strength}-${speed}`;
    return mat;
  }

  function addInstanced(root,geometry,material,matrices,{cast=false,receive=true}={}){
    if(!matrices.length)return null;
    const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);mesh.castShadow=cast;mesh.receiveShadow=receive;
    matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;root.add(mesh);return mesh;
  }
  function composeMatrix(pos,rotY=0,scale=[1,1,1],rotZ=0){const o=new THREE.Object3D();o.position.copy(pos);o.rotation.set(0,rotY,rotZ);o.scale.set(scale[0],scale[1],scale[2]);o.updateMatrix();return o.matrix.clone();}

  World.prototype.makeTerrainDetails=function(map,p){
    const rand=this.seed(this.hash(`v92-green-world-${map.areaId||map.titanId}`));
    const trees=[],rocks=[],grass=[];
    const treeBiomes=new Set(['town','plains','forest','route','lake','coast','snow','graveyard','league']);
    for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){
      const tile=map.tiles?.[y]?.[x];
      if(tile==='obstacle'){
        if(treeBiomes.has(map.biome))trees.push([x,y,rand()]);else rocks.push([x,y,rand()]);
      }else if(tile==='grass')grass.push([x,y]);
    }
    this.__v92WindMaterials=[];

    if(grass.length){
      const geo=new THREE.PlaneGeometry(.075,.48,1,2);geo.translate(0,.24,0);
      const palettes=map.biome==='snow'?['#7faa8d','#a1c4a9']:map.biome==='graveyard'?['#4e6752','#657b63']:map.biome==='coast'?['#4f9a52','#70b76c']:['#3f8d46','#64ad5e'];
      const mats=palettes.map((c,i)=>windMaterial(c,{strength:.07-i*.01,speed:1.45+i*.18}));this.__v92WindMaterials.push(...mats);
      const matrices=[[],[]],perTile=map.biome==='forest'?7:5;
      for(const [x,y] of grass)for(let b=0;b<perTile;b++){
        const pos=this.gridPosition(x+(rand()-.5)*.8,y+(rand()-.5)*.8,.37);
        const s=.72+rand()*.55,idx=(b+x+y)&1;
        matrices[idx].push(composeMatrix(pos,rand()*Math.PI,[s,.75+rand()*.55,s],(rand()-.5)*.11));
      }
      addInstanced(this.worldRoot,geo,mats[0],matrices[0],{cast:false,receive:true});
      addInstanced(this.worldRoot,geo,mats[1],matrices[1],{cast:false,receive:true});
    }

    if(trees.length){
      const snow=map.biome==='snow',dead=map.biome==='graveyard',palm=map.biome==='coast';
      const trunkGeo=new THREE.CylinderGeometry(.14,.24,1.72,9,1),trunkMat=new THREE.MeshStandardMaterial({color:dead?'#5c5149':palm?'#8a6947':'#74553b',roughness:1});
      const trunkMatrices=[];const canopyMatrices=[[],[],[]];
      const canopyColors=snow?['#88aa98','#a9c5b5','#d0ded5']:dead?['#59665d','#677269','#4d5b53']:palm?['#3d8d55','#50a362','#67b773']:['#2e7241','#438d50','#5aa260'];
      const sphereGeo=new THREE.SphereGeometry(.58,10,7);
      const palmGeo=new THREE.ConeGeometry(.15,.95,5);
      for(const [x,y,r] of trees){
        const base=this.gridPosition(x,y,.37),scale=.86+r*.3;
        trunkMatrices.push(composeMatrix(new THREE.Vector3(base.x,base.y+.86*scale,base.z),r*Math.PI*2,[scale,scale,scale],(r-.5)*.025));
        if(palm){
          for(let k=0;k<7;k++){
            const angle=k/7*Math.PI*2+r*Math.PI,idx=k%3;
            const pos=new THREE.Vector3(base.x,base.y+1.75*scale,base.z);
            const o=new THREE.Object3D();o.position.copy(pos);o.rotation.set(0,angle,Math.PI/2-.18);o.scale.set(scale*.88,scale,scale*.88);o.updateMatrix();canopyMatrices[idx].push(o.matrix.clone());
          }
        }else if(dead){
          const offsets=[[0,1.62,0],[-.28,1.45,.03],[.28,1.46,-.02]];
          offsets.forEach((off,k)=>canopyMatrices[k%3].push(composeMatrix(new THREE.Vector3(base.x+off[0]*scale,base.y+off[1]*scale,base.z+off[2]*scale),r*Math.PI*2,[scale*.65,scale*.55,scale*.65])));
        }else{
          const offsets=[[0,1.68,0],[-.36,1.48,.03],[.36,1.49,.04],[-.18,1.78,-.19],[.19,1.75,.18],[0,1.42,.27]];
          offsets.forEach((off,k)=>{
            const idx=k%3,sx=scale*(.82+(k%2)*.12),sy=scale*(.78+(k%3)*.07),sz=scale*(.84+(k%2)*.08);
            canopyMatrices[idx].push(composeMatrix(new THREE.Vector3(base.x+off[0]*scale,base.y+off[1]*scale,base.z+off[2]*scale),r*Math.PI*2+k*.31,[sx,sy,sz]));
          });
        }
      }
      addInstanced(this.worldRoot,trunkGeo,trunkMat,trunkMatrices,{cast:false,receive:true});
      canopyColors.forEach((color,i)=>{
        const mat=windMaterial(color,{strength:palm?.028:.018,speed:.75+i*.08,side:THREE.FrontSide});this.__v92WindMaterials.push(mat);
        addInstanced(this.worldRoot,palm?palmGeo:sphereGeo,mat,canopyMatrices[i],{cast:false,receive:true});
      });
    }

    if(rocks.length){
      const geo=new THREE.DodecahedronGeometry(.46,0),mat=new THREE.MeshStandardMaterial({color:map.biome==='cave'?'#58616b':'#746b63',roughness:1}),matrices=[];
      for(const [x,y,r] of rocks){const pos=this.gridPosition(x,y,.53);matrices.push(composeMatrix(pos,r*Math.PI*2,[.8+r*.4,.55+r*.5,.82+r*.35],(r-.5)*.18));}
      addInstanced(this.worldRoot,geo,mat,matrices,{cast:false,receive:true});
    }

    if(['plains','forest','town','route'].includes(map.biome)){
      const flowerGeo=new THREE.SphereGeometry(.035,6,4),flowerMat=new THREE.MeshBasicMaterial({color:'#f6d36b'}),flowerMatrices=[];
      for(let i=0;i<Math.min(90,grass.length);i++)if(rand()<.5){const [x,y]=grass[Math.floor(rand()*grass.length)]||[30,20],pos=this.gridPosition(x+(rand()-.5)*.8,y+(rand()-.5)*.8,.55);flowerMatrices.push(composeMatrix(pos,0,[1,1,1]));}
      addInstanced(this.worldRoot,flowerGeo,flowerMat,flowerMatrices,{cast:false,receive:false});
    }
  };

  function mat(color,rough=.86){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:0});}
  function mesh(geo,material){const m=new THREE.Mesh(geo,material);m.castShadow=false;m.receiveShadow=true;return m;}
  function trainerClass(o){return o.trainerClass||String(o.name||'').split(' ').slice(0,-1).join(' ')||'Trainer';}

  World.prototype.makeV92Trainer=function(o,p){
    const cls=trainerClass(o),female=!!o.female,g=new THREE.Group();
    const skin=mat('#e8b58d'),dark=mat('#27313a'),shoe=mat('#25282e');
    let shirt='#4f7db5',pants='#37485d',accent='#f0d26b',hair=female?'#5b4034':'#46362f';
    if(/Hiker/.test(cls)){shirt='#c7794d';pants='#5f5546';accent='#6f8b58';hair='#684a34';}
    else if(/Fisherman|Swimmer/.test(cls)){shirt='#4c91bd';pants='#315c7b';accent='#f4d76c';}
    else if(/Scientist/.test(cls)){shirt='#f0f0ea';pants='#465b69';accent='#6ab0c4';}
    else if(/Hex Maniac/.test(cls)){shirt='#6d507f';pants='#3f3649';accent='#c99dde';hair='#382d45';}
    else if(/Ace Trainer|Rising Star|Veteran/.test(cls)){shirt='#405f94';pants='#2d374d';accent='#e5c76c';}
    else if(/Lass|Beauty|Picnicker/.test(cls)){shirt='#d66f91';pants='#6e5573';accent='#f6d7a0';hair='#6a4635';}
    else if(/Black Belt/.test(cls)){shirt='#f3eee1';pants='#292d31';accent='#2f3235';}
    else if(/Punk/.test(cls)){shirt='#2e3139';pants='#4b3b58';accent='#dc5a82';hair='#3b243d';}
    else if(/Worker/.test(cls)){shirt='#d69a45';pants='#4d5860';accent='#f1d14b';}
    else if(/Gentleman/.test(cls)){shirt='#3f4a56';pants='#30363e';accent='#c7a76d';}

    const shirtMat=mat(shirt),pantsMat=mat(pants),accentMat=mat(accent),hairMat=mat(hair);
    const torso=mesh(new THREE.BoxGeometry(.42,.52,.25),shirtMat);torso.position.y=.86;g.add(torso);
    [-.11,.11].forEach((x,i)=>{const leg=mesh(new THREE.CylinderGeometry(.065,.078,.5,8),pantsMat);leg.position.set(x,.31,0);g.add(leg);const boot=mesh(new THREE.BoxGeometry(.17,.12,.27),shoe);boot.position.set(x,.06,.05);g.add(boot);const arm=mesh(new THREE.CylinderGeometry(.048,.058,.48,8),skin);arm.position.set(i?-.245:.245,.84,.01);arm.rotation.z=i?.16:-.16;g.add(arm);});
    const head=mesh(new THREE.SphereGeometry(.19,14,10),skin);head.position.y=1.27;g.add(head);
    const hairCap=mesh(new THREE.SphereGeometry(.197,14,8,0,Math.PI*2,0,Math.PI*.54),hairMat);hairCap.position.y=1.32;g.add(hairCap);
    const band=mesh(new THREE.BoxGeometry(.43,.055,.26),accentMat);band.position.set(0,.96,.135);g.add(band);

    if(/Youngster|Ace Trainer|Rising Star/.test(cls)){const cap=mesh(new THREE.CylinderGeometry(.205,.205,.09,14),accentMat);cap.position.y=1.43;g.add(cap);const brim=mesh(new THREE.BoxGeometry(.25,.035,.19),accentMat);brim.position.set(0,1.41,-.15);g.add(brim);}
    if(/Hiker|Backpacker/.test(cls)){const pack=mesh(new THREE.BoxGeometry(.38,.46,.18),mat('#6b774f'));pack.position.set(0,.87,.22);g.add(pack);const brim=mesh(new THREE.CylinderGeometry(.27,.27,.05,14),mat('#82694d'));brim.position.y=1.44;g.add(brim);}
    if(/Scientist/.test(cls)){const coat=mesh(new THREE.BoxGeometry(.47,.64,.265),mat('#f7f7f0'));coat.position.y=.8;coat.position.z=.01;g.add(coat);const glass=mesh(new THREE.BoxGeometry(.29,.045,.035),mat('#8ec0d2'));glass.position.set(0,1.29,-.18);g.add(glass);}
    if(/Fisherman/.test(cls)){const hat=mesh(new THREE.CylinderGeometry(.25,.28,.11,14),mat('#d5b565'));hat.position.y=1.43;g.add(hat);const rod=mesh(new THREE.CylinderGeometry(.018,.018,1.25,6),mat('#5f4b39'));rod.rotation.z=-.45;rod.position.set(.36,.75,0);g.add(rod);}
    if(/Black Belt/.test(cls)){const belt=mesh(new THREE.BoxGeometry(.45,.07,.27),mat('#202225'));belt.position.y=.72;g.add(belt);}
    if(/Beauty|Lass|Picnicker/.test(cls)){const hairBack=mesh(new THREE.SphereGeometry(.18,12,8),hairMat);hairBack.scale.set(.95,1.5,.75);hairBack.position.set(0,1.18,.13);g.add(hairBack);}
    if(/Punk/.test(cls)){const spike=mesh(new THREE.ConeGeometry(.10,.28,6),mat('#7c4a8f'));spike.position.y=1.56;g.add(spike);}
    if(/Police/.test(cls)){const cap=mesh(new THREE.CylinderGeometry(.21,.21,.08,12),mat('#2f4e78'));cap.position.y=1.44;g.add(cap);}

    g.scale.setScalar(1.08);return g;
  };

  World.prototype.makeLandmark=function(o,titanId,p,state){
    if(['trainer','rival','elite','nurse','clerk','professor','gymGuide','gymLeader','npc'].includes(o.type)){
      const g=new THREE.Group();g.add(this.makeV92Trainer(o,p));
      const angles={up:0,down:Math.PI,left:Math.PI/2,right:-Math.PI/2};g.rotation.y=angles[o.dir||'down']??Math.PI;
      if(o.defeated){const bubble=this.makeTextPlane('✓','#d9f6d2');bubble.position.set(.30,1.82,0);bubble.scale.multiplyScalar(.22);g.add(bubble);}
      g.position.copy(this.gridPosition(o.x,o.y,.38));this.worldRoot.add(g);return;
    }
    return V91_MAKE_LANDMARK.call(this,o,titanId,p,state);
  };

  World.prototype.updateAnimations=function(time){
    V91_UPDATE_ANIMATIONS.call(this,time);
    const secs=time*.001;for(const material of this.__v92WindMaterials||[]){const s=material.userData?.v92Shader;if(s?.uniforms?.uV92Time)s.uniforms.uV92Time.value=secs;}
  };

  World.prototype.render=function(time,args){
    if(!this.__v92RendererTuned){
      this.__v92RendererTuned=true;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.0));
      this.renderer.shadowMap.type=THREE.BasicShadowMap;
      this.renderer.outputEncoding=THREE.sRGBEncoding;
      this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.06;
      this.resize();
    }
    return V91_RENDER.call(this,time,args);
  };
})();
