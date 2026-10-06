import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_BY_ID } from './cards.js';
import { createGame, chooseCpuMove, playMove, passTurn } from './battle-state.js';
import { MAX_ROUNDS, POINTS, newSeries, recordRound, eligibleLowerCards, validLowerSelection, exchangeDealtHands } from './series.js';

const cards=(...ids)=>ids.map(id=>CARD_BY_ID.get(id));

test('points, win streak, and ten-round limit work for each player count',()=>{
  for (const count of [2,3,4]) {
    const series=newSeries(count);
    const order=Array.from({length:count},(_,id)=>id);
    for(let round=0;round<MAX_ROUNDS;round++) recordRound(series,order);
    assert.deepEqual(series.scores,POINTS[count].map(value=>value*MAX_ROUNDS));
    assert.equal(series.streaks[0],MAX_ROUNDS);
    assert.equal(series.bestStreaks[0],MAX_ROUNDS);
    assert.throws(()=>recordRound(series,order));
  }
  const series=newSeries(2);
  recordRound(series,[0,1]);
  recordRound(series,[1,0]);
  assert.deepEqual(series.scores,[0,0]);
  assert.deepEqual(series.streaks,[0,1]);
  assert.deepEqual(series.bestStreaks,[1,1]);
});

test('lower player must give strongest cards but chooses among equal ranks',()=>{
  const hand=cards('joker-red','joker-black','spades-2','hearts-2','clubs-3');
  assert.deepEqual(eligibleLowerCards(hand,2).map(card=>card.id),['joker-red','joker-black']);
  assert.equal(validLowerSelection(hand,2,['joker-red','joker-black']),true);
  assert.equal(validLowerSelection(hand,2,['joker-red','spades-2']),false);
  const tied=cards('spades-2','hearts-2','diamonds-2','clubs-4');
  assert.equal(validLowerSelection(tied,2,['hearts-2','diamonds-2']),true);
  assert.equal(validLowerSelection(tied,2,['hearts-2','clubs-4']),false);
});

test('both selected outgoing cards are exchanged simultaneously',()=>{
  const dealt=[
    {id:0,hand:cards('spades-3','hearts-4','clubs-5')},
    {id:1,hand:cards('spades-9','hearts-9','clubs-2')},
    {id:2,hand:cards('spades-2','hearts-2','clubs-6')},
    {id:3,hand:cards('joker-red','joker-black','clubs-7')},
  ];
  const exchanged=exchangeDealtHands(dealt,[0,1,2,3],{
    0:['spades-3','clubs-5'],1:['spades-9'],
    2:['spades-2'],3:['joker-red','joker-black'],
  });
  assert.deepEqual(exchanged[0].hand.map(card=>card.id),['hearts-4','joker-red','joker-black']);
  assert.deepEqual(exchanged[3].hand.map(card=>card.id),['clubs-7','spades-3','clubs-5']);
  assert.deepEqual(exchanged[1].hand.map(card=>card.id),['hearts-9','clubs-2','spades-2']);
  assert.deepEqual(exchanged[2].hand.map(card=>card.id),['hearts-2','clubs-6','spades-9']);
  assert.deepEqual(dealt[0].hand.map(card=>card.id),['spades-3','hearts-4','clubs-5']);
});

test('a ten-game series completes with repeated exchange and zero-sum scores',()=>{
  let seed=31;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const series=newSeries(2);
  let previous=null;
  for(let round=0;round<MAX_ROUNDS;round++) {
    let game=createGame(2,random,{},previous);
    let steps=0;
    while(game.status==='playing'&&steps++<500) {
      const move=chooseCpuMove(game,game.turn);
      const action=move?playMove(game,game.turn,move):passTurn(game,game.turn);
      assert.equal(action.error,null);
      game=action.state;
    }
    assert.equal(game.status,'finished');
    recordRound(series,game.finishOrder);
    previous=game;
  }
  assert.equal(series.rounds.length,10);
  assert.equal(series.scores.reduce((a,b)=>a+b,0),0);
});
