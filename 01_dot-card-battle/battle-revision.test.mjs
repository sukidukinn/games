import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID } from './cards.js';
import { evaluateMove, playMove, passTurn, validateMove } from './battle-state.js';

const cards=(...ids)=>ids.map(id=>CARD_BY_ID.get(id));
const state=(hands,extra={})=>({
  players:hands.map((ids,id)=>({id,name:id?'CPU '+id:'あなた',hand:cards(...ids)})),
  turn:0,pile:null,playedCards:[],passed:[],finishOrder:[],retired:[],fouls:[],demoted:[],
  status:'playing',revolution:false,jackBack:false,pendingRevolution:false,lock:null,
  previousChampion:null,options:{},...extra,
});

test('Joker pair clears both an empty field and a lower pair',()=>{
 const hand=['joker-red','joker-black','spades-4'];
 for(const pile of [null,{...evaluateMove(cards('spades-9','hearts-9')),cards:cards('spades-9','hearts-9'),player:1}]){
  const result=playMove(state([hand,['spades-3','hearts-3']],{pile}),0,['joker-red','joker-black']);
  assert.equal(result.error,null);
  assert.equal(result.state.pile,null);
 }
});
test('longest Joker-top stairs clear, including K-JK-2-JK',()=>{
 for(const ids of [
  ['spades-k','spades-a','spades-2','joker-red'],
  ['spades-q','spades-k','spades-a','spades-2','joker-red'],
  ['spades-k','spades-2','joker-red','joker-black'],
 ]){
  const move=evaluateMove(cards(...ids),false,'stair');
  assert.equal(move.strongest,true);
  const result=playMove(state([[...ids,'hearts-4'],['clubs-5']]),0,ids,'stair');
  assert.equal(result.state.pile,null);
 }
});
test('Joker position is strongest automatically but triple versus stair is chosen',()=>{
 assert.deepEqual(evaluateMove(cards('spades-4','spades-5','joker-red'),false,'stair').sequence,[4,5,6]);
 const ids=['spades-5','joker-red','joker-black'];
 const start=state([[...ids,'hearts-4'],['clubs-9']]);
 assert.equal(validateMove(start,0,ids,'group').group.type,'group');
 assert.equal(validateMove(start,0,ids,'stair').group.type,'stair');
});
test('a Joker cannot establish a new lock, but keeps an existing lock',()=>{
 const previous={...evaluateMove(cards('hearts-5')),cards:cards('hearts-5'),player:1};
 const fromJoker=playMove(state([['joker-red','spades-4'],['spades-3']],{pile:previous}),0,['joker-red']).state;
 assert.equal(fromJoker.lock,null);
 const locked=state([['joker-red','spades-4'],['spades-3']],{pile:previous,lock:['hearts']});
 const afterJoker=playMove(locked,0,['joker-red']).state;
 assert.deepEqual(afterJoker.lock,['hearts']);
 assert.equal(validateMove({...afterJoker,turn:1},1,['spades-3']).ok,true);
 assert.equal(playMove({...afterJoker,turn:1},1,['spades-3']).state.pile,null);
});
test('final 8888 causes revolution and cut despite foul ranking',()=>{
 const ids=['spades-8','hearts-8','diamonds-8','clubs-8'];
 const result=playMove(state([ids,['spades-4']]),0,ids).state;
 assert.equal(result.revolution,true);
 assert.equal(result.pile,null);
 assert.deepEqual(result.fouls,[0]);
 assert.deepEqual(result.finishOrder,[1,0]);
});
test('revolution finish judges the rank before playing',()=>{
 const threes=['spades-3','hearts-3','diamonds-3','clubs-3'];
 const normal=playMove(state([threes,['spades-5']]),0,threes).state;
 assert.equal(normal.revolution,true);
 assert.deepEqual(normal.fouls,[]);
 assert.deepEqual(normal.finishOrder,[0,1]);
 const twos=['spades-2','hearts-2','diamonds-2','clubs-2'];
 const reversed=playMove(state([twos,['spades-5']],{revolution:true}),0,twos).state;
 assert.equal(reversed.revolution,false);
 assert.deepEqual(reversed.fouls,[]);
 assert.deepEqual(reversed.finishOrder,[0,1]);
});
test('a foul does not demote the champion; a later valid finish does',()=>{
 const start=state([
  ['spades-4','hearts-4'],['spades-2'],['spades-5'],['spades-6','hearts-6']
 ],{turn:1,previousChampion:0});
 const foul=playMove(start,1,['spades-2']).state;
 assert.deepEqual(foul.demoted,[]);
 assert.ok(!foul.retired.includes(0));
 const valid=playMove({...foul,turn:2},2,['spades-5']).state;
 assert.deepEqual(valid.demoted,[0]);
 assert.ok(valid.retired.includes(0));
});
test('a foul after demotion ranks below the demoted champion',()=>{
 const start=state([
  ['spades-4','hearts-4'],['spades-5'],['spades-2'],['spades-6','hearts-6']
 ],{turn:1,previousChampion:0});
 const first=playMove(start,1,['spades-5']).state;
 const second=playMove({...first,turn:2},2,['spades-2']).state;
 assert.equal(second.status,'finished');
 assert.deepEqual(second.finishOrder,[1,3,0,2]);
});
test('a player who cuts while going out yields the lead to the next active player',()=>{
 const result=playMove(state([['spades-8'],['spades-4','hearts-4'],['spades-5','hearts-5']]),0,['spades-8']).state;
 assert.equal(result.pile,null);
 assert.equal(result.turn,1);
 assert.ok(result.fouls.includes(0));
});
test('11-back lasts until clear, including passes and J groups',()=>{
 const start=state([['spades-j','spades-4'],['hearts-10','hearts-5'],['clubs-9','clubs-6']],{options:{elevenBack:true}});
 const first=playMove(start,0,['spades-j']).state;
 assert.equal(first.jackBack,true);
 const second=playMove({...first,turn:1},1,['hearts-10']).state;
 assert.equal(second.jackBack,true);
 const stillOnField={...second,pile:{...evaluateMove(cards('hearts-10')),cards:cards('hearts-10'),player:1},turn:2};
 assert.equal(validateMove(stillOnField,2,['clubs-9']).ok,true);
 const pass=passTurn({...first,turn:1},1).state;
 assert.equal(pass.jackBack,true);
});
test('four Jacks combine revolution and 11-back',()=>{
 const s=state([['spades-j','hearts-j','diamonds-j','clubs-j','spades-4'],['spades-q','hearts-q','diamonds-q','clubs-q','spades-3']],{options:{elevenBack:true}});
 const n=playMove(s,0,['spades-j','hearts-j','diamonds-j','clubs-j']).state;
 assert.equal(n.revolution,true);
 assert.equal(n.jackBack,true);
 assert.ok(n.pile);
 assert.equal(validateMove({...n,turn:1},1,['spades-q','hearts-q','diamonds-q','clubs-q']).ok,true);
});
test('full suit matching establishes lock for pairs and ignores partial matches',()=>{
 const first={...evaluateMove(cards('spades-5','hearts-5')),cards:cards('spades-5','hearts-5'),player:1};
 const s=state([['spades-7','hearts-7','diamonds-7','spades-9'],['spades-9','hearts-9','clubs-8','hearts-8']],{pile:first});
 assert.deepEqual(playMove(s,0,['spades-7','hearts-7']).state.lock,['hearts','spades']);
 assert.equal(playMove(s,0,['spades-7','diamonds-7']).state.lock,null);
});
test('complete lock needs next rank, allows singleton Joker, and clears with field',()=>{
 const first={...evaluateMove(cards('hearts-6')),cards:cards('hearts-6'),player:1};
 const s=state([['hearts-7','hearts-8','hearts-9','joker-red','spades-4'],['hearts-8','clubs-4']],{pile:first,options:{fullLock:true}});
 const n=playMove(s,0,['hearts-7']).state;
 assert.deepEqual(n.lock,['hearts']);
 assert.equal(n.numberLock,true);
 const turn={...n,turn:1,players:[n.players[0],{...n.players[1],hand:cards('hearts-8','hearts-9','joker-red','spades-4')}]};
 assert.equal(validateMove(turn,1,['hearts-8']).ok,true);
 assert.equal(validateMove(turn,1,['hearts-9']).ok,false);
 assert.equal(validateMove(turn,1,['joker-red']).ok,true);
 assert.equal(passTurn(turn,1).state.numberLock,false);
});
test('complete lock follows reversed strength and is optional',()=>{
 const first={...evaluateMove(cards('hearts-7')),cards:cards('hearts-7'),player:1};
 const s=state([['hearts-6','hearts-5','hearts-4','spades-4'],['hearts-5','clubs-4']],{pile:first,revolution:true,options:{fullLock:true}});
 const n=playMove(s,0,['hearts-6']).state;
 assert.equal(n.numberLock,true);
 const turn={...n,turn:1,players:[n.players[0],{...n.players[1],hand:cards('hearts-5','hearts-4','spades-4')}]};
 assert.equal(validateMove(turn,1,['hearts-5']).ok,true);
 assert.equal(validateMove(turn,1,['hearts-4']).ok,false);
 assert.equal(playMove({...s,options:{}},0,['hearts-6']).state.numberLock,false);
});
test('complete lock applies to full-suit pairs and Joker substitutes',()=>{
 const first={...evaluateMove(cards('spades-5','hearts-5')),cards:cards('spades-5','hearts-5'),player:1};
 const s=state([['spades-6','hearts-6','spades-7','hearts-7','joker-red','spades-4'],['spades-7','hearts-7','clubs-4']],{pile:first,options:{fullLock:true}});
 const n=playMove(s,0,['spades-6','hearts-6']).state;
 assert.equal(n.numberLock,true);
 const turn={...n,turn:1,players:[n.players[0],{...n.players[1],hand:cards('spades-7','hearts-7','spades-9','hearts-9','joker-red')}]};
 assert.equal(validateMove(turn,1,['spades-7','hearts-7']).ok,true);
 assert.equal(validateMove(turn,1,['spades-9','hearts-9']).ok,false);
 assert.equal(validateMove(turn,1,['spades-7','joker-red']).ok,true);
});
test('five-card stair revolution is optional; four cards never trigger it',()=>{
 const five=['clubs-9','clubs-8','clubs-7','clubs-6','clubs-5'];
 const four=five.slice(1);
 for(const enabled of [false,true]){
  const s=state([[...five,'spades-3'],['hearts-8','hearts-7','hearts-6','hearts-5','hearts-4']],{options:{stairRevolution:enabled}});
  assert.equal(playMove(s,0,four).state.revolution,false);
  assert.equal(playMove(s,0,five).state.revolution,enabled);
 }
});
