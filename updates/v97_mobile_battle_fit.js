/* Pokémon: Driftbound v97 — mobile battle viewport state. */
(function(){
  'use strict';
  function sync(){
    const battle=document.getElementById('battleScreen');
    const active=!!battle && !battle.classList.contains('hidden');
    document.body.classList.toggle('mobile-battle-active',active);
  }
  function install(){
    const battle=document.getElementById('battleScreen');
    if(!battle)return;
    sync();
    new MutationObserver(sync).observe(battle,{attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',sync,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(sync,120),{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
