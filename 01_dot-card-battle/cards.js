// Stable IDs and data for gameplay. Power follows common Daifugo order; rules can override it.
export const SUITS = Object.freeze([
  { id: 'spades', symbol: '♠', label: 'スペード', color: 'black' },
  { id: 'hearts', symbol: '♥', label: 'ハート', color: 'red' },
  { id: 'diamonds', symbol: '♦', label: 'ダイヤ', color: 'red' },
  { id: 'clubs', symbol: '♣', label: 'クラブ', color: 'black' },
]);
export const RANKS = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
export const FACE_CARDS = Object.freeze([
  ...SUITS.flatMap(suit => RANKS.map((rank, index) => Object.freeze({
    id: `${suit.id}-${rank.toLowerCase()}`,
    suit: suit.id, rank, symbol: suit.symbol, color: suit.color,
    label: `${suit.label} ${rank}`,
    power: rank === '2' ? 15 : rank === 'A' ? 14 : index + 1,
  }))),
  Object.freeze({ id: 'joker-red', suit: 'joker', rank: 'JOKER', symbol: '★', color: 'red', label: '赤のジョーカー', power: 16 }),
  Object.freeze({ id: 'joker-black', suit: 'joker', rank: 'JOKER', symbol: '★', color: 'black', label: '黒のジョーカー', power: 16 }),
]);
export const CARD_BACKS = Object.freeze([
  { id: 'player-1', label: 'プレイヤー 1', color: 'blue', mark: '◆' },
  { id: 'player-2', label: 'プレイヤー 2', color: 'rose', mark: '✦' },
  { id: 'player-3', label: 'プレイヤー 3', color: 'green', mark: '▲' },
  { id: 'player-4', label: 'プレイヤー 4', color: 'gold', mark: '●' },
]);
export const CARD_BY_ID = new Map(FACE_CARDS.map(card => [card.id, card]));
export const BACK_BY_ID = new Map(CARD_BACKS.map(back => [back.id, back]));

export function createCardElement(card, { back = false } = {}) {
  const el = document.createElement('img');
  el.className = 'card';
  el.dataset.cardId = card.id;
  el.alt = card.label;
  el.src = `./assets/cards/${card.id}.png`;
  el.width = 250;
  el.height = 350;
  el.decoding = 'async';
  return el;
}
