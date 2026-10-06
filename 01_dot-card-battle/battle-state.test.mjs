import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID } from './cards.js';
import { createGame, evaluateGroup, describeSelectedCards, guaranteedClears, autoSelectGroup, playableCardHints } from './battle-state.js';
const cards=(...ids)=>ids.map(id=>CARD_BY_ID.get(id));
const random=seed=>()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
test('all 54 distinct cards are distributed to 2–4 players',()=>{
 for(const count of [2,3,4]){const s=createGame(count,random(17));const hands=s.players.map(p=>p.hand.length);assert.equal(hands.reduce((a,b)=>a+b),54);assert.ok(Math.max(...hands)-Math.min(...hands)<=1);assert.equal(new Set(s.players.flatMap(p=>p.hand.map(c=>c.id))).size,54)}
});
test('groups use both Jokers up to six cards',()=>{
 assert.equal(evaluateGroup(cards('spades-7','joker-red')).rank,7);
 assert.equal(evaluateGroup(cards('spades-7','hearts-7','diamonds-7','clubs-7','joker-red','joker-black')).count,6);
 assert.equal(evaluateGroup(cards('spades-7','hearts-8','joker-red')),null);
});
test('play button describes the selected combination',()=>{
 assert.equal(describeSelectedCards([]),'0枚出す');
 assert.equal(describeSelectedCards(cards('spades-5','hearts-5')),'5を2枚出す');
 assert.equal(describeSelectedCards(cards('spades-5','joker-red')),'5＋Joker(代用) · 2枚出す');
 assert.equal(describeSelectedCards(cards('spades-5','hearts-6')),'組み合わせ不可 · 2枚');
});
test('automatic group selection requires an exact natural-card count',()=>{
 const hand=cards('spades-4','hearts-4','spades-5','hearts-5','diamonds-5','joker-red');
 assert.deepEqual(autoSelectGroup(hand,{type:'group',count:2},'spades-4'),['spades-4','hearts-4']);
 assert.equal(autoSelectGroup(hand,{type:'group',count:2},'spades-5'),null);
 assert.equal(autoSelectGroup(hand,{type:'stair',count:3},'spades-4'),null);
});
test('hints and guaranteed clears share the legal move engine',()=>{
 const hand=cards('spades-4','hearts-4','spades-5','joker-red');
 const hints=playableCardHints(hand);
 assert.ok(hints.naturalIds.has('spades-4'));
 assert.ok(hints.wildIds.has('joker-red'));
 assert.ok(guaranteedClears(cards('joker-red','joker-black'),[]).some(m=>m.count===2&&m.rank===16));
});
