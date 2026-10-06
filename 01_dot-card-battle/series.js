export const MAX_ROUNDS = 10;
export const POINTS = Object.freeze({2:[1,-1],3:[1,0,-1],4:[2,1,-1,-2]});

export function newSeries(playerCount) {
  return { playerCount, rounds:[], scores:Array(playerCount).fill(0), streaks:Array(playerCount).fill(0), bestStreaks:Array(playerCount).fill(0) };
}

export function recordRound(series, finishOrder) {
  if (finishOrder.length !== series.playerCount || series.rounds.length >= MAX_ROUNDS) throw new Error('Invalid round result');
  const points = Array(series.playerCount).fill(0);
  finishOrder.forEach((id,place) => {
    points[id] = POINTS[series.playerCount][place];
    series.scores[id] += points[id];
    series.streaks[id] = place === 0 ? series.streaks[id] + 1 : 0;
    series.bestStreaks[id] = Math.max(series.bestStreaks[id],series.streaks[id]);
  });
  series.rounds.push({finishOrder:[...finishOrder],points});
  return series.rounds.at(-1);
}

export function exchangePairs(ranking) {
  const pairs = [[ranking[0],ranking.at(-1),ranking.length === 3 ? 1 : 2]];
  if (ranking.length === 4) pairs.push([ranking[1],ranking[2],1]);
  return pairs;
}

export function eligibleLowerCards(hand,count) {
  const threshold = [...hand].sort((a,b) => b.power-a.power)[count-1].power;
  return hand.filter(card => card.power >= threshold);
}

export function validLowerSelection(hand,count,ids) {
  if (!Array.isArray(ids) || ids.length !== count || new Set(ids).size !== count) return false;
  const eligible = eligibleLowerCards(hand,count);
  const higher = hand.filter(card => card.power > [...hand].sort((a,b) => b.power-a.power)[count-1].power);
  return higher.every(card => ids.includes(card.id)) && ids.every(id => eligible.some(card => card.id === id));
}

export function chooseLowerCards(hand,count,random=Math.random) {
  const ordered = hand.map(card => ({card,tie:random()})).sort((a,b) => b.card.power-a.card.power || a.tie-b.tie);
  return ordered.slice(0,count).map(item => item.card.id);
}

export function exchangeDealtHands(players,ranking,selections={},random=Math.random) {
  const original = players.map(player => [...player.hand]);
  const outgoing = players.map(() => []);
  const incoming = players.map(() => []);
  for (const [high,low,count] of exchangePairs(ranking)) {
    const highHand = original[high], lowHand = original[low];
    const requestedHigh = selections[high];
    const highIds = Array.isArray(requestedHigh) && requestedHigh.length === count && new Set(requestedHigh).size === count && requestedHigh.every(id => highHand.some(card => card.id === id))
      ? requestedHigh : [...highHand].sort((a,b) => a.power-b.power).slice(0,count).map(card => card.id);
    const requestedLow = selections[low];
    const lowIds = validLowerSelection(lowHand,count,requestedLow) ? requestedLow : chooseLowerCards(lowHand,count,random);
    const fromHigh = highIds.map(id => highHand.find(card => card.id === id));
    const fromLow = lowIds.map(id => lowHand.find(card => card.id === id));
    outgoing[high].push(...fromHigh); incoming[low].push(...fromHigh);
    outgoing[low].push(...fromLow); incoming[high].push(...fromLow);
  }
  return players.map((player,id) => ({...player,hand:original[id].filter(card => !outgoing[id].includes(card)).concat(incoming[id])}));
}
