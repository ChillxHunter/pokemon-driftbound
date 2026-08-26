/* Pokémon: Driftbound v101 — reliable A-button interaction on mobile. */
(function(){
  'use strict';

  function visible(el){
    return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display!=='none';
  }

  function triggerKeyboardInteract(){
    const opts={key:'e',code:'KeyE',bubbles:true,cancelable:true};
    window.dispatchEvent(new KeyboardEvent('keydown',opts));
    document.dispatchEvent(new KeyboardEvent('keydown',opts));
    setTimeout(()=>{
      window.dispatchEvent(new KeyboardEvent('keyup',opts));
      document.dispatchEvent(new KeyboardEvent('keyup',opts));
    },20);
  }

  function install(){
    const pad=document.querySelector('.mobilePad');
    const a=pad?.querySelector('[data-action="interact"],.gbA');
    if(!a||a.dataset.v101Interact==='1')return;
    a.dataset.v101Interact='1';
    a.textContent='A';
    a.setAttribute('aria-label','A · Interact / Confirm');

    let lastPress=0;
    function activate(e){
      const now=performance.now();
      if(now-lastPress<180)return;
      lastPress=now;
      if(e){e.preventDefault();e.stopPropagation();}

      const dialogue=document.getElementById('dialogue');
      if(visible(dialogue)){
        const enabledChoice=dialogue.querySelector('.dialogueChoices button:not(:disabled)');
        const next=document.getElementById('dialogueNext');
        if(enabledChoice){enabledChoice.click();return;}
        if(next&&!next.classList.contains('hidden')){next.click();return;}
        if(typeof window.advanceDialogue==='function'){window.advanceDialogue();return;}
      }

      const panel=document.getElementById('panelOverlay');
      if(visible(panel)){
        const primary=panel.querySelector('button:not(:disabled):not(.closePanel)');
        if(primary){primary.click();return;}
      }

      // Use the actual overworld interaction function added by the region rework.
      if(typeof window.interactNearest==='function'){
        window.interactNearest();
        return;
      }

      // Fallback for browsers where the classic-script global binding is not
      // exposed as a Window property: emulate the exact E key instead.
      triggerKeyboardInteract();
    }

    // pointerdown gives immediate response on phones. click is retained for
    // accessibility/desktop touch emulation, with the debounce preventing doubles.
    a.addEventListener('pointerdown',activate,{capture:true});
    a.addEventListener('click',activate,{capture:true});
    a.addEventListener('touchstart',activate,{capture:true,passive:false});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});
  else setTimeout(install,0);
})();
