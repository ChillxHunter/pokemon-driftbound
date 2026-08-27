/* Pokémon: Driftbound v121 — clean four-command battle flow.
   Keeps battle mechanics, Pokémon sprites and audio; replaces only battle controls. */
(function(){
  'use strict';
  if(typeof battleMainMenu!=='function'||typeof setBattleControls!=='function')return;

  function commandHtml(mon){
    const name=escapeHtml(displayMonName(mon));
    const runDisabled=B&&B.boss;
    return `<div class="v121BattleCommandBar">
      <div class="v121BattleQuestion">What will <b>${name}</b> do?</div>
      <div class="v121ActionGrid">
        <button id="v121FightButton" class="v121Action v121Fight"><b>FIGHT</b><small>Choose a move</small></button>
        <button id="battleBagButton" class="v121Action v121Bag"><b>BAG</b><small>Use an item</small></button>
        <button id="pokemonButton" class="v121Action v121Pokemon"><b>POKÉMON</b><small>Switch Pokémon</small></button>
        <button id="runButton" class="v121Action v121Run" ${runDisabled?'disabled':''}><b>RUN</b><small>${runDisabled?'Cannot escape':'Escape battle'}</small></button>
      </div>
    </div>`;
  }

  function moveHtml(mon){
    const moves=mon.moves.map((slot,index)=>{
      const move=MOVES[slot.id];
      const [effect,effectClass]=battleEffectLabel(move);
      return `<button class="v121MoveCard moveButton" data-move-index="${index}" style="--move-color:${TYPE_COLORS[move.type]}" ${slot.pp<=0?'disabled':''}>
        <span class="moveNameRow"><b>${escapeHtml(move.name)}</b><em class="moveType" style="background:${TYPE_COLORS[move.type]}">${escapeHtml(move.type)}</em></span>
        <span class="moveEffectIndicator ${effectClass}">${escapeHtml(effect)}</span>
        <small>${escapeHtml(move.category)} · PWR ${move.power||'—'} · PP ${slot.pp}/${slot.maxPp}</small>
      </button>`;
    }).join('');
    return `<div class="v121BattleMoveMenu">
      <div class="v121MoveHeader"><b>FIGHT</b><span>Choose a move</span></div>
      <div class="v121MovesGrid">${moves}</div>
      <button id="v121MoveBack" class="v121MoveBack" type="button">BACK</button>
    </div>`;
  }

  window.v121BattleFightMenu=function(){
    if(!B)return;
    B.locked=false;
    DOM.battleControls.classList.remove('bagMode');
    DOM.battleControls.classList.add('v121FightMode');
    setBattleMessage('Choose a move.',false);
    const mon=S.party[B.playerIndex];
    setBattleControls(moveHtml(mon));
    $$('[data-move-index]',DOM.battleControls).forEach(btn=>btn.onclick=()=>executeBattleTurn(Number(btn.dataset.moveIndex)));
    const back=$('#v121MoveBack');if(back)back.onclick=()=>battleMainMenu();
  };

  mainBattleControlsHtml=function(mon){return commandHtml(mon)};

  battleMainMenu=function(message){
    if(!B)return;
    B.locked=false;
    DOM.battleControls.classList.remove('bagMode','v121FightMode');
    const mon=S.party[B.playerIndex];
    setBattleMessage(message||`What will ${displayMonName(mon)} do?`,!!message);
    setBattleControls(commandHtml(mon));
    const fight=$('#v121FightButton');if(fight)fight.onclick=window.v121BattleFightMenu;
    const pokemon=$('#pokemonButton');if(pokemon)pokemon.onclick=()=>openBattleSwitchPanel(false);
    const bag=$('#battleBagButton');if(bag)bag.onclick=battleBagMenu;
    const run=$('#runButton');if(run&&!B.boss)run.onclick=attemptRun;
  };

  battleMoveMenu=function(){window.v121BattleFightMenu()};

  console.info('[Driftbound v121] four-command battle screen active.');
})();
