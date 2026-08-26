/* Pokémon: Driftbound v93 — modern jog gait + player-quality Trainer NPC rigs. */
(function(){
  'use strict';
  const THREE=window.THREE, World=window.DriftboundWorld3D;
  if(!THREE||!World)return;

  /* ------------------------ Player locomotion ------------------------ */
  World.prototype.animateCalem=function(jogging,phase,frameDelta,speedBlend=0,turnLean=0){
    const d=this.player.userData,b=d.bones;
    const set=(name,axis,offset)=>{const bone=b[name];if(bone)bone.object.rotation[axis]=bone.base[axis]+offset;};

    const response=jogging?9.5:6.0;
    d.jogBlend=THREE.MathUtils.lerp(d.jogBlend||0,jogging?1:0,1-Math.exp(-frameDelta*response));
    d.motionClock=(d.motionClock||0)+frameDelta;
    const blend=Math.max(0,Math.min(1,d.jogBlend||0));
    const speed=Math.max(0,Math.min(1,speedBlend));

    const gaitPhase=phase*(1.34+.16*speed);
    const s=Math.sin(gaitPhase), c=Math.cos(gaitPhase);
    const c2=Math.cos(gaitPhase*2);
    const leftRecovery=Math.max(0,-s);
    const rightRecovery=Math.max(0,s);
    const leftPlant=Math.max(0,s);
    const rightPlant=Math.max(0,-s);
    const pace=.82+.18*speed;

    const vertical=(.5-.5*c2)*blend;
    const lateral=c*blend;
    const torsoTwist=s*blend;
    const idleBreath=Math.sin(d.motionClock*1.55)*(1-blend);

    const thigh=.42*pace;
    set('Hips','y',-torsoTwist*.018);
    set('Hips','z',lateral*.009);
    set('Hips','x',blend*.012+vertical*.004);
    set('LThigh','y',s*thigh*blend);
    set('RThigh','y',-s*thigh*blend);
    set('LLeg','y',(.075+leftRecovery*.43+rightPlant*.025)*blend);
    set('RLeg','y',(.075+rightRecovery*.43+leftPlant*.025)*blend);
    set('LFoot','y',(-leftRecovery*.19+leftPlant*.055)*blend);
    set('RFoot','y',(-rightRecovery*.19+rightPlant*.055)*blend);
    set('LFoot','z',(leftPlant*.015-leftRecovery*.006)*blend);
    set('RFoot','z',(-rightPlant*.015+rightRecovery*.006)*blend);

    const armSwing=s*.245*pace*blend;
    const leftElbow=(.15+leftPlant*.055+leftRecovery*.035)*blend;
    const rightElbow=(.15+rightPlant*.055+rightRecovery*.035)*blend;
    set('LShoulder','y',armSwing*.045);
    set('RShoulder','y',-armSwing*.045);
    set('LShoulder','x',-vertical*.004);
    set('RShoulder','x',-vertical*.004);
    set('LShoulder','z',turnLean*.0025);
    set('RShoulder','z',turnLean*.0025);
    set('LArmA','y',-armSwing);
    set('RArmA','y',armSwing);
    set('LArmA','x',-.008*blend);
    set('RArmA','x',.008*blend);
    set('LArmA','z',lateral*.0025);
    set('RArmA','z',-lateral*.0025);
    set('LArmB','y',armSwing*.018);
    set('RArmB','y',-armSwing*.018);
    set('LForeArm','y',-leftElbow);
    set('RForeArm','y',-rightElbow);
    set('LForeArm','z',.004*blend);
    set('RForeArm','z',-.004*blend);
    set('LHand','y',leftElbow*.01);
    set('RHand','y',rightElbow*.01);

    set('Spine2','y',torsoTwist*.028);
    set('Spine3','y',torsoTwist*.018);
    set('Spine2','x',blend*.025+vertical*.003+idleBreath*.003);
    set('Spine3','x',blend*.012);
    set('Spine2','z',-lateral*.003-turnLean*.0035);
    set('Spine3','z',-lateral*.002-turnLean*.0025);
    set('Head','y',-torsoTwist*.008);
    set('Head','x',-vertical*.002-idleBreath*.0015);
    set('Head','z',turnLean*.0015);

    set('BagA','y',-Math.sin(gaitPhase-.55)*.020*blend);
    set('BagB','y',-Math.sin(gaitPhase-.78)*.014*blend);
    set('BagC','x',Math.sin(gaitPhase-1.0)*.006*blend);
    set('BagD','x',Math.sin(gaitPhase-1.15)*.004*blend);

    d.modelRoot.position.x=d.modelBaseX+lateral*.0035;
    d.modelRoot.position.y=d.modelBaseY-.008*blend+vertical*.011+idleBreath*.003;
    d.modelRoot.position.z=d.modelBaseZ;
    d.modelRoot.rotation.y=d.modelBaseRotationY+torsoTwist*.004;
    d.modelRoot.rotation.x=d.modelBaseRotationX+blend*.004;
    d.modelRoot.rotation.z=lateral*.0015-turnLean*.004;
  };

  /* ---------------------- Player-quality NPC rigs -------------------- */
  const PREV_MAKE_LANDMARK=World.prototype.makeLandmark;
  const PREV_UPDATE_ANIMATIONS=World.prototype.updateAnimations;
  const HUMAN_TYPES=new Set(['trainer','rival','elite','nurse','clerk','professor','gymGuide','gymLeader','npc']);

  function className(o){return o.trainerClass||String(o.name||'Trainer').split(' ').slice(0,-1).join(' ')||'Trainer';}
  function paletteFor(o,p){
    const cls=className(o);
    if(o.type==='nurse')return {top:'#f09bad',hat:'#f7dce4',hair:'#8b5b45',bag:'#f3cad5'};
    if(o.type==='clerk')return {top:'#4386bd',hat:'#2f6598',hair:'#5b4435',bag:'#456b86'};
    if(o.type==='professor')return {top:'#edf1ee',hat:'#dfe7e4',hair:'#747b78',bag:'#667b83'};
    if(o.type==='gymLeader')return {top:p?.accent||'#9261a6',hat:p?.accent||'#805095',hair:'#4d3b39',bag:'#5f5666'};
    if(o.type==='gymGuide')return {top:'#5278a7',hat:'#e2c55e',hair:'#604839',bag:'#4a657f'};
    if(/^Rival /.test(o.name||''))return {top:'#c95155',hat:'#d34e52',hair:'#4a3932',bag:'#4f6475'};
    if(/Hiker|Worker|Backpacker/.test(cls))return {top:'#b87349',hat:'#94724e',hair:'#654b38',bag:'#65704f'};
    if(/Fisher|Swimmer|Sightseer/.test(cls))return {top:'#4d91bb',hat:'#e5c66f',hair:'#4c4138',bag:'#46738c'};
    if(/Hex Maniac|Punk/.test(cls))return {top:'#755781',hat:'#5b4268',hair:'#392f43',bag:'#55445f'};
    if(/Scientist/.test(cls))return {top:'#e8eded',hat:'#cbdfe3',hair:'#555d5e',bag:'#5c7882'};
    if(/Lass|Beauty|Picnicker/.test(cls))return {top:'#d87391',hat:'#e9a1b3',hair:'#744a38',bag:'#8a5d73'};
    if(/Ace Trainer|Veteran|Rising Star/.test(cls))return {top:'#445f91',hat:'#d4b951',hair:'#493932',bag:'#485b72'};
    if(/Black Belt/.test(cls))return {top:'#e7e3d7',hat:'#313439',hair:'#302e2d',bag:'#454545'};
    if(/Gentleman/.test(cls))return {top:'#45515d',hat:'#303943',hair:'#5a493b',bag:'#5a4d43'};
    return {top:'#557ead',hat:'#d65a58',hair:'#554037',bag:'#50677a'};
  }
  function mixed(hex,white=.22){const c=new THREE.Color(hex),w=new THREE.Color('#ffffff');return c.lerp(w,white);}

  World.prototype.makeV93Trainer=function(o,p){
    if(!window.CALEM_XY_MODEL)return null;
    THREE.Cache.enabled=true;
    const npc=this.makeCalemTrainer(window.CALEM_XY_MODEL);
    const colors=paletteFor(o,p),skinMesh=npc.userData.skinnedMesh;
    if(skinMesh){
      const mats=Array.isArray(skinMesh.material)?skinMesh.material:[skinMesh.material];
      skinMesh.material=mats.map(source=>{
        const m=source.clone(),name=String(source.name||'').toLowerCase();
        if(name.includes('tops'))m.color.copy(mixed(colors.top,.18));
        else if(name.includes('hat'))m.color.copy(mixed(colors.hat,.12));
        else if(name.includes('hair'))m.color.copy(mixed(colors.hair,.08));
        else if(name.includes('bag'))m.color.copy(mixed(colors.bag,.12));
        else if(name.includes('shoes'))m.color.set('#d8d8d8');
        else m.color.set('#ffffff');
        return m;
      });
      skinMesh.castShadow=true;skinMesh.receiveShadow=true;skinMesh.frustumCulled=true;
    }
    npc.scale.setScalar(.98);
    npc.userData.v93IdlePhase=((o.x||0)*.37+(o.y||0)*.21+(String(o.name||'').length*.13))%(Math.PI*2);
    npc.userData.v93Npc=true;
    return npc;
  };

  World.prototype.makeLandmark=function(o,titanId,p,state){
    if(!HUMAN_TYPES.has(o.type))return PREV_MAKE_LANDMARK.call(this,o,titanId,p,state);
    const npc=this.makeV93Trainer(o,p);
    if(!npc)return PREV_MAKE_LANDMARK.call(this,o,titanId,p,state);
    const root=new THREE.Group();root.add(npc);
    const angles={up:0,down:Math.PI,left:Math.PI/2,right:-Math.PI/2};
    root.rotation.y=angles[o.dir||'down']??Math.PI;
    if(o.defeated){
      const mark=this.makeTextPlane('✓','#d9f7d6');mark.position.set(.28,1.9,0);mark.scale.multiplyScalar(.2);root.add(mark);
    }
    root.position.copy(this.gridPosition(o.x,o.y,.38));
    this.worldRoot.add(root);
    this.__v93Humans??=[];this.__v93Humans.push({root,npc,phase:npc.userData.v93IdlePhase});
  };

  World.prototype.updateAnimations=function(time){
    PREV_UPDATE_ANIMATIONS.call(this,time);
    if(!this.__v93Humans?.length)return;
    this.__v93Humans=this.__v93Humans.filter(entry=>entry.root?.parent);
    const t=time*.001;
    for(const entry of this.__v93Humans){
      const d=entry.npc.userData,b=d.bones;if(!b)continue;
      const set=(name,axis,offset)=>{const bone=b[name];if(bone)bone.object.rotation[axis]=bone.base[axis]+offset;};
      const ph=t*.9+entry.phase,breath=Math.sin(ph)*.004,weight=Math.sin(ph*.63)*.003;
      set('Spine2','x',breath);set('Spine3','x',breath*.55);set('Head','y',weight);
      set('LArmA','y',weight*.55);set('RArmA','y',-weight*.55);
      set('LForeArm','y',-.035);set('RForeArm','y',-.035);
      d.modelRoot.position.y=d.modelBaseY+Math.sin(ph*.7)*.0015;
    }
  };

  window.__DRIFTBOUND_V93__={version:93};
})();
