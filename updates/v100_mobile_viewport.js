/* Pokémon: Driftbound v100 — visual-viewport lock + top-right mobile menu. */
(function(){
  'use strict';

  function isMobile(){
    return document.body.classList.contains('gameboy-mobile') ||
      document.body.classList.contains('driftbound-mobile') ||
      window.innerWidth<=880 ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
  }

  function syncViewport(){
    const mobile=isMobile();
    document.documentElement.classList.toggle('gameboy-mobile-root',mobile);
    if(!mobile){
      document.documentElement.style.removeProperty('--db-mobile-vh');
      document.documentElement.style.removeProperty('--db-menu-top');
      return;
    }

    const vv=window.visualViewport;
    const h=Math.max(320,Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight));
    document.documentElement.style.setProperty('--db-mobile-vh',h+'px');

    const world=document.getElementById('worldFrame');
    if(world){
      const rect=world.getBoundingClientRect();
      const top=Math.max(8,Math.min(h-60,Math.round(rect.top+9)));
      document.documentElement.style.setProperty('--db-menu-top',top+'px');
    }

    if(window.scrollX||window.scrollY)window.scrollTo(0,0);
  }

  function allowInternalScroll(target){
    return !!target?.closest?.('.panelCard,.starterCard,.mobileGameMenuDrawer,.panelBody,.mobileOptionsView');
  }

  function install(){
    syncViewport();

    document.addEventListener('touchmove',function(e){
      if(!isMobile()||allowInternalScroll(e.target))return;
      e.preventDefault();
    },{passive:false});

    window.addEventListener('scroll',()=>{if(isMobile()&&(window.scrollX||window.scrollY))window.scrollTo(0,0);},{passive:true});
    window.addEventListener('resize',()=>requestAnimationFrame(syncViewport),{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(syncViewport,120),{passive:true});
    window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(syncViewport),{passive:true});
    window.visualViewport?.addEventListener('scroll',()=>requestAnimationFrame(syncViewport),{passive:true});

    [50,180,500].forEach(ms=>setTimeout(syncViewport,ms));

    const game=document.getElementById('gameApp');
    if(game)new MutationObserver(()=>requestAnimationFrame(syncViewport)).observe(game,{attributes:true,subtree:false});
    const journey=document.querySelector('.mobileJourneyTop');
    if(journey)new ResizeObserver(()=>requestAnimationFrame(syncViewport)).observe(journey);
    const top=document.querySelector('.topBar');
    if(top)new ResizeObserver(()=>requestAnimationFrame(syncViewport)).observe(top);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
