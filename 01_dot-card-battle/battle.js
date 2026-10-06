import { initShell } from './shell.js';
import { createGame, shuffleCards, sortHand, evaluateMove, playMove, passTurn, chooseCpuMove, guaranteedClears, autoSelectGroup, playableCardHints, describeSelectedCards, RANK_LABEL, CLASS_NAMES } from './battle-state.js';
import { MAX_ROUNDS, newSeries, recordRound, exchangePairs, eligibleLowerCards, validLowerSelection, chooseLowerCards, exchangeDealtHands } from './series.js';

const shell = initShell({ page: 'battle' });
const setup = document.querySelector('#battle-setup');
const game = document.querySelector('#battle-game');
const result = document.querySelector('#battle-result');
const exchangeSetup = document.querySelector('#exchange-setup');
const handScroll = document.querySelector('#hand-scroll');
const handStage = document.querySelector('#hand-stage');
const field = document.querySelector('#battle-field');
const slot = document.querySelector('#field-card-slot');
const message = document.querySelector('#battle-message');
const playButton = document.querySelector('#play-button');
const passButton = document.querySelector('#pass-button');
let state = null;
let playerCount = 2;
let selectedIds = new Set();
let autoSelectedIds = null;
let drag = null;
let cpuTimer = null;
let pileLayers = [];
let lastPileKey = '';
let animationBusy = false;
let animationRun = 0;
let noticeTimer = null;
let selectedKind = 'auto';
let pendingDeck = null;
let pendingPrevious = null;
let exchangeSelected = new Set();
let pendingSelections = {};
let exchangeRole = null;
let series = null;
let scoredState = null;
let cpuPortraits = [];
const portraits = [
  'joker-source/red.png','joker-source/black.png','characters/circus/clown.png',
  'characters/circus/ringmaster.png','characters/masquerade/owl.png',
  'characters/myth/dragon.png','characters/myth/phoenix.png',
  'characters/zodiac/leo.png','characters/zodiac/scorpio.png',
  'characters/court/spades-k.png','characters/court/hearts-q.png',
];
const portraitFor = id => `./assets/${cpuPortraits[id] || 'joker-source/red.png'}`;

function hideNotice() {
  clearTimeout(noticeTimer);
  noticeTimer = null;
  message.hidden = true;
  message.textContent = '';
}

function showNotice(text) {
  hideNotice();
  message.textContent = text;
  message.hidden = false;
  noticeTimer = setTimeout(hideNotice, 2200);
}

function cardPlane(card, { faceUp = true } = {}) {
  const plane = document.createElement('div');
  plane.className = 'card-plane';
  plane.setAttribute('role', 'img');
  plane.setAttribute('aria-label', card.label);
  const front = document.createElement('img');
  front.className = 'plane-face front';
  front.src = `./assets/cards/${card.id}.png`;
  front.alt = '';
  const back = document.createElement('img');
  back.className = 'plane-face back';
  back.src = './assets/cards/player-1.png';
  back.alt = '';
  const index = document.createElement('span');
  index.className = 'plane-index';
  index.textContent = card.suit === 'joker' ? 'JK' : `${card.rank}${card.symbol}`;
  index.classList.toggle('red', card.color === 'red');
  plane.append(front, back, index);
  if (!faceUp) plane.classList.add('face-down');
  return plane;
}

function show(view) {
  setup.hidden = view !== 'setup';
  game.hidden = view !== 'game';
  result.hidden = view !== 'result';
  exchangeSetup.hidden = view !== 'exchange';
}

function readOptions() {
  return { elevenBack: document.querySelector('#option-eleven').checked, stairRevolution: document.querySelector('#option-stair-revolution').checked, fullLock: document.querySelector('#option-full-lock').checked };
}

function startGame(count = playerCount, previous = null, exchanged = null, deck = null) {
  hideNotice();
  animationRun++;
  animationBusy = false;
  slot.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  clearTimeout(cpuTimer);
  cpuTimer = null;
  playerCount = count;
  if (!previous) {
    series = newSeries(count);
    cpuPortraits = [null,...Array.from({length:count-1},() => portraits[Math.floor(Math.random()*portraits.length)])];
  }
  state = createGame(count, Math.random, readOptions(), previous, exchanged, deck);
  scoredState = null;
  selectedIds = new Set();
  selectedKind = 'auto';
  autoSelectedIds = null;
  pileLayers = [];
  lastPileKey = '';
  void shell.audio.start();
  shell.audio.play('nav');
  show('game');
  render();
}

function render() {
  if (!state) return;
  if (state.status === 'finished') { renderResult(); return; }
  show('game');
  const humanTurn = state.turn === 0 && state.players[0].hand.length > 0;
  document.querySelector('#series-live').textContent = `${series.rounds.length + 1}/${MAX_ROUNDS}戦 · あなた ${series.scores[0] >= 0 ? '+' : ''}${series.scores[0]}pt · 連勝 ${series.streaks[0]}`;
  document.querySelector('#turn-heading').textContent = humanTurn ? 'あなたの番' : `${state.players[state.turn].name}の番`;
  document.querySelector('#hand-count').textContent = state.players[0].hand.length;
  document.querySelector('#pile-info').textContent = state.pile ? `${state.pile.type === 'stair' ? '階段' : '組'}${state.pile.count}枚 · ${RANK_LABEL[state.pile.rank]}` : 'なし';
  document.querySelector('#rule-info').textContent = [state.revolution ? '革命' : '通常', state.jackBack ? 'Jバック' : '', state.numberLock ? '完全縛り' : state.lock ? '縛り' : '', state.pendingRevolution ? '革命待機' : ''].filter(Boolean).join(' · ');
  document.querySelector('#turn-info').textContent = state.players[state.turn].name;
  const selectedCards = state.players[0].hand.filter(card => selectedIds.has(card.id));
  const both = !state.pile && evaluateMove(selectedCards, state.revolution !== state.jackBack, 'group') && evaluateMove(selectedCards, state.revolution !== state.jackBack, 'stair');
  document.querySelector('#move-kind-row').hidden = !both;
  document.querySelector('#kind-group').classList.toggle('active', selectedKind !== 'stair');
  document.querySelector('#kind-stair').classList.toggle('active', selectedKind === 'stair');
  playButton.textContent = describeSelectedCards(selectedCards, state, selectedKind);
  playButton.setAttribute('aria-label', playButton.textContent);
  playButton.disabled = !humanTurn || selectedIds.size === 0;
  passButton.disabled = !humanTurn || !state.pile;
  renderOpponents();
  renderPile();
  renderHand();
  renderTracker();
  shell.setDetails([
    ['画面', '大富豪対戦'], ['人数', `${state.players.length}人`], ['現在の手番', state.players[state.turn].name],
    ['あなたの手札', `${state.players[0].hand.length}枚`], ['場', state.pile ? `${state.pile.type === 'stair' ? '階段' : '組'}${state.pile.count}枚 · ${RANK_LABEL[state.pile.rank]}` : 'なし'],
    ['パス数', `${state.passCount}`], ['順位確定', `${state.finishOrder.length}人`], ['選択中', `${selectedIds.size}枚`],
    ['カード寸法', '63.5 × 88.9 mm (5:7)'],
  ]);
  scheduleCpu();
}

function renderTracker() {
  const hand = state.players[0].hand;
  const playedCards = state.playedCards || [];
  const moves = state.status === 'playing' && state.turn === 0 ? guaranteedClears(hand, playedCards, state.pile, state) : [];
  moves.sort((a, b) => b.cards.length - a.cards.length || a.rank - b.rank);
  const labels = [...new Set(moves.map(move => move.cards.map(card => card.suit === 'joker' ? `${card.color === 'red' ? '赤' : '黒'}JK` : `${card.rank}${card.symbol}`).join(' + ')))].slice(0, 6);
  const hintMessage = state.status === 'finished' ? '対戦は終了しました。' : state.turn !== 0 ? 'あなたの番に候補を表示します。' : '';
  shell.setCardTracker({ hand, playedCards, guaranteed: labels, hintMessage });
}

function renderOpponents() {
  const root = document.querySelector('#opponents');
  root.replaceChildren();
  for (const player of state.players.slice(1)) {
    const box = document.createElement('div');
    box.className = `opponent ${state.turn === player.id ? 'active' : ''}`;
    const image = document.createElement('img');
    image.src = portraitFor(player.id);
    image.alt = '';
    const label = document.createElement('span');
    const place = state.finishOrder.indexOf(player.id);
    label.textContent = place >= 0 ? `${player.name} · ${place + 1}位 · ${series.scores[player.id]}pt` : `${player.name} · ${player.hand.length}枚 · ${series.scores[player.id]}pt`;
    box.append(image, label);
    root.append(box);
  }
}

function renderPile() {
  if (!state.pile) {
    pileLayers = [];
    lastPileKey = '';
    slot.replaceChildren();
    slot.textContent = '場は空です';
    return;
  }
  const key = `${state.pile.player}:${state.pile.cards.map(card => card.id).join(',')}`;
  if (key !== lastPileKey) {
    pileLayers.push(state.pile.cards.map(card => card));
    lastPileKey = key;
  }
  renderPileLayers();
}

function renderPileLayers() {
  slot.replaceChildren();
  const visibleLayers = pileLayers.slice(-8);
  visibleLayers.forEach((cards, layerIndex) => cards.forEach((card, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'played-card';
    wrapper.classList.add(layerIndex === visibleLayers.length - 1 ? 'newest' : 'older');
    const depth = layerIndex - visibleLayers.length + 1;
    const spread = Math.min(24, Math.max(15, (slot.clientWidth - 120) / Math.max(1, cards.length - 1)));
    const x = (index - (cards.length - 1) / 2) * spread + Math.sin((layerIndex + 1) * 2.4) * 10 + depth * 2;
    const y = Math.cos((layerIndex + 1) * 1.7) * 7 + depth * 3 + index * 2;
    const angle = Math.sin((layerIndex + 1) * 1.9 + index * 1.4) * 12;
    wrapper.style.setProperty('--field-x', `${x}px`);
    wrapper.style.setProperty('--field-y', `${y}px`);
    wrapper.style.setProperty('--field-angle', `${angle}deg`);
    wrapper.style.zIndex = String(layerIndex * 5 + index + 1);
    wrapper.append(cardPlane(card));
    slot.append(wrapper);
  }));
}

function renderHand() {
  handStage.replaceChildren();
  const hand = state.players[0].hand;
  const hints = state.turn === 0 ? playableCardHints(hand, state.pile, state) : { naturalIds: new Set(), wildIds: new Set() };
  const twoRows = hand.length >= 10;
  handScroll.classList.toggle('two-rows', twoRows);
  const firstRowCount = twoRows ? Math.ceil(hand.length / 2) : hand.length;
  const stageWidth = handScroll.clientWidth;
  handStage.style.width = `${stageWidth}px`;
  const edge = Math.min(49, stageWidth * .15);
  hand.forEach((card, index) => {
    const row = twoRows && index >= firstRowCount ? 1 : 0;
    const rowIndex = row ? index - firstRowCount : index;
    const rowCount = row ? hand.length - firstRowCount : firstRowCount;
    const gap = rowCount > 1 ? (stageWidth - edge * 2) / (rowCount - 1) : 0;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hand-card';
    button.dataset.cardId = card.id;
    button.setAttribute('aria-label', `${card.label} ${selectedIds.has(card.id) ? '選択中' : '選択'}`);
    if (hints.naturalIds.has(card.id)) {
      button.classList.add('can-play-natural');
      button.title = '出せる組の候補';
    } else if (hints.wildIds.has(card.id)) {
      button.classList.add('can-play-wild');
      button.title = 'ジョーカー代用で出せる候補';
    }
    button.setAttribute('aria-pressed', String(selectedIds.has(card.id)));
    button.disabled = state.turn !== 0;
    button.style.left = `${stageWidth / 2 + (rowIndex - (rowCount - 1) / 2) * gap}px`;
    button.style.top = twoRows ? `${row ? 146 : 52}px` : `${115 + Math.abs(rowIndex - (rowCount - 1) / 2) * .7}px`;
    button.style.zIndex = String((row ? 100 : 0) + rowIndex + 1);
    button.style.setProperty('--tilt', `${Math.max(-7, Math.min(7, (rowIndex - (rowCount - 1) / 2) * .9))}deg`);
    if (selectedIds.has(card.id)) button.classList.add('selected');
    button.append(cardPlane(card));
    button.addEventListener('pointerdown', onPointerDown);
    button.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleSelected(card.id);
    });
    handStage.append(button);
  });
}

function toggleSelected(id) {
  if (!state || state.turn !== 0 || animationBusy) return;
  if (selectedIds.has(id)) {
    if (autoSelectedIds?.has(id)) selectedIds = new Set();
    else selectedIds.delete(id);
    autoSelectedIds = null;
  } else {
    const group = autoSelectGroup(state.players[0].hand, state.pile, id);
    if (group) {
      selectedIds = new Set(group);
      autoSelectedIds = new Set(group);
    } else {
      selectedIds.add(id);
      autoSelectedIds = null;
    }
  }
  shell.audio.play('select');
  selectedKind = 'auto';
  render();
}

function submitSelected(ids = [...selectedIds]) {
  if (!state || state.turn !== 0 || animationBusy) return;
  const result = playMove(state, 0, ids, selectedKind);
  if (result.error) { showNotice(result.error); return; }
  void applyAction(result, { cards: ids.map(id => state.players[0].hand.find(card => card.id === id)), player: 0, cue: 'play' });
}

function onPointerDown(event) {
  if (event.button !== 0 || !state || state.turn !== 0 || animationBusy) return;
  event.preventDefault();
  const button = event.currentTarget;
  drag = { id: button.dataset.cardId, button, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
}
function onPointerMove(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (Math.hypot(dx, dy) > 6) drag.moved = true;
  if (!drag.moved) return;
  drag.button.classList.add('dragging');
  drag.button.style.setProperty('--drag-x', `${dx}px`);
  drag.button.style.setProperty('--drag-y', `${dy}px`);
  field.classList.toggle('drop-ready', insideField(event.clientX, event.clientY));
}
function insideField(x, y) {
  const rect = field.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
function stopDragging() {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerCancel);
  field.classList.remove('drop-ready');
}
function onPointerUp(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const { id, moved } = drag;
  stopDragging();
  drag = null;
  if (moved && insideField(event.clientX, event.clientY)) {
    const ids = selectedIds.has(id) ? [...selectedIds] : autoSelectGroup(state.players[0].hand, state.pile, id) || [...selectedIds, id];
    submitSelected(ids);
  } else if (!moved) toggleSelected(id);
  else render();
}
function onPointerCancel() {
  if (!drag) return;
  stopDragging();
  drag = null;
  render();
}

function animationDuration() {
  const mode = shell.getAnimationMode();
  return mode === 'slow' ? 1000 : mode === 'quick' ? 200 : 0;
}

async function animateCardsIn(cards, player, duration) {
  pileLayers.push(cards);
  lastPileKey = `${player}:${cards.map(card => card.id).join(',')}`;
  renderPileLayers();
  const incoming = [...slot.querySelectorAll('.played-card.newest')];
  const offset = player === 0 ? 155 : -155;
  const animations = incoming.map(wrapper => {
    const x = parseFloat(wrapper.style.getPropertyValue('--field-x'));
    const y = parseFloat(wrapper.style.getPropertyValue('--field-y'));
    const angle = parseFloat(wrapper.style.getPropertyValue('--field-angle'));
    return wrapper.animate([
      { transform: `translate(${x}px, ${y + offset}px) rotate(${angle - 10}deg) scale(.8)`, opacity: 0 },
      { transform: `translate(${x}px, ${y}px) rotate(${angle}deg) scale(1)`, opacity: 1 },
    ], { duration, easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'forwards' });
  });
  await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  animations.forEach(animation => animation.cancel());
}

async function animateCardsOut(player, duration) {
  const distance = (field.clientWidth + 180) * (player === 0 ? 1 : -1);
  const animations = [...slot.querySelectorAll('.played-card')].map(wrapper => {
    const x = parseFloat(wrapper.style.getPropertyValue('--field-x'));
    const y = parseFloat(wrapper.style.getPropertyValue('--field-y'));
    const angle = parseFloat(wrapper.style.getPropertyValue('--field-angle'));
    return wrapper.animate([
      { transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`, opacity: 1 },
      { transform: `translate(${x + distance}px, ${y - 20}px) rotate(${angle + (player === 0 ? 14 : -14)}deg)`, opacity: 0 },
    ], { duration, easing: 'ease-in', fill: 'forwards' });
  });
  await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  animations.forEach(animation => animation.cancel());
}

async function applyAction(action, { cards = null, player, cue }) {
  if (animationBusy) return;
  const nextState = action.state;
  const clearing = !nextState.pile && (cards || state.pile);
  const clearNotice = nextState.lastAction.includes('これより強く出せる') ? '返せる組なし · 場を流しました' : '場が流れました';
  const duration = animationDuration();
  shell.audio.play(cue);
  if (!duration) {
    if (clearing) shell.audio.play('clear');
    state = nextState;
    selectedIds = new Set();
    selectedKind = 'auto';
    autoSelectedIds = null;
    render();
    if (clearing && state.status === 'playing') showNotice(clearNotice);
    if (state.status === 'finished') shell.audio.play('win');
    return;
  }
  const run = ++animationRun;
  animationBusy = true;
  playButton.disabled = true;
  passButton.disabled = true;
  if (cards && player === 0) for (const card of cards) {
    handStage.querySelector(`[data-card-id="${card.id}"]`)?.classList.add('animating-out');
  }
  if (cards) await animateCardsIn(cards, player, duration);
  if (run !== animationRun) return;
  if (clearing) {
    shell.audio.play('clear');
    await animateCardsOut(player, duration);
  }
  if (run !== animationRun) return;
  state = nextState;
  selectedIds = new Set();
  selectedKind = 'auto';
  autoSelectedIds = null;
  animationBusy = false;
  render();
  if (clearing && state.status === 'playing') showNotice(clearNotice);
  if (state.status === 'finished') shell.audio.play('win');
}

function scheduleCpu() {
  if (!state || state.status !== 'playing' || state.turn === 0 || cpuTimer || animationBusy) return;
  cpuTimer = setTimeout(() => {
    cpuTimer = null;
    if (!state || state.status !== 'playing' || state.turn === 0 || animationBusy) return;
    const turn = state.turn;
    const move = chooseCpuMove(state, turn);
    const action = move ? playMove(state, turn, move) : passTurn(state, turn);
    if (action.error) { console.error(action.error); return; }
    void applyAction(action, { cards: move ? move.map(id => state.players[turn].hand.find(card => card.id === id)) : null, player: move ? turn : state.pile.player, cue: move ? 'play' : 'pass' });
  }, state.players[0].hand.length ? 650 : 120);
}

function renderResult() {
  clearTimeout(cpuTimer);
  cpuTimer = null;
  if (scoredState !== state) {
    recordRound(series, state.finishOrder);
    scoredState = state;
  }
  show('result');
  renderTracker();
  const round = series.rounds.length;
  const final = round === MAX_ROUNDS;
  document.querySelector('#result-round').textContent = `ROUND ${round} / ${MAX_ROUNDS}`;
  document.querySelector('#result-title').textContent = final ? '10戦の最終結果' : '決着';
  const list = document.querySelector('#result-list');
  list.replaceChildren(...state.finishOrder.map((id, index) => {
    const item = document.createElement('li');
    const earned = series.rounds.at(-1).points[id];
    item.textContent = `${index + 1}位 · ${CLASS_NAMES[state.players.length][index]} · ${state.players[id].name} ${earned > 0 ? '+' : ''}${earned}pt${state.fouls?.includes(id) ? '（反則上がり）' : ''}`;
    if (id === 0) item.className = 'human-place';
    return item;
  }));
  document.querySelector('#score-summary').replaceChildren(...series.scores.map((score,id) => {
    const row = document.createElement('div');
    row.textContent = `${id ? 'CPU '+id : 'あなた'}：${score >= 0 ? '+' : ''}${score}pt · 連勝 ${series.streaks[id]} · 最多 ${series.bestStreaks[id]}`;
    if (id === 0) row.className = 'human-place';
    return row;
  }));
  document.querySelector('#series-history').textContent = series.rounds.map((entry,index) => `${index+1}戦目 ${entry.finishOrder.map(id => `${id ? 'CPU '+id : 'あなた'} ${entry.points[id]>0?'+':''}${entry.points[id]}`).join(' > ')}`).join('\n');
  document.querySelector('#next-game').hidden = final;
  document.querySelector('#retry-game').textContent = final ? '新しく10戦を始める' : '最初からやり直す';
  shell.setDetails([['画面', final ? '10戦終了' : '決着'], ['対戦', `${round}/${MAX_ROUNDS}戦`], ['あなたの順位', `${state.finishOrder.indexOf(0) + 1}位`], ['あなたの累計', `${series.scores[0]}pt`], ['最多連勝', `${series.bestStreaks[0]}`]]);
}

document.querySelector('#start-game').addEventListener('click', () => startGame(Number(document.querySelector('#player-count').value)));
document.querySelector('#retry-game').addEventListener('click', () => startGame(playerCount));
document.querySelector('#kind-group').addEventListener('click', () => { selectedKind = 'group'; render(); });
document.querySelector('#kind-stair').addEventListener('click', () => { selectedKind = 'stair'; render(); });
document.querySelector('#next-game').addEventListener('click', () => {
  if (!state || state.status !== 'finished' || series.rounds.length >= MAX_ROUNDS) return;
  pendingPrevious = state;
  pendingDeck = shuffleCards();
  const dealt = Array.from({length:playerCount},(_,id)=>({id,hand:sortHand(pendingDeck.filter((_,index)=>index%playerCount===id))}));
  const pairs = exchangePairs(state.finishOrder);
  pendingSelections = {};
  for (const [high,low,count] of pairs) {
    if (high !== 0) pendingSelections[high] = [...dealt[high].hand].sort((a,b)=>a.power-b.power).slice(0,count).map(card=>card.id);
    if (low !== 0) pendingSelections[low] = chooseLowerCards(dealt[low].hand,count);
  }
  const pair = pairs.find(([high,low])=>high===0||low===0);
  if (!pair) { startGame(playerCount,pendingPrevious,pendingSelections,pendingDeck); return; }
  const [high,low,count] = pair;
  const isLower = low===0;
  exchangeRole = {high,low,count,isLower,dealt};
  const hand = dealt[0].hand;
  const eligible = isLower ? eligibleLowerCards(hand,count) : hand;
  const sorted = [...hand].sort((a,b)=>b.power-a.power);
  const boundary = sorted[count-1].power;
  exchangeSelected = new Set(isLower ? hand.filter(card=>card.power>boundary).map(card=>card.id) : []);
  const counterpart = isLower ? high : low;
  const otherRank = state.finishOrder.indexOf(counterpart);
  document.querySelector('#exchange-round').textContent = `ROUND ${series.rounds.length+1} / ${MAX_ROUNDS}`;
  document.querySelector('#exchange-instruction').textContent = isLower
    ? `${CLASS_NAMES[playerCount][state.finishOrder.indexOf(0)]}：最強${count}枚を${CLASS_NAMES[playerCount][otherRank]}に渡します。同じ強さの札はスートを選べます。`
    : `${CLASS_NAMES[playerCount][state.finishOrder.indexOf(0)]}：手札から渡す${count}枚を選んでください。全員の選択後に一斉交換します。`;
  const root = document.querySelector('#exchange-cards');
  root.replaceChildren(...eligible.map(card => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', card.label);
    const image = document.createElement('img');
    image.src = `./assets/cards/${card.id}.png`;
    image.alt = card.label;
    button.append(image);
    button.classList.toggle('chosen',exchangeSelected.has(card.id));
    if (isLower && card.power>boundary) button.disabled = true;
    button.addEventListener('click', () => {
      if (exchangeSelected.has(card.id)) exchangeSelected.delete(card.id);
      else if (exchangeSelected.size < count) exchangeSelected.add(card.id);
      button.classList.toggle('chosen', exchangeSelected.has(card.id));
      document.querySelector('#confirm-exchange').disabled = isLower
        ? !validLowerSelection(hand,count,[...exchangeSelected]) : exchangeSelected.size !== count;
    });
    return button;
  }));
  document.querySelector('#confirm-exchange').disabled = isLower
    ? !validLowerSelection(hand,count,[...exchangeSelected]) : true;
  document.querySelector('#confirm-exchange').hidden = false;
  document.querySelector('#exchange-receipt').hidden = true;
  document.querySelector('#exchange-okay').hidden = true;
  root.hidden = false;
  show('exchange');
});
document.querySelector('#confirm-exchange').addEventListener('click', () => {
  if (!exchangeRole) return;
  const {high,low,count,isLower,dealt} = exchangeRole;
  const ids = [...exchangeSelected];
  if (isLower ? !validLowerSelection(dealt[0].hand,count,ids) : ids.length!==count) return;
  pendingSelections[0] = ids;
  const exchanged = exchangeDealtHands(dealt,pendingPrevious.finishOrder,pendingSelections);
  const received = exchanged[0].hand.filter(card=>!dealt[0].hand.includes(card));
  const sent = ids.map(id=>dealt[0].hand.find(card=>card.id===id));
  const destination = isLower ? high : low;
  const destinationName = CLASS_NAMES[playerCount][pendingPrevious.finishOrder.indexOf(destination)];
  const cardNames = sent.map(card=>card.label).join('・');
  document.querySelector('#exchange-receipt').textContent = isLower
    ? `この${count}枚（${cardNames}）を${destinationName}に渡しました。${received.length}枚受け取りました。`
    : `${count}枚（${cardNames}）を渡しました。${received.length}枚受け取りました：${received.map(card=>card.label).join('・')}。`;
  document.querySelector('#exchange-receipt').hidden = false;
  document.querySelector('#exchange-cards').hidden = true;
  document.querySelector('#confirm-exchange').hidden = true;
  document.querySelector('#exchange-okay').hidden = false;
});
document.querySelector('#exchange-okay').addEventListener('click', () => {
  startGame(playerCount, pendingPrevious, pendingSelections, pendingDeck);
  pendingDeck = null;
  pendingPrevious = null;
  exchangeRole = null;
});
playButton.addEventListener('click', () => submitSelected());
passButton.addEventListener('click', () => {
  if (!state || animationBusy) return;
  const action = passTurn(state, 0);
  if (action.error) { showNotice(action.error); return; }
  void applyAction(action, { player: state.pile.player, cue: 'pass' });
});
field.addEventListener('click', () => { if (selectedIds.size) submitSelected(); });
window.addEventListener('resize', () => { if (state?.status === 'playing' && !animationBusy) render(); });
window.addEventListener('layoutchange', () => { if (state?.status === 'playing' && !animationBusy) render(); });
window.addEventListener('debugaction', event => {
  if (event.detail === 'draw') startGame(playerCount);
  if (event.detail === 'reset') {
    hideNotice();
    animationRun++;
    animationBusy = false;
    slot.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    clearTimeout(cpuTimer);
    cpuTimer = null;
    state = null;
    selectedIds = new Set();
    autoSelectedIds = null;
    shell.setCardTracker();
    show('setup');
  }
});
show('setup');
shell.setDetails([['画面', '対戦準備'], ['人数', '2〜4人'], ['カード', '54枚をすべて配布'], ['ルール', '3 < … < 2 < JOKER']]);
