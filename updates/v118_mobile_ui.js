/* Pokémon: Driftbound v118 — mobile modal/menu layering guard. */
(function(){
  'use strict';
  function shown(el){
    return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display!=='none';
  }
  function sync(){
    const panel=document.getElementById('panelOverlay');
    const open=shown(panel);
    document.body.classList.toggle('db-v118-panel-open',open);
    if(open){
      document.querySelector('.mobileGameMenuDrawer')?.classList.remove('open');
      document.querySelector('.mobileGameMenuButton')?.setAttribute('aria-expanded','false');
    }
  }
  function install(){
    if(!document.getElementById('v118MobileUiStyle')){
      const style=document.createElement('style');
      style.id='v118MobileUiStyle';
      style.textContent=`
        body.gameboy-mobile.db-v118-panel-open .mobileGameMenuButton,
        body.gameboy-mobile.db-v118-panel-open .mobileGameMenuDrawer,
        body.driftbound-mobile.db-v118-panel-open .mobileGameMenuButton,
        body.driftbound-mobile.db-v118-panel-open .mobileGameMenuDrawer{display:none!important}
        body.gameboy-mobile #panelOverlay:not(.hidden),
        body.driftbound-mobile #panelOverlay:not(.hidden){z-index:2500!important}
      `;
      document.head.appendChild(style);
    }
    const panel=document.getElementById('panelOverlay');
    if(panel&&!panel.dataset.v118Observed){
      panel.dataset.v118Observed='1';
      new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['class','style']});
    }
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.addEventListener('resize',sync,{passive:true});
  window.__DRIFTBOUND_V118_MOBILE_UI__={version:118,sync};
})();
