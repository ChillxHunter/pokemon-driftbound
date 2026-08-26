/* Pokémon: Driftbound v95 — true mobile layout detection and viewport controller placement. */
(function(){
  'use strict';

  function isMobileLike(){
    let coarse=false;
    try{coarse=window.matchMedia('(pointer: coarse)').matches;}catch(_e){}
    const ua=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
    return coarse||ua||window.innerWidth<=760;
  }

  function applyMobileMode(){
    const mobile=isMobileLike();
    document.documentElement.classList.toggle('driftbound-mobile',mobile);
    document.body.classList.toggle('driftbound-mobile',mobile);

    const viewport=document.querySelector('meta[name="viewport"]');
    if(viewport)viewport.setAttribute('content','width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');

    const pad=document.querySelector('.mobilePad');
    const world=document.getElementById('worldFrame');
    const app=document.getElementById('gameApp');
    if(pad&&world&&mobile&&pad.parentElement!==world)world.appendChild(pad);
    if(pad&&app&&!mobile&&pad.parentElement!==app)app.appendChild(pad);

    const canvas=document.getElementById('world');
    if(canvas&&mobile){
      canvas.style.width='100%';
      canvas.style.height='100%';
    }

    // Three.js listens to its frame ResizeObserver, but a resize event makes
    // orientation changes settle immediately on browsers that delay observers.
    window.dispatchEvent(new Event('resize'));
  }

  let resizeTimer=0;
  function schedule(){clearTimeout(resizeTimer);resizeTimer=setTimeout(applyMobileMode,80);}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyMobileMode,{once:true});
  else applyMobileMode();
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(applyMobileMode,180),{passive:true});
})();
