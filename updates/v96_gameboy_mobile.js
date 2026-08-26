/* Pokémon: Driftbound v96 — Game Boy-style mobile controls + compact menu drawer. */
(function(){
  'use strict';

  function isMobile(){
    return document.body.classList.contains('driftbound-mobile') || window.innerWidth<=760 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
  }

  function visible(el){
    return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display!=='none';
  }

  function install(){
    const pad=document.querySelector('.mobilePad');
    const strip=document.querySelector('.controlStrip');
    const world=document.getElementById('worldFrame');
    if(!pad||!strip||!world)return;

    // A uses the game's existing interact action.
    const a=pad.querySelector('[data-action="interact"]');
    if(a){a.textContent='A';a.classList.add('gbA');a.setAttribute('aria-label','A · Interact / Confirm');}

    // B is a true back/cancel control.
    let b=pad.querySelector('.gbB');
    if(!b){
      b=document.createElement('button');
      b.type='button';b.className='gbB';b.textContent='B';b.setAttribute('aria-label','B · Back / Cancel');
      pad.appendChild(b);
    }

    let fab=document.getElementById('mobileGameMenuButton');
    if(!fab){
      fab=document.createElement('button');fab.id='mobileGameMenuButton';fab.type='button';fab.className='mobileGameMenuButton';
      fab.innerHTML='<span>☰</span><b>MENU</b>';document.body.appendChild(fab);
    }
    let drawer=document.getElementById('mobileGameMenuDrawer');
    if(!drawer){
      drawer=document.createElement('section');drawer.id='mobileGameMenuDrawer';drawer.className='mobileGameMenuDrawer';drawer.setAttribute('aria-label','Game menu');
      drawer.innerHTML='<div class="mobileGameMenuHead"><b>MENU</b><button type="button" aria-label="Close menu">×</button></div><div class="mobileGameMenuItems"></div>';
      document.body.appendChild(drawer);
    }
    const items=drawer.querySelector('.mobileGameMenuItems');
    const close=drawer.querySelector('.mobileGameMenuHead button');
    const quick=document.querySelector('.quickNav');
    const mobileToggle=document.getElementById('mobileControlsToggle');
    const originalQuickParent=quick?.parentElement||strip;
    const originalToggleParent=mobileToggle?.parentElement||strip;

    function openDrawer(on=true){
      drawer.classList.toggle('open',on);fab.classList.toggle('open',on);fab.setAttribute('aria-expanded',String(on));
    }
    fab.onclick=()=>openDrawer(!drawer.classList.contains('open'));
    close.onclick=()=>openDrawer(false);
    document.addEventListener('pointerdown',e=>{
      if(!drawer.classList.contains('open'))return;
      if(drawer.contains(e.target)||fab.contains(e.target))return;
      openDrawer(false);
    },{passive:true});

    // Close the drawer after selecting a normal menu entry.
    drawer.addEventListener('click',e=>{if(e.target.closest('.quickNav button'))setTimeout(()=>openDrawer(false),20);});

    function doBack(){
      openDrawer(false);
      const panel=document.getElementById('panelOverlay');
      if(visible(panel)){
        const closeBtn=panel.querySelector('.closePanel');
        if(closeBtn){closeBtn.click();return;}
      }
      const starter=document.getElementById('starterOverlay');
      if(visible(starter))return;
      const dialogue=document.getElementById('dialogue');
      // Dialogue is deliberately not skipped by B; keep story text intentional.
      if(visible(dialogue))return;
      window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
      window.dispatchEvent(new KeyboardEvent('keyup',{key:'Escape',code:'Escape',bubbles:true}));
    }
    b.addEventListener('pointerdown',e=>{e.preventDefault();doBack();});

    // A should also work as confirm in dialogue/menu contexts while preserving
    // the game's existing overworld data-action interaction listener.
    a?.addEventListener('click',()=>{
      const dialogue=document.getElementById('dialogue');
      if(visible(dialogue)){
        const choice=dialogue.querySelector('.dialogueChoices button:not(:disabled)');
        const next=document.getElementById('dialogueNext');
        if(choice)choice.click();else if(next&&!next.classList.contains('hidden'))next.click();
      }
    });

    function apply(){
      const mobile=isMobile();
      document.body.classList.toggle('gameboy-mobile',mobile);
      if(mobile){
        if(pad.parentElement!==world)world.appendChild(pad);
        if(quick&&quick.parentElement!==items)items.appendChild(quick);
        if(mobileToggle&&mobileToggle.parentElement!==items)items.appendChild(mobileToggle);
        fab.hidden=false;drawer.hidden=false;
      }else{
        openDrawer(false);fab.hidden=true;drawer.hidden=true;
        if(quick&&quick.parentElement!==originalQuickParent)originalQuickParent.appendChild(quick);
        if(mobileToggle&&mobileToggle.parentElement!==originalToggleParent)originalToggleParent.appendChild(mobileToggle);
      }
    }

    apply();
    window.addEventListener('resize',()=>setTimeout(apply,90),{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(apply,180),{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
