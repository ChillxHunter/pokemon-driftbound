#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: apply_v105.py <site-dir>')

site = Path(sys.argv[1])
game = site / 'game.js'
s = game.read_text(encoding='utf-8')

patch = r'''

/* v105 — traditional battle actions: Pokémon + Last Ball Used. */
const v105OriginalBattleMainMenu = battleMainMenu;
battleMainMenu = function(message){
  v105OriginalBattleMainMenu(message);
  if(!B)return;

  const studyButton=$('#studyButton');
  if(studyButton){
    studyButton.id='battlePokemonButton';
    const title=studyButton.querySelector('b');
    const sub=studyButton.querySelector('small');
    if(title)title.textContent='Pokémon';
    if(sub)sub.textContent='Switch or inspect';
    studyButton.disabled=false;
    studyButton.onclick=()=>openBattleSwitchPanel(false);
  }

  const captureButton=$('#captureButton');
  if(captureButton){
    const lastBall=S.lastBallUsed||'';
    const qty=lastBall?(S.inventory[lastBall]||0):0;
    const title=captureButton.querySelector('b');
    const sub=captureButton.querySelector('small');
    const displayBall=lastBall==='Poke Ball'?'Poké Ball':lastBall;
    if(title)title.textContent='Last Ball Used';
    if(sub)sub.textContent=B.boss?'Unavailable in this battle':(lastBall?`${displayBall} · ${qty} left`:'None yet · choose in Bag');
    captureButton.disabled=!!B.boss||!lastBall||qty<=0;
    captureButton.onclick=()=>{
      if(!B||B.boss)return;
      const ball=S.lastBallUsed||'';
      if(ball&&(S.inventory[ball]||0)>0)useBattleItem(ball);
    };
  }
};

const v105OriginalAttemptCapture = attemptCapture;
attemptCapture = async function(ballName,power){
  S.lastBallUsed=ballName;
  return v105OriginalAttemptCapture(ballName,power);
};
'''

if 'v105OriginalBattleMainMenu' not in s:
    s += patch

game.write_text(s,encoding='utf-8')

index = site / 'index.html'
i = index.read_text(encoding='utf-8')
if 'v105_mobile_battle_cleanup.css' not in i:
    i = i.replace('</head>','  <link rel="stylesheet" href="v105_mobile_battle_cleanup.css?v=mobile-105">\n</head>')
index.write_text(i,encoding='utf-8')
