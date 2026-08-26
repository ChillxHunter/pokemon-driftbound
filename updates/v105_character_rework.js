/* Pokémon: Driftbound v105 — natural jog + distinct uploaded Trainer NPC models. */
(function(){
  'use strict';
  const THREE=window.THREE,World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  /* ------------------------------------------------------------------
     Player locomotion
     A softer modern Pokémon-style jog: flexed knees, shorter arm swing,
     better recovery leg, quieter upper body, and less robotic symmetry.
  ------------------------------------------------------------------ */
  World.prototype.animateCalem=function(jogging,phase,frameDelta,speedBlend=0,turnLean=0){
    if(!this.player?.userData?.bones)return;
    const d=this.player.userData,b=d.bones;
    const set=(name,axis,offset)=>{const bone=b[name];if(bone)bone.object.rotation[axis]=bone.base[axis]+offset;};
    const clamp=(v,a=0,z=1)=>Math.max(a,Math.min(z,v));

    d.jogBlend=THREE.MathUtils.lerp(d.jogBlend||0,jogging?1:0,1-Math.exp(-frameDelta*(jogging?8.5:6.5)));
    d.motionClock=(d.motionClock||0)+frameDelta;
    const blend=clamp(d.jogBlend||0),speed=clamp(speedBlend);

    // A real jog needs a quicker cadence than the old sliding walk.
    const g=phase*(1.56+.12*speed);
    const s=Math.sin(g),c=Math.cos(g),twice=Math.cos(g*2);
    const leftRecovery=clamp(-s),rightRecovery=clamp(s);
    const leftPlant=clamp(s),rightPlant=clamp(-s);
    const bob=(.5-.5*twice)*blend;
    const side=c*blend;
    const stride=(.43+.055*speed)*blend;
    const idleBreath=Math.sin(d.motionClock*1.45)*(1-blend);

    set('Hips','x',(.018+bob*.010)*blend);
    set('Hips','y',-s*.010*blend);
    set('Hips','z',side*.006);
    set('LThigh','y', s*stride);
    set('RThigh','y',-s*stride);
    set('LLeg','y',(.115+leftRecovery*.48+leftPlant*.035)*blend);
    set('RLeg','y',(.115+rightRecovery*.48+rightPlant*.035)*blend);
    set('LFoot','y',(-leftRecovery*.17+leftPlant*.075)*blend);
    set('RFoot','y',(-rightRecovery*.17+rightPlant*.075)*blend);
    set('LFoot','z',(leftPlant*.010-leftRecovery*.004)*blend);
    set('RFoot','z',(-rightPlant*.010+rightRecovery*.004)*blend);

    const arm=s*(.155+.025*speed)*blend;
    const elbowL=(.285+leftPlant*.035+leftRecovery*.060)*blend;
    const elbowR=(.285+rightPlant*.035+rightRecovery*.060)*blend;
    set('LShoulder','y', arm*.018);
    set('RShoulder','y',-arm*.018);
    set('LShoulder','x',-.004*blend);
    set('RShoulder','x',-.004*blend);
    set('LShoulder','z', turnLean*.002);
    set('RShoulder','z', turnLean*.002);
    set('LArmA','y',-arm);
    set('RArmA','y', arm);
    set('LArmA','x',-.010*blend);
    set('RArmA','x', .010*blend);
    set('LArmA','z', side*.0015);
    set('RArmA','z',-side*.0015);
    set('LArmB','y', arm*.008);
    set('RArmB','y',-arm*.008);
    set('LForeArm','y',-elbowL);
    set('RForeArm','y',-elbowR);
    set('LForeArm','z', .003*blend);
    set('RForeArm','z',-.003*blend);
    set('LHand','y',0);
    set('RHand','y',0);

    const twist=s*.012*blend;
    set('Spine2','y', twist);
    set('Spine3','y', twist*.58);
    set('Spine2','x',(.033+bob*.003)*blend+idleBreath*.003);
    set('Spine3','x',.015*blend);
    set('Spine2','z',-side*.002-turnLean*.0030);
    set('Spine3','z',-side*.0014-turnLean*.0020);
    set('Head','y',-twist*.22);
    set('Head','x',-bob*.0015-idleBreath*.0014);
    set('Head','z',turnLean*.0012);

    set('BagA','y',-Math.sin(g-.48)*.017*blend);
    set('BagB','y',-Math.sin(g-.70)*.011*blend);
    set('BagC','x', Math.sin(g-.92)*.0045*blend);
    set('BagD','x', Math.sin(g-1.10)*.0030*blend);

    d.modelRoot.position.x=d.modelBaseX+side*.0025;
    d.modelRoot.position.y=d.modelBaseY-.010*blend+bob*.0085+idleBreath*.0025;
    d.modelRoot.position.z=d.modelBaseZ;
    d.modelRoot.rotation.y=d.modelBaseRotationY+twist*.08;
    d.modelRoot.rotation.x=d.modelBaseRotationX+.006*blend;
    d.modelRoot.rotation.z=side*.001-turnLean*.0035;
  };

  const PREV_MAKE_LANDMARK=World.prototype.makeLandmark;
  const PREV_UPDATE_ANIMATIONS=World.prototype.updateAnimations;
  const HUMAN_TYPES=new Set(['trainer','rival','elite','nurse','clerk','professor','gymGuide','gymLeader','npc']);

  function className(o){
    return o.trainerClass||String(o.name||'Trainer').replace(/\s+[A-Z][a-z]+$/,'')||'Trainer';
  }
  function modelKey(o){
    const cls=className(o);
    if(o.type==='nurse')return 'nurse';
    if(o.type==='professor'||/Scientist/.test(cls))return window.DRIFTBOUND_TRAINER_MODELS?.scientist?'scientist':'worker';
    if(/Hiker|Black Belt/.test(cls))return window.DRIFTBOUND_TRAINER_MODELS?.hiker?'hiker':'worker';
    if(/Worker|Firefighter|Janitor/.test(cls))return 'worker';
    if(/Fisher|Swimmer/.test(cls))return window.DRIFTBOUND_TRAINER_MODELS?.fisherman?'fisherman':'rising_male';
    if(/Lass|Picnicker|Beauty|Breeder|Dancer|Punk Girl|Preschooler \(Girl\)/.test(cls))return 'lass';
    if(/Ace Trainer|Veteran|Elite/.test(cls)||o.type==='gymLeader')return 'ace_female';
    if(/Youngster|Preschooler \(Boy\)|Black Belt/.test(cls))return 'youngster';
    if(/Rising Star|Backpacker|Sightseer|Collector|Gentleman|Cook|Police|Punk/.test(cls))return 'rising_male';
    if(o.type==='clerk'||o.type==='gymGuide'||o.type==='rival')return 'rising_male';
    if(o.type==='npc')return (String(o.name||'').length%2)?'lass':'rising_male';
    return 'youngster';
  }
  function bytesFromB64(s){const raw=atob(s),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
  function decodeSimple(data){
    const pb=bytesFromB64(data.p),cb=bytesFromB64(data.c),ib=bytesFromB64(data.i);
    const pdv=new DataView(pb.buffer,pb.byteOffset,pb.byteLength),idv=new DataView(ib.buffer,ib.byteOffset,ib.byteLength);
    const count=data.count||0,min=data.min,max=data.max;
    const pos=new Float32Array(count*3),col=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      for(let a=0;a<3;a++){
        const q=pdv.getInt16((i*3+a)*2,true),t=(q+32767)/65534;
        pos[i*3+a]=min[a]+t*(max[a]-min[a]);
        col[i*3+a]=cb[i*4+a]/255;
      }
    }
    const indexCount=(data.faces||0)*3,idx=data.i32?new Uint32Array(indexCount):new Uint16Array(indexCount);
    for(let i=0;i<indexCount;i++)idx[i]=data.i32?idv.getUint32(i*4,true):idv.getUint16(i*2,true);
    return {pos,col,idx};
  }
  World.prototype.makeV105TrainerModel=function(key){
    const data=window.DRIFTBOUND_TRAINER_MODELS?.[key];
    if(!data)return null;
    const root=new THREE.Group();
    root.name='UploadedTrainer:'+key;
    const d=decodeSimple(data),geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(d.pos,3));
    geo.setAttribute('color',new THREE.BufferAttribute(d.col,3));
    geo.setIndex(new THREE.BufferAttribute(d.idx,1));
    geo.computeVertexNormals();geo.computeBoundingSphere();
    const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:0,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=true;root.add(mesh);
    root.scale.setScalar(data.scale||.012);
    root.userData.v105Trainer=true;
    return root;
  };

  World.prototype.makeLandmark=function(o,titanId,p,state){
    if(!HUMAN_TYPES.has(o.type))return PREV_MAKE_LANDMARK.call(this,o,titanId,p,state);
    const key=modelKey(o);
    let npc=this.makeV105TrainerModel(key);
    if(npc&&(key==='rising_male'||key==='hiker'))npc.rotation.y=Math.PI;
    if(!npc&&this.makeClassicTrainer){
      npc=this.makeClassicTrainer(o.color||'#557ead',o.accent||p?.accent||'#e2c55e',!!o.female);
      npc.scale.setScalar(1.05);
    }
    if(!npc)return PREV_MAKE_LANDMARK.call(this,o,titanId,p,state);
    const root=new THREE.Group();root.add(npc);
    const angles={up:0,down:Math.PI,left:Math.PI/2,right:-Math.PI/2};
    root.rotation.y=angles[o.dir||'down']??Math.PI;
    if(o.defeated&&this.makeTextPlane){
      const mark=this.makeTextPlane('✓','#d9f7d6');mark.position.set(.30,1.92,0);mark.scale.multiplyScalar(.20);root.add(mark);
    }
    root.position.copy(this.gridPosition(o.x,o.y,.38));
    this.worldRoot.add(root);
    this.__v105Humans??=[];
    this.__v105Humans.push({root,npc,baseY:root.position.y,phase:((o.x||0)*.41+(o.y||0)*.23+String(o.name||'').length*.17)%6.283});
  };

  World.prototype.updateAnimations=function(time){
    PREV_UPDATE_ANIMATIONS.call(this,time);
    if(!this.__v105Humans?.length)return;
    this.__v105Humans=this.__v105Humans.filter(e=>e.root?.parent);
    const t=time*.001;
    for(const e of this.__v105Humans){
      const ph=t*.72+e.phase;
      e.root.position.y=e.baseY+Math.sin(ph)*.0035;
      e.npc.rotation.z=Math.sin(ph*.61)*.0030;
      e.npc.rotation.y+=Math.sin(ph*.43)*.00003;
    }
  };

  window.__DRIFTBOUND_V105__={version:105,trainerModels:true,naturalJog:true,source:'user-supplied trainer pack'};
})();
