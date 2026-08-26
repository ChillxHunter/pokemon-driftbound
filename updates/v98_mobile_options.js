/* Pokémon: Driftbound v98 — mobile top journey + persistent Sound/Graphics/Gameplay options. */
(function(){
  'use strict';

  const KEY='driftbound-v98-options';
  const defaults={sound:true,volume:85,graphics:'medium',battleAnimations:true,mobileControls:true};
  let settings={...defaults};
  try{settings={...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch(_e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_e){}};

  function mobile(){return document.body.classList.contains('gameboy-mobile')||document.body.classList.contains('driftbound-mobile');}
  function visible(el){return !!el&&!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none';}

  /* ---------- sound ---------- */
  const nativePlay=HTMLMediaElement.prototype.play;
  if(!HTMLMediaElement.prototype.__driftboundV98Play){
    HTMLMediaElement.prototype.__driftboundV98Play=nativePlay;
    HTMLMediaElement.prototype.play=function(){
      if(this.__driftboundBaseVolume==null)this.__driftboundBaseVolume=this.volume;
      const master=Math.max(0,Math.min(1,Number(settings.volume)/100));
      this.volume=Math.max(0,Math.min(1,this.__driftboundBaseVolume*master));
      return nativePlay.apply(this,arguments);
    };
  }
  function applyVolume(){
    const master=Math.max(0,Math.min(1,Number(settings.volume)/100));
    document.querySelectorAll('audio,video').forEach(m=>{
      if(m.__driftboundBaseVolume==null)m.__driftboundBaseVolume=m.volume;
      m.volume=Math.max(0,Math.min(1,m.__driftboundBaseVolume*master));
    });
  }
  function setSound(on){
    settings.sound=!!on;save();
    const button=document.getElementById('audioButton');
    if(button){
      const pressed=button.getAttribute('aria-pressed')!=='false';
      if(pressed!==settings.sound)button.click();
    }
    const battle=document.getElementById('battleAudioButton');
    if(battle&&visible(document.getElementById('battleScreen'))){
      const pressed=battle.getAttribute('aria-pressed')!=='false';
      if(pressed!==settings.sound)battle.click();
    }
  }

  /* ---------- graphics ---------- */
  function qualityRatio(){
    if(settings.graphics==='low')return .68;
    if(settings.graphics==='high')return Math.min(window.devicePixelRatio||1,1.35);
    return Math.min(window.devicePixelRatio||1,1);
  }
  function installRendererQuality(){
    const World=window.DriftboundWorld3D;if(!World||World.prototype.__v98Resize)return;
    const old=World.prototype.resize;
    World.prototype.resize=function(){
      const ratio=qualityRatio();
      if(this.renderer&&Math.abs((this.renderer.getPixelRatio?.()||1)-ratio)>.01)this.renderer.setPixelRatio(ratio);
      if(this.renderer?.shadowMap)this.renderer.shadowMap.enabled=settings.graphics!=='low';
      return old.apply(this,arguments);
    };
    World.prototype.__v98Resize=true;
  }
  function applyGraphics(){
    document.documentElement.dataset.driftboundGraphics=settings.graphics;
    window.__DRIFTBOUND_GRAPHICS=settings.graphics;
    installRendererQuality();
    window.dispatchEvent(new Event('resize'));
  }

  /* ---------- gameplay ---------- */
  function applyGameplay(){
    document.body.classList.toggle('driftbound-reduced-motion',!settings.battleAnimations);
    const toggle=document.getElementById('mobileControlsToggle');
    if(toggle&&mobile()){
      const on=toggle.getAttribute('aria-pressed')==='true';
      if(on!==!!settings.mobileControls)toggle.click();
    }
  }

  /* ---------- move Active Journey to the top on mobile ---------- */
  function installJourneyBanner(){
    if(document.querySelector('.mobileJourneyTop'))return;
    const top=document.querySelector('.topBar'),layout=document.querySelector('.gameLayout');
    if(!top||!layout)return;
    const banner=document.createElement('section');banner.className='mobileJourneyTop';banner.setAttribute('aria-label','Active journey');
    banner.innerHTML='<div class="mjEyebrow">ACTIVE JOURNEY</div><div class="mjRow"><div class="mjTitle">Journey</div><div class="mjMeta"></div></div><div class="mjDesc"></div>';
    layout.parentElement.insertBefore(banner,layout);
    const sync=()=>{
      const src=document.querySelector('.expeditionSection');
      const title=src?.querySelector('h2')?.textContent?.trim()||document.getElementById('questTitle')?.textContent?.trim()||'Journey';
      const desc=src?.querySelector('p')?.textContent?.trim()||document.getElementById('questDescription')?.textContent?.trim()||'';
      const progress=src?.querySelector('#questProgressText')?.textContent?.trim()||'';
      banner.querySelector('.mjTitle').textContent=title;
      banner.querySelector('.mjDesc').textContent=desc;
      banner.querySelector('.mjMeta').textContent=progress;
    };
    sync();
    const src=document.querySelector('.expeditionSection');
    if(src)new MutationObserver(sync).observe(src,{subtree:true,childList:true,characterData:true,attributes:true});
  }

  /* ---------- options UI ---------- */
  function installOptions(){
    const drawer=document.getElementById('mobileGameMenuDrawer');
    const items=drawer?.querySelector('.mobileGameMenuItems');
    if(!drawer||!items||document.getElementById('mobileOptionsButton'))return;

    const button=document.createElement('button');button.id='mobileOptionsButton';button.type='button';button.className='mobileOptionsButton';button.textContent='⚙ OPTIONS';
    items.appendChild(button);

    const view=document.createElement('div');view.className='mobileOptionsView';
    view.innerHTML=`
      <div class="mobileOptionsTabs">
        <button type="button" data-tab="sound" class="active">SOUND</button>
        <button type="button" data-tab="graphics">GRAPHICS</button>
        <button type="button" data-tab="gameplay">GAMEPLAY</button>
      </div>
      <div class="mobileOptionsPane active" data-pane="sound">
        <div class="mobileOptionRow"><div class="mobileOptionText"><b>Sound</b><small>Music, cries and sound effects</small></div><button type="button" class="mobileOptionToggle" data-setting="sound"></button></div>
        <div class="mobileOptionRow"><div class="mobileOptionText"><b>Master Volume</b><small>Overall game volume</small></div><input data-setting="volume" type="range" min="0" max="100" step="5"></div>
      </div>
      <div class="mobileOptionsPane" data-pane="graphics">
        <div class="mobileOptionRow"><div class="mobileOptionText"><b>Graphics Quality</b><small>Low is fastest; High is sharper</small></div><select data-setting="graphics"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
      </div>
      <div class="mobileOptionsPane" data-pane="gameplay">
        <div class="mobileOptionRow"><div class="mobileOptionText"><b>Battle Animations</b><small>Turn visual animations on or off</small></div><button type="button" class="mobileOptionToggle" data-setting="battleAnimations"></button></div>
        <div class="mobileOptionRow"><div class="mobileOptionText"><b>Mobile Controls</b><small>Show the D-pad and A/B buttons</small></div><button type="button" class="mobileOptionToggle" data-setting="mobileControls"></button></div>
      </div>
      <button type="button" class="mobileOptionsBack">← BACK TO MENU</button>`;
    items.appendChild(view);

    const normal=[...items.children].filter(n=>n!==view&&n!==button);
    const render=()=>{
      view.querySelector('[data-setting="volume"]').value=String(settings.volume);
      view.querySelector('[data-setting="graphics"]').value=settings.graphics;
      ['sound','battleAnimations','mobileControls'].forEach(k=>{const el=view.querySelector(`[data-setting="${k}"]`);el.textContent=settings[k]?'ON':'OFF';el.classList.toggle('on',!!settings[k]);});
    };
    const showOptions=on=>{normal.forEach(n=>n.style.display=on?'none':'');button.style.display=on?'none':'';view.classList.toggle('open',on);render();};
    button.onclick=()=>showOptions(true);
    view.querySelector('.mobileOptionsBack').onclick=()=>showOptions(false);
    view.querySelectorAll('.mobileOptionsTabs button').forEach(tab=>tab.onclick=()=>{
      view.querySelectorAll('.mobileOptionsTabs button').forEach(b=>b.classList.toggle('active',b===tab));
      view.querySelectorAll('.mobileOptionsPane').forEach(p=>p.classList.toggle('active',p.dataset.pane===tab.dataset.tab));
    });
    view.querySelector('[data-setting="sound"]').onclick=()=>{setSound(!settings.sound);render();};
    view.querySelector('[data-setting="volume"]').oninput=e=>{settings.volume=Number(e.target.value);save();applyVolume();};
    view.querySelector('[data-setting="graphics"]').onchange=e=>{settings.graphics=e.target.value;save();applyGraphics();};
    view.querySelector('[data-setting="battleAnimations"]').onclick=()=>{settings.battleAnimations=!settings.battleAnimations;save();applyGameplay();render();};
    view.querySelector('[data-setting="mobileControls"]').onclick=()=>{settings.mobileControls=!settings.mobileControls;save();applyGameplay();render();};

    // B / drawer close should return to the normal menu first.
    drawer.addEventListener('transitionend',()=>{if(!drawer.classList.contains('open'))showOptions(false)});
    render();
  }

  function install(){
    installRendererQuality();installJourneyBanner();installOptions();applyGraphics();applyVolume();
    // Let v94/v96 finish creating the controller before syncing gameplay settings.
    setTimeout(()=>{applyGameplay();setSound(settings.sound);},80);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});
  else setTimeout(install,0);
})();
