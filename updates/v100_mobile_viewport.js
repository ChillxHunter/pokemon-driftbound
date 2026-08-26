/* Pokémon: Driftbound v101 — viewport lock + reliable mobile A interaction. */
(function(){
  'use strict';

  function isMobile(){
    return document.body.classList.contains('gameboy-mobile') ||
      document.body.classList.contains('driftbound-mobile') ||
      window.innerWidth<=880 ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
  }

  function visible(el){
    return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display!=='none';
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

  function keyboardInteract(){
    const down={key:'e',code:'KeyE',bubbles:true,cancelable:true};
    window.dispatchEvent(new KeyboardEvent('keydown',down));
    document.dispatchEvent(new KeyboardEvent('keydown',down));
    setTimeout(()=>{
      window.dispatchEvent(new KeyboardEvent('keyup',down));
      document.dispatchEvent(new KeyboardEvent('keyup',down));
    },24);
  }

  function installAButton(){
    const a=document.querySelector('.mobilePad [data-action="interact"],.mobilePad .gbA');
    if(!a||a.dataset.v101Fixed==='1')return;
    a.dataset.v101Fixed='1';
    a.textContent='A';
    a.setAttribute('aria-label','A · Interact / Confirm');

    let lastActivation=0;
    let swallowClickUntil=0;

    function activate(e){
      const now=performance.now();
      if(now-lastActivation<180)return;
      lastActivation=now;
      swallowClickUntil=now+500;
      if(e){
        e.preventDefault();
        e.stopImmediatePropagation();
      }

      const dialogue=document.getElementById('dialogue');
      if(visible(dialogue)){
        const choice=dialogue.querySelector('.dialogueChoices button:not(:disabled)');
        const next=document.getElementById('dialogueNext');
        if(choice){choice.click();return;}
        if(next&&!next.classList.contains('hidden')){next.click();return;}
        if(typeof window.advanceDialogue==='function'){window.advanceDialogue();return;}
      }

      const panel=document.getElementById('panelOverlay');
      if(visible(panel)){
        const primary=panel.querySelector('button:not(:disabled):not(.closePanel)');
        if(primary){primary.click();return;}
      }

      // v90 replaces interactNearest with the actual building/NPC/field-object handler.
      if(typeof window.interactNearest==='function'){
        window.interactNearest();
        return;
      }

      // Fallback to the exact desktop interaction key if the global function is
      // not exposed by this browser's script environment.
      keyboardInteract();
    }

    a.addEventListener('pointerdown',activate,{capture:true});
    a.addEventListener('touchstart',activate,{capture:true,passive:false});
    a.addEventListener('click',e=>{
      if(performance.now()<swallowClickUntil){
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      activate(e);
    },{capture:true});
  }

  function hideMobilePrompt(){
    let style=document.getElementById('v101MobilePromptStyle');
    if(!style){
      style=document.createElement('style');
      style.id='v101MobilePromptStyle';
      style.textContent='body.gameboy-mobile .interactionHint,body.driftbound-mobile .interactionHint{display:none!important}';
      document.head.appendChild(style);
    }
  }

  function install(){
    syncViewport();
    hideMobilePrompt();
    installAButton();

    document.addEventListener('touchmove',function(e){
      if(!isMobile()||allowInternalScroll(e.target))return;
      e.preventDefault();
    },{passive:false});

    window.addEventListener('scroll',()=>{if(isMobile()&&(window.scrollX||window.scrollY))window.scrollTo(0,0);},{passive:true});
    window.addEventListener('resize',()=>requestAnimationFrame(()=>{syncViewport();installAButton();}),{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(()=>{syncViewport();installAButton();},120),{passive:true});
    window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(syncViewport),{passive:true});
    window.visualViewport?.addEventListener('scroll',()=>requestAnimationFrame(syncViewport),{passive:true});

    [50,180,500,1000].forEach(ms=>setTimeout(()=>{syncViewport();installAButton();},ms));

    const game=document.getElementById('gameApp');
    if(game)new MutationObserver(()=>requestAnimationFrame(()=>{syncViewport();installAButton();})).observe(game,{attributes:true,subtree:false});
    const journey=document.querySelector('.mobileJourneyTop');
    if(journey)new ResizeObserver(()=>requestAnimationFrame(syncViewport)).observe(journey);
    const top=document.querySelector('.topBar');
    if(top)new ResizeObserver(()=>requestAnimationFrame(syncViewport)).observe(top);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
