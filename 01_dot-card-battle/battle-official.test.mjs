import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID } from './cards.js';
import { createGame, evaluateMove, validateMove, playMove, passTurn, chooseCpuMove, legalMoves } from './battle-state.js';
const c=(...ids)=>ids.map(id=>CARD_BY_ID.get(id));
const base=(hands,pile=null,extra={})=>({players:hands.map((hand,id)=>({id,name:id?'CPU '+id:'あなた',hand:c(...hand)})),turn:0,pile,playedCards:[],passed:[],passCount:0,finishOrder:[],retired:[],fouls:[],status:'playing',moveNumber:0,revolution:false,jackBack:false,pendingRevolution:false,lock:null,options:{},previousChampion:null,...extra});
const pile=(ids,type='group',rank=null,player=1)=>{const cards=c(...ids),m=evaluateMove(cards,false,type);return {...m,rank:rank??m.rank,cards,player}};
test('six of a kind uses four printed cards and both Jokers',()=>{
 const hand=c('spades-5','hearts-5','diamonds-5','clubs-5','joker-red','joker-black');
 assert.equal(evaluateMove(hand).count,6);
 const s=base([hand.map(x=>x.id),['spades-3']]);
 const n=playMove(s,0,hand.map(x=>x.id)).state;
 assert.equal(n.pile,null);
 assert.equal(n.fouls.includes(0),true);
});
test('stair compares its weakest card and A-2-Joker beats K-A-2',()=>{
 const s=base([['hearts-a','hearts-2','joker-red','spades-3'],['clubs-3']],pile(['spades-k','spades-a','spades-2'],'stair'));
 assert.equal(validateMove(s,0,['hearts-a','hearts-2','joker-red']).ok,true);
 assert.equal(playMove(s,0,['hearts-a','hearts-2','joker-red']).state.pile,null);
});
test('Jokers fill stair gaps and the strongest possible sequence is chosen',()=>{
 assert.deepEqual(evaluateMove(c('hearts-4','hearts-5','joker-red'),false,'stair').sequence,[4,5,6]);
 assert.deepEqual(evaluateMove(c('hearts-k','hearts-2','joker-red','joker-black'),false,'stair').sequence,[13,14,15,16]);
});
test('CPU can choose a Joker stair even when the printed next card is held',()=>{
 const hand=c('hearts-4','hearts-5','hearts-6','joker-red','joker-black');
 const moves=legalMoves(hand);
 assert.ok(moves.some(m=>m.type==='stair'&&['hearts-4','hearts-5','joker-red'].every(id=>m.cards.some(x=>x.id===id))));
 assert.ok(moves.some(m=>m.type==='group'&&m.count===3&&m.jokerCount===2));
 assert.ok(moves.some(m=>m.type==='stair'&&m.count===3&&m.jokerCount===2));
});
test('eight cut requires an eight group; a stair containing eight stays',()=>{
 const a=base([['spades-8','joker-red','spades-3'],['clubs-3','clubs-4']]);
 assert.equal(playMove(a,0,['spades-8','joker-red']).state.pile,null);
 const b=base([['spades-6','spades-7','spades-8','clubs-3'],['clubs-9','clubs-10','clubs-j']]);
 assert.ok(playMove(b,0,['spades-6','spades-7','spades-8']).state.pile);
});
test('four eights cause both revolution and immediate cut',()=>{
 const s=base([['spades-8','hearts-8','diamonds-8','clubs-8','spades-4'],['clubs-3']]);
 const n=playMove(s,0,['spades-8','hearts-8','diamonds-8','clubs-8']).state;
 assert.equal(n.revolution,true);
 assert.equal(n.pile,null);
});
test('spade three beats only a single Joker, even through a suit lock',()=>{
 const s=base([['spades-3','hearts-4'],['clubs-5']],pile(['joker-red']),{lock:['hearts']});
 assert.equal(validateMove(s,0,['spades-3']).ok,true);
 assert.equal(playMove(s,0,['spades-3']).state.pile,null);
 const pair=base([['spades-3'],['clubs-5']],pile(['joker-red','joker-black']));
 assert.equal(validateMove(pair,0,['spades-3']).ok,false);
});
test('two Jokers as a pair clear immediately and cannot be beaten by twos',()=>{
 const s=base([['joker-red','joker-black','spades-4'],['spades-2','hearts-2']],pile(['spades-9','hearts-9']));
 const n=playMove(s,0,['joker-red','joker-black']).state;
 assert.equal(n.pile,null);
 assert.equal(n.turn,0);
});
test('group revolution and counter revolution compare after the immediate flip',()=>{
 const s=base([['spades-9','hearts-9','diamonds-9','clubs-9','spades-3'],['spades-7','hearts-7','diamonds-7','clubs-7','spades-4']],null,{turn:0});
 const n=playMove(s,0,['spades-9','hearts-9','diamonds-9','clubs-9']).state;
 assert.equal(n.revolution,true);
 assert.ok(n.pile);
 assert.equal(validateMove({...n,turn:1},1,['spades-7','hearts-7','diamonds-7','clubs-7']).ok,true);
});
test('delayed group revolution waits for the clear',()=>{
 const s=base([['spades-9','hearts-9','diamonds-9','clubs-9','spades-3'],['spades-10','hearts-10','diamonds-10','clubs-10']],null,{options:{delayedRevolution:true}});
 const n=playMove(s,0,['spades-9','hearts-9','diamonds-9','clubs-9']).state;
 assert.equal(n.revolution,false);
 assert.equal(n.pendingRevolution,true);
 const cleared=passTurn({...n,turn:1},1).state;
 assert.equal(cleared.revolution,true);
});
test('optional five-card stair revolution can be countered by a weaker printed sequence',()=>{
 const s=base([['clubs-9','clubs-8','clubs-7','clubs-6','clubs-5','spades-3'],['hearts-8','hearts-7','hearts-6','hearts-5','hearts-4','spades-4']],null,{options:{stairRevolution:true}});
 const n=playMove(s,0,['clubs-9','clubs-8','clubs-7','clubs-6','clubs-5']).state;
 assert.equal(n.revolution,true);
 assert.ok(n.pile);
 assert.equal(validateMove({...n,turn:1},1,['hearts-8','hearts-7','hearts-6','hearts-5','hearts-4']).ok,true);
});
test('four-card stair never revolts, even with the option enabled',()=>{
 const s=base([['clubs-8','clubs-7','clubs-6','clubs-5','spades-3'],['hearts-7','hearts-6','hearts-5','hearts-4']],null,{options:{stairRevolution:true}});
 const n=playMove(s,0,['clubs-8','clubs-7','clubs-6','clubs-5']).state;
 assert.equal(n.revolution,false);
});
test('single-card suit lock persists with Joker and resets on a clear',()=>{
 const s=base([['hearts-5','hearts-7','joker-red'],['hearts-6','spades-8']],pile(['hearts-4']));
 const n=playMove(s,0,['hearts-5']).state;
 assert.deepEqual(n.lock,['hearts']);
 assert.equal(validateMove({...n,turn:1},1,['spades-8']).ok,false);
 assert.equal(validateMove({...n,turn:1},1,['hearts-6']).ok,true);
});
test('multi-suit lock accepts a Joker only for a missing locked suit',()=>{
 const p=pile(['spades-7','hearts-7']);
 const s=base([['spades-8','clubs-8','joker-red'],['clubs-3']],p,{lock:['hearts','spades']});
 assert.equal(validateMove(s,0,['spades-8','joker-red']).ok,true);
 assert.equal(validateMove(s,0,['clubs-8','joker-red']).ok,false);
});
test('pass cannot re-enter before clear',()=>{
 const s=base([['spades-j','spades-3'],['hearts-q','hearts-4'],['clubs-5']],null,{options:{elevenBack:true}});
 const n=playMove(s,0,['spades-j']).state;
 assert.equal(n.jackBack,true);
 const p=passTurn({...n,turn:1},1).state;
 assert.ok(p.passed.includes(1));
 assert.equal(validateMove({...p,turn:1},1,['hearts-q']).ok,false);
});
test('11-back reverses comparison until the field clears',()=>{
 const s=base([['spades-j','spades-3'],['hearts-10','hearts-4']],null,{options:{elevenBack:true}});
 const n=playMove(s,0,['spades-j']).state;
 assert.equal(n.jackBack,true);
 assert.equal(validateMove({...n,turn:1},1,['hearts-10']).ok,true);
 const end=playMove({...n,turn:1},1,['hearts-10']).state;
 assert.equal(end.jackBack,true);
 const cleared=passTurn(end,0).state;
 assert.equal(cleared.pile,null);
 assert.equal(cleared.jackBack,false);
});
test('former champion is demoted when another player finishes first',()=>{
 const s=base([['hearts-4'],['spades-4','spades-5'],['hearts-5','hearts-6'],['clubs-5','clubs-6']],null,{turn:1,previousChampion:0});
 const n=playMove(s,1,['spades-4','spades-5'],'stair');
 assert.ok(n.error);
 const s2={...s,players:s.players.map((p,i)=>i===1?{...p,hand:c('spades-7')}:p)};
 const end=playMove(s2,1,['spades-7']).state;
 assert.deepEqual(end.demoted,[0]);
 assert.ok(end.retired.includes(0));
 assert.ok(!end.finishOrder.includes(0));
});
test('card exchange sends the lower class strongest cards and chosen upper cards',()=>{
 const previous={finishOrder:[0,1,2,3]};
 const seed=()=>0.37;
 const raw=createGame(4,seed);
 const chosen=raw.players[0].hand.slice(0,2).map(x=>x.id);
 const next=createGame(4,seed,{},previous,chosen);
 assert.ok(chosen.every(id=>next.players[3].hand.some(c=>c.id===id)));
 assert.equal(new Set(next.players.flatMap(p=>p.hand.map(c=>c.id))).size,54);
});
test('three-player exchange sends one card between first and last',()=>{
 const previous={finishOrder:[0,1,2]},random=()=>0.42;
 const raw=createGame(3,random);
 const chosen=[raw.players[0].hand[0].id];
 const next=createGame(3,random,{},previous,chosen);
 assert.ok(next.players[2].hand.some(c=>c.id===chosen[0]));
 assert.equal(next.players.flatMap(p=>p.hand).length,54);
});
test('a foul finish ranks below a valid finish',()=>{
 const s=base([['joker-red'],['spades-4']]);
 const n=playMove(s,0,['joker-red']).state;
 assert.equal(n.status,'finished');
 assert.deepEqual(n.finishOrder,[1,0]);
});
test('CPU games terminate under the official rules',()=>{
 for(const count of [2,3,4])for(let seed=1;seed<=8;seed++){
  let value=seed,random=()=>((value=(value*1664525+1013904223)>>>0)/4294967296);
  let s=createGame(count,random,{stairRevolution:seed%2===0,elevenBack:seed%3===0,delayedRevolution:seed%4===0});
  let steps=0;
  while(s.status==='playing'&&steps++<500){const ids=chooseCpuMove(s,s.turn),action=ids?playMove(s,s.turn,ids):passTurn(s,s.turn);assert.equal(action.error,null,`count ${count} seed ${seed} step ${steps}`);s=action.state}
  assert.equal(s.status,'finished',`count ${count} seed ${seed}`);
  assert.equal(new Set(s.finishOrder).size,count);
 }
});
