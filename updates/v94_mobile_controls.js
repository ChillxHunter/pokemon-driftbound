/* Pokémon: Driftbound v94 — optional on-screen mobile controller. */
(function(){
  'use strict';

  const STORAGE_KEY='driftbound-mobile-controls-enabled';

  function preferredDefault(){
    try{return window.matchMedia('(pointer: coarse)').matches || window.innerWidth<=820;}catch(_e){return false;}
  }

  function readSetting(){
    try{
      const saved=localStorage.getItem(STORAGE_KEY);
      if(saved==='1')return true;
      if(saved==='0')return false;
    }catch(_e){}
    return preferredDefault();
  }

  function saveSetting(on){
    try{localStorage.setItem(STORAGE_KEY,on?'1':'0');}catch(_e){}
  }

  function install(){
    const pad=document.querySelector('.mobilePad');
    const strip=document.querySelector('.controlStrip');
    if(!pad||!strip)return;

    const interact=pad.querySelector('[data-action="interact"]');
    if(interact){interact.textContent='E';interact.setAttribute('aria-label','Interact');}

    pad.querySelectorAll('button').forEach(btn=>{
      btn.setAttribute('type','button');
      btn.style.touchAction='none';
    });

    let toggle=document.getElementById('mobileControlsToggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.id='mobileControlsToggle';
      toggle.className='mobileControlsToggle';
      toggle.type='button';
      toggle.setAttribute('aria-pressed','false');
      strip.append(toggle);
    }

    let enabled=readSetting();
    function render(){
      document.body.classList.toggle('mobile-controls-enabled',enabled);
      toggle.setAttribute('aria-pressed',String(enabled));
      toggle.innerHTML=`<span class="controllerGlyph">✥</span> Mobile Controls: <b>${enabled?'ON':'OFF'}</b>`;
      pad.setAttribute('aria-hidden',String(!enabled));
    }
    toggle.addEventListener('click',()=>{enabled=!enabled;saveSetting(enabled);render();});
    render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
