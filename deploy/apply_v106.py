#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: apply_v106.py <site-dir>')
site=Path(sys.argv[1])
p=site/'game.js'
s=p.read_text(encoding='utf-8')

start=s.index('function setBattleMessage(text,record=true){')
end=s.index('\nfunction setBattleControls(html)', start)
new_set='''function syncMobileBattleMessage(){
  const text=$('.battleMobileMessageText',DOM.battleControls);
  const summary=$('.battleMobileFieldSummary',DOM.battleControls);
  if(text)text.textContent=DOM.battleMessage.textContent||'';
  if(summary)summary.textContent=DOM.battleFieldSummary.textContent||'';
}
function setBattleMessage(text,record=true){
  DOM.battleMessage.textContent=text;
  syncMobileBattleMessage();
  if(record&&B){if(B.log[B.log.length-1]!==text)B.log.push(text);renderBattleLog()}
}'''
s=s[:start]+new_set+s[end:]

start=s.index('function mainBattleControlsHtml(mon){')
end=s.index('\nfunction battleMoveMenu(){', start)
new_controls='''function mainBattleControlsHtml(mon){
  const moves=mon.moves.map((slot,index)=>{const move=MOVES[slot.id],[effect,effectClass]=battleEffectLabel(move);return `<button class="battleMoveCard moveButton" data-move-index="${index}" style="--move-color:${TYPE_COLORS[move.type]}" ${slot.pp<=0?'disabled':''}><span class="moveNameRow"><b>${move.name}</b><em class="moveType" style="background:${TYPE_COLORS[move.type]}">${move.type}</em></span><span class="moveEffectIndicator ${effectClass}">${effect}</span><small>${move.category} · PWR ${move.power||'—'} · PP ${slot.pp}/${slot.maxPp}</small></button>`}).join('');
  const lastBall=S.lastBallUsed||null;
  const lastBallQty=lastBall?(S.inventory[lastBall]||0):0;
  const lastBallDisabled=B.boss||!lastBall||lastBallQty<=0;
  const message=escapeHtml(DOM.battleMessage.textContent||'');
  const summary=escapeHtml(DOM.battleFieldSummary.textContent||'');
  return `<div class="battleMoveZone battleMoveZoneSplit"><div class="battleMobileMessageBox"><span class="battleMobileMessageStar">✦</span><div class="battleMobileMessageText">${message}</div><small class="battleMobileFieldSummary">${summary}</small></div><div class="battleMovePanel"><div class="battleControlTitle">MOVES</div><div class="moves">${moves}</div></div></div><div class="battleUtilityZone"><div class="battleControlTitle">ACTIONS</div><div class="battleUtilityStack"><button id="pokemonButton" class="battleUtility"><b>Pokémon</b><small>Switch partner</small></button><button id="battleBagButton" class="battleUtility"><b>Bag</b><small>Medicine and tools</small></button><button id="lastBallButton" class="battleUtility" ${lastBallDisabled?'disabled':''}><b>Last Ball Used</b><small>${B.boss?'Trainer battle':lastBall?`${lastBall} · ${lastBallQty} left`:'None yet · choose in Bag'}</small></button><button id="runButton" class="battleUtility" ${B.boss?'disabled':''}><b>${B.boss?'Stand Firm':'Run'}</b><small>${B.boss?'You cannot leave a Trainer battle':'Return to exploration'}</small></button></div></div>`;
}
function battleMainMenu(message){
  if(!B)return;B.locked=false;setBattleMessage(message||`What will ${displayMonName(S.party[B.playerIndex])} do?`,!!message);
  DOM.battleControls.classList.remove('bagMode');
  const mon=S.party[B.playerIndex];setBattleControls(mainBattleControlsHtml(mon));syncMobileBattleMessage();
  $$('[data-move-index]',DOM.battleControls).forEach(btn=>btn.onclick=()=>executeBattleTurn(Number(btn.dataset.moveIndex)));
  $('#pokemonButton').onclick=()=>openBattleSwitchPanel(false);
  $('#battleBagButton').onclick=battleBagMenu;
  const lastBall=$('#lastBallButton');if(lastBall&&!lastBall.disabled)lastBall.onclick=()=>useBattleItem(S.lastBallUsed);
  const run=$('#runButton');if(!B.boss)run.onclick=attemptRun;
}'''
s=s[:start]+new_controls+s[end:]

start=s.index('function battleBagMenu(){')
end=s.index('\nasync function executeBattleTurn', start)
new_bag='''function battleBagMenu(){
  const names=['Poke Ball','Great Ball','Potion','Super Potion','Revive','Survey Flare'];
  const buttons=names.map(name=>{const it=ITEMS[name],qty=S.inventory[name]||0,invalid=!qty||(B.boss&&['ball','survey'].includes(it.kind));return `<button data-battle-item="${name}" ${invalid?'disabled':''}>${name} ×${qty}<small>${it.desc}</small></button>`}).join('');
  DOM.battleControls.classList.add('bagMode');setBattleMessage('Choose an item.');
  setBattleControls(`<div class="battleMoveZone battleMoveZoneSplit battleBagSplit"><div class="battleMobileMessageBox"><span class="battleMobileMessageStar">✦</span><div class="battleMobileMessageText">${escapeHtml(DOM.battleMessage.textContent||'')}</div><small class="battleMobileFieldSummary">${escapeHtml(DOM.battleFieldSummary.textContent||'')}</small></div><div class="battleMovePanel battleBagZone"><div class="battleControlTitle">BAG</div><div class="battleItemGrid">${buttons}</div></div></div><div class="battleUtilityZone"><div class="battleControlTitle">ACTIONS</div><div class="battleUtilityStack"><button class="backBattle" id="battleBack"><b>Back</b><small>Return to battle</small></button></div></div>`);
  syncMobileBattleMessage();
  $$('[data-battle-item]',DOM.battleControls).forEach(btn=>btn.onclick=()=>useBattleItem(btn.dataset.battleItem));$('#battleBack').onclick=()=>battleMainMenu();
}'''
s=s[:start]+new_bag+s[end:]

needle="if(item.kind==='ball'){await attemptCapture(name,item.power);return}"
if needle not in s:
    raise SystemExit('v106 patch: ball item branch not found')
s=s.replace(needle,"if(item.kind==='ball'){S.lastBallUsed=name;saveGame();await attemptCapture(name,item.power);return}",1)

p.write_text(s,encoding='utf-8')

index=site/'index.html'
i=index.read_text(encoding='utf-8')
link='  <link rel="stylesheet" href="v106_mobile_battle_layout.css?v=mobile-106">\n'
if 'v106_mobile_battle_layout.css' not in i:
    i=i.replace('</head>',link+'</head>')
index.write_text(i,encoding='utf-8')
