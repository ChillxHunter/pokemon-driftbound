#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: apply_v89.py <site-dir>')

site = Path(sys.argv[1])
p = site / 'game.js'
s = p.read_text()

old = """function tryMove(dx,dy){
  if(!S.started||inputLocked||B||activePanel||!DOM.dialogue.classList.contains('hidden'))return;
  const dir=dx<0?'left':dx>0?'right':dy<0?'up':'down';S.player.dir=dir;
  const nx=S.player.x+dx,ny=S.player.y+dy;
  if(!walkable(nx,ny)){S.player.frame=(S.player.frame+1)%2;updateInteractionHint();return}
  S.player.x=nx;S.player.y=ny;S.player.frame=(S.player.frame+1)%2;S.steps++;S.stepsSinceShift++;S.safeSteps=Math.max(0,S.safeSteps-1);
"""
new = """function directionForVector(dx,dy){
  if(dx>0&&dy<0)return 'up-right';
  if(dx<0&&dy<0)return 'up-left';
  if(dx>0&&dy>0)return 'down-right';
  if(dx<0&&dy>0)return 'down-left';
  return dx<0?'left':dx>0?'right':dy<0?'up':'down';
}

function tryMove(dx,dy){
  if(!S.started||inputLocked||B||activePanel||!DOM.dialogue.classList.contains('hidden'))return;
  if(!dx&&!dy)return;
  dx=Math.sign(dx);dy=Math.sign(dy);
  S.player.dir=directionForVector(dx,dy);
  const nx=S.player.x+dx,ny=S.player.y+dy;
  if(dx&&dy){
    const sideX=walkable(S.player.x+dx,S.player.y);
    const sideY=walkable(S.player.x,S.player.y+dy);
    if(!sideX&&!sideY){S.player.frame=(S.player.frame+1)%2;updateInteractionHint();return}
  }
  if(!walkable(nx,ny)){S.player.frame=(S.player.frame+1)%2;updateInteractionHint();return}
  S.player.x=nx;S.player.y=ny;S.player.frame=(S.player.frame+1)%2;S.steps++;S.stepsSinceShift++;S.safeSteps=Math.max(0,S.safeSteps-1);
"""
if old not in s:
    raise SystemExit('v89 patch: tryMove block not found')
s = s.replace(old, new, 1)

old = """function movementForKey(key){
  return ({w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]})[key]||null;
}

function processHeldMovement(time){
  if(!heldMovement.size||time-lastHeldMove<HELD_MOVE_INTERVAL)return;
  const key=Array.from(heldMovement).at(-1),move=movementForKey(key);
  if(move){lastHeldMove=time;tryMove(move[0],move[1])}
}
"""
new = """function movementForKey(key){
  return ({w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]})[key]||null;
}

function heldMovementVector(){
  const up=heldMovement.has('w')||heldMovement.has('arrowup');
  const down=heldMovement.has('s')||heldMovement.has('arrowdown');
  const left=heldMovement.has('a')||heldMovement.has('arrowleft');
  const right=heldMovement.has('d')||heldMovement.has('arrowright');
  return [(right?1:0)-(left?1:0),(down?1:0)-(up?1:0)];
}

function processHeldMovement(time){
  if(!heldMovement.size)return;
  const move=heldMovementVector();
  if(!move[0]&&!move[1])return;
  const diagonal=!!(move[0]&&move[1]);
  const interval=HELD_MOVE_INTERVAL*(diagonal?Math.SQRT2:1);
  if(time-lastHeldMove<interval)return;
  lastHeldMove=time;
  tryMove(move[0],move[1]);
}
"""
if old not in s:
    raise SystemExit('v89 patch: held movement block not found')
s = s.replace(old, new, 1)

old = """    const movement=movementForKey(key);
    if(movement){
      if(!heldMovement.has(key)){heldMovement.add(key);lastHeldMove=performance.now();tryMove(movement[0],movement[1])}
      return;
    }
"""
new = """    const movement=movementForKey(key);
    if(movement){
      if(!heldMovement.has(key)){
        const wasIdle=heldMovement.size===0;
        heldMovement.add(key);
        if(wasIdle)lastHeldMove=performance.now()-HELD_MOVE_INTERVAL*Math.SQRT2;
      }
      return;
    }
"""
if old not in s:
    raise SystemExit('v89 patch: keydown block not found')
s = s.replace(old, new, 1)

old = """    btn.onpointerdown=e=>{e.preventDefault();const move=movementForKey(key);heldMovement.add(key);lastHeldMove=performance.now();tryMove(move[0],move[1])};
"""
new = """    btn.onpointerdown=e=>{e.preventDefault();const wasIdle=heldMovement.size===0;heldMovement.add(key);if(wasIdle)lastHeldMove=performance.now()-HELD_MOVE_INTERVAL*Math.SQRT2};
"""
if old not in s:
    raise SystemExit('v89 patch: touch movement block not found')
s = s.replace(old, new, 1)
p.write_text(s)

index = site / 'index.html'
i = index.read_text()
i = i.replace('movement_patch.js?v=movement-88', 'movement_patch.js?v=movement-89')
i = i.replace('game.js?v=capture-throw-86', 'game.js?v=movement-89')
i = i.replace('game.js?v=movement-88', 'game.js?v=movement-89')
index.write_text(i)
