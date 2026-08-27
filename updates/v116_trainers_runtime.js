/* Pokémon: Driftbound v116 — real trainer model runtime + natural idle animation. */
(function(){
  'use strict';
  const THREE=window.THREE;
  if(!THREE)return;

  const DATA=window.__DRIFTBOUND_TRAINER_DATA_V116__||(window.__DRIFTBOUND_TRAINER_DATA_V116__={});
  const cache=new Map();

  function bytesFromB64(text){
    const raw=atob(text),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  async function ungzip(text){
    const bytes=bytesFromB64(text);
    if(typeof DecompressionStream!=='function')throw new Error('This browser does not support trainer model decompression.');
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  }
  function decodeBinary(bytes,key){
    const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    if(String.fromCharCode(bytes[0],bytes[1],bytes[2],bytes[3])!=='DBM4')throw new Error(`Bad v116 trainer model: ${key}`);
    const n=dv.getUint16(4,true),ni=dv.getUint16(6,true),scale=dv.getUint16(8,true)||12000;
    let off=10;
    function pose(){
      const a=new Float32Array(n*3);
      for(let i=0;i<a.length;i++,off+=2)a[i]=dv.getInt16(off,true)/scale;
      return a;
    }
    const idle0=pose(),idle1=pose(),throwPose=pose();
    const color=new Float32Array(n*3);
    for(let i=0;i<color.length;i++,off++)color[i]=bytes[off]/255;
    const index=new Uint16Array(ni);
    for(let i=0;i<ni;i++,off+=2)index[i]=dv.getUint16(off,true);

    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(idle0,3));
    geo.setAttribute('color',new THREE.BufferAttribute(color,3));
    geo.setIndex(new THREE.BufferAttribute(index,1));
    geo.morphAttributes.position=[
      new THREE.BufferAttribute(idle1,3),
      new THREE.BufferAttribute(throwPose,3)
    ];
    geo.morphTargetsRelative=false;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const material=new THREE.MeshStandardMaterial({
      vertexColors:true,roughness:.79,metalness:0,side:THREE.DoubleSide,flatShading:true
    });
    return {geo,material,key};
  }
  async function asset(key){
    if(cache.has(key))return cache.get(key);
    const promise=(async()=>{
      const text=DATA[key]||DATA.rising_male||DATA.youngster;
      if(!text)throw new Error(`Missing v116 trainer asset ${key}`);
      return decodeBinary(await ungzip(text),key);
    })().catch(error=>{console.error('v116 trainer decode failed',key,error);return null});
    cache.set(key,promise);
    return promise;
  }

  function classText(o){return String(o?.trainerClass||o?.name||o?.label||'').toLowerCase()}
  function keyFor(o){
    o=o||{};
    const c=classText(o);
    if(o.type==='nurse')return 'center_lady';
    if(o.type==='professor'||c.includes('scientist'))return 'scientist';
    if(o.type==='clerk'||c.includes('worker'))return 'worker';
    if(o.type==='gymGuide'||c.includes('police'))return 'police';
    if(o.type==='gymLeader'||o.type==='elite')return o.female===false?'ace_male':'ace_female';
    if(o.type==='rival')return 'ace_male';
    if(c.includes('youngster'))return 'youngster';
    if(c.includes('picnicker')||c.includes('lass')||c.includes('skier'))return 'lass';
    if(c.includes('hiker'))return 'hiker';
    if(c.includes('backpacker'))return 'backpacker';
    if(c.includes('fisher'))return 'gentleman';
    if(c.includes('swimmer'))return 'swimmer_male';
    if(c.includes('hex')||c.includes('punk'))return 'punk_girl';
    if(c.includes('pokéfan')||c.includes('pokefan')||c.includes('sightseer'))return 'sightseer_female';
    if(c.includes('ace trainer'))return o.female?'ace_female':'ace_male';
    if(c.includes('gentleman'))return 'gentleman';
    if(c.includes('worker'))return 'worker';
    if(c.includes('police'))return 'police';
    if(o.type==='npc'){
      const choices=['lass','rising_male','gentleman','sightseer_female','youngster'];
      const seed=Math.abs(((o.x||0)*31+(o.y||0)*17+String(o.name||'').length));
      return choices[seed%choices.length];
    }
    return o.female?'rising_male':'youngster';
  }

  function makeModel(key,options={}){
    const root=new THREE.Group();
    root.name=`V116TrainerModel:${key}`;
    root.userData.v116TrainerRoot=true;
    root.userData.v116TrainerKey=key;
    root.userData.phase=Number(options.phase)||0;
    root.userData.throwAmount=0;
    root.userData.idleEnabled=options.idle!==false;
    root.userData.ready=false;
    const shadow=new THREE.Mesh(
      new THREE.CircleGeometry(.30,20),
      new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.18,depthWrite:false})
    );
    shadow.rotation.x=-Math.PI/2;shadow.position.y=.006;root.add(shadow);
    asset(key).then(a=>{
      if(!a||!root.parent&&options.requireParent)return;
      const mesh=new THREE.Mesh(a.geo,a.material);
      mesh.name='V116TrainerBody';
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
      mesh.rotation.y=Math.PI;
      mesh.morphTargetInfluences=[0,0];
      root.add(mesh);root.userData.body=mesh;root.userData.ready=true;
    });
    return root;
  }

  function animateModel(root,time,throwAmount=null){
    if(!root?.userData?.v116TrainerRoot)return;
    const body=root.userData.body;
    if(!body?.morphTargetInfluences)return;
    const t=(Number(time)||performance.now())*.001;
    const phase=root.userData.phase||0;
    const throwV=throwAmount==null?(root.userData.throwAmount||0):throwAmount;
    if(throwV>.001){
      body.morphTargetInfluences[0]=0;
      body.morphTargetInfluences[1]=Math.max(0,Math.min(1,throwV));
      return;
    }
    body.morphTargetInfluences[1]=0;
    body.morphTargetInfluences[0]=root.userData.idleEnabled===false?0:(.5+.5*Math.sin(t*1.18+phase));
  }

  function spawnWorldNpc(world,o){
    const key=keyFor(o);
    const root=makeModel(key,{phase:((o.x||0)*.43+(o.y||0)*.29)%6.283,requireParent:true});
    root.userData.v116WorldNpc=true;
    root.userData.sourceObject=o;
    const angles={up:0,down:Math.PI,left:Math.PI/2,right:-Math.PI/2};
    root.rotation.y=angles[o.dir||'down']??Math.PI;
    root.position.copy(world.gridPosition(o.x,o.y,.38));
    if(o.defeated){
      const mark=world.makeTextPlane('✓','#d9f7d6');
      mark.position.set(.28,1.82,0);mark.scale.multiplyScalar(.2);root.add(mark);
    }
    world.worldRoot.add(root);
    return root;
  }

  function updateWorld(world,time){
    world?.worldRoot?.traverse?.(o=>{
      if(!o.userData?.v116WorldNpc)return;
      animateModel(o,time);
      const base=o.userData.v116BaseY??(o.userData.v116BaseY=o.position.y);
      o.position.y=base+Math.sin((Number(time)||0)*.00072+(o.userData.phase||0))*.006;
    });
  }

  window.__DRIFTBOUND_TRAINERS_V116__={
    version:116,keys:Object.keys(DATA),keyFor,makeModel,animateModel,spawnWorldNpc,updateWorld,asset
  };
})();
