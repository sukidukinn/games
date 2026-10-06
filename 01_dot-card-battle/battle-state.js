import { FACE_CARDS } from './cards.js';
import { exchangeDealtHands } from './series.js';
export const MAX_GROUP_SIZE=6;
export const RANK_LABEL={3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A',15:'2',16:'JOKER'};
export const CLASS_NAMES={2:['大富豪','大貧民'],3:['富豪','平民','貧民'],4:['大富豪','富豪','貧民','大貧民']};
const SUITS={spades:0,hearts:1,diamonds:2,clubs:3,joker:4},BASE=Array.from({length:13},(_,i)=>i+3);
const opts=s=>({elevenBack:false,stairRevolution:false,fullLock:false,delayedRevolution:false,...s?.options});
const rev=s=>Boolean(s?.revolution)!==Boolean(s?.jackBack);
const seq=r=>[...(r?[...BASE].reverse():BASE),16];
const power=(n,r)=>n===16?13:seq(r).indexOf(n);
const suits=cards=>cards.filter(c=>c.suit!=='joker').map(c=>c.suit).sort();
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const suitMatch=(cards,want)=>{const rest=[...want];for(const s of suits(cards)){const i=rest.indexOf(s);if(i<0)return false;rest.splice(i,1)}return rest.length===cards.filter(c=>c.suit==='joker').length};
const active=(s,p)=>p.hand.length&&!(s.retired||[]).includes(p.id);
const next=(s,after,skip=[])=>{for(let i=1;i<=s.players.length;i++){const id=(after+i)%s.players.length;if(active(s,s.players[id])&&!skip.includes(id))return id}return null};
export function shuffleCards(cards=FACE_CARDS,random=Math.random){const a=[...cards];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function sortHand(hand){return [...hand].sort((a,b)=>a.power-b.power||SUITS[a.suit]-SUITS[b.suit])}
function exchange(players,ranking,selected,random){
  const selections=Array.isArray(selected)?{0:selected}:selected||{};
  const exchanged=exchangeDealtHands(players,ranking,selections,random);
  exchanged.forEach((player,id)=>{players[id].hand=player.hand});
}
export function createGame(count=2,random=Math.random,options={},previous=null,selected=null,deck=null){if(!Number.isInteger(count)||count<2||count>4)throw new RangeError('Players must be 2–4');const players=Array.from({length:count},(_,id)=>({id,name:id?'CPU '+id:'あなた',hand:[]}));(deck||shuffleCards(FACE_CARDS,random)).forEach((c,i)=>players[i%count].hand.push(c));if(previous?.finishOrder?.length===count)exchange(players,previous.finishOrder,selected,random);players.forEach(p=>p.hand=sortHand(p.hand));const turn=previous?.finishOrder?.length===count?previous.finishOrder.at(-1):players.findIndex(p=>p.hand.some(c=>c.id==='spades-3'));return {players,turn,pile:null,playedCards:[],passed:[],passCount:0,finishOrder:[],retired:[],fouls:[],demoted:[],status:'playing',moveNumber:0,lastAction:'対戦開始',revolution:false,jackBack:false,pendingRevolution:false,lock:null,numberLock:false,options:{...opts(),...options},previousChampion:previous?.finishOrder?.[0]??null}}
export function evaluateMove(cards,reverse=false,kind='auto'){if(!cards?.length||cards.length>15||new Set(cards.map(c=>c.id)).size!==cards.length)return null;const natural=cards.filter(c=>c.suit!=='joker'),jk=cards.length-natural.length;let group=null,stair=null;if(cards.length<=6&&(!natural.length||natural.every(c=>c.power===natural[0].power)))group={type:'group',count:cards.length,rank:natural[0]?.power??16,jokerCount:jk,suits:suits(cards)};if(cards.length>=3&&jk<=2&&natural.length&&natural.every(c=>c.suit===natural[0].suit)&&new Set(natural.map(c=>c.power)).size===natural.length){const a=seq(reverse),found=[];for(let i=0;i+cards.length<=a.length;i++){const window=a.slice(i,i+cards.length);if(natural.every(c=>window.includes(c.power))&&cards.length-natural.length===jk)found.push({type:'stair',count:cards.length,rank:window[0],top:window.at(-1),jokerCount:jk,suits:Array(cards.length).fill(natural[0].suit),sequence:window,strongest:window.at(-1)===16})}stair=found.sort((x,y)=>power(y.rank,reverse)-power(x.rank,reverse))[0]||null}return kind==='group'?group:kind==='stair'?stair:group||stair}
export function evaluateGroup(cards){return evaluateMove(cards,false,'group')}
export function describeSelectedCards(cards,state=null,kind='auto'){if(!cards.length)return '0枚出す';const m=evaluateMove(cards,rev(state),state?.pile?.type||kind);if(!m)return '組み合わせ不可 · '+cards.length+'枚';if(m.type==='stair')return m.sequence.map(x=>RANK_LABEL[x]).join('-')+'の階段 · '+m.count+'枚';if(m.rank===16)return 'Jokerを'+m.count+'枚出す';return RANK_LABEL[m.rank]+(m.jokerCount?'＋Joker'+(m.jokerCount>1?'×2':'')+'(代用) · ':'を')+m.count+'枚出す'}
const revolts=(s,m)=>m.type==='group'&&m.rank!==16&&m.count>=(s.players.length===3?3:4)||m.type==='stair'&&opts(s).stairRevolution&&m.count>=5;
const spade=(cards,p)=>cards.length===1&&cards[0].id==='spades-3'&&p?.type==='group'&&p.count===1&&p.rank===16;
const foul=(cards,m,s)=>cards.some(c=>c.suit==='joker'||c.power===(s.revolution?3:15))||m.type==='group'&&m.rank===8||cards.length===1&&cards[0].id==='spades-3';
export function validateMove(s,id,ids,kind='auto'){if(s.status!=='playing')return {ok:false,reason:'対戦は終了しています。'};if(s.turn!==id)return {ok:false,reason:'今はあなたの番ではありません。'};if(s.passed?.includes(id))return {ok:false,reason:'一度パスすると場が流れるまで出せません。'};if(!Array.isArray(ids)||!ids.length)return {ok:false,reason:'カードを選んでください。'};if(new Set(ids).size!==ids.length)return {ok:false,reason:'同じカードは選べません。'};const cards=ids.map(x=>s.players[id].hand.find(c=>c.id===x));if(cards.some(x=>!x))return {ok:false,reason:'手札にないカードが含まれています。'};const special=spade(cards,s.pile),m=evaluateMove(cards,rev(s),s.pile?.type||kind);if(!m)return {ok:false,reason:'同ランクの組、または同一スートの階段を選んでください。'};const revolution=revolts(s,m),compareReverse=rev(s)!==Boolean(revolution&&(!opts(s).delayedRevolution||m.type==='stair')),compared=evaluateMove(cards,compareReverse,m.type)||m;if(s.pile&&!special){if(m.count!==s.pile.count||m.type!==s.pile.type)return {ok:false,reason:'場と同じ枚数・構成で出してください。'};if(s.lock&&!suitMatch(cards,s.lock))return {ok:false,reason:'スート縛りに合いません。'};if(s.numberLock&&!(m.type==='group'&&m.count===1&&m.rank===16)){const ranks=seq(rev(s)),expected=ranks[ranks.indexOf(s.pile.rank)+1];if(m.rank!==expected)return {ok:false,reason:'完全縛り中は次の数字だけ出せます。'}};if(power(m.rank,rev(s))<=power(s.pile.rank,rev(s)))return {ok:false,reason:'場より強い組が必要です。'}}return {ok:true,cards,group:compared,beforeRank:m.rank,spade:special,revolts:revolution}}
export function nextActivePlayer(players,after){for(let i=1;i<=players.length;i++){const id=(after+i)%players.length;if(players[id].hand.length)return id}return null}
function cleared(s){return {pile:null,lock:null,numberLock:false,passed:[],passCount:0,jackBack:false,revolution:Boolean(s.revolution)!==Boolean(s.pendingRevolution),pendingRevolution:false}}
function finish(s,players,order,retired,fouls,demoted){const left=players.filter(p=>active({...s,retired},p));if(left.length===1&&!order.includes(left[0].id)){order.push(left[0].id);retired.push(left[0].id)}if(left.length<=1){const final=[...order.filter(id=>!fouls.includes(id)),...demoted,...fouls.slice().reverse()];players.forEach(p=>{if(!final.includes(p.id))final.push(p.id)});return {done:true,order:final,retired}}return {done:false,order,retired}}
export function playMove(s,id,ids,kind=ids?.kind||'auto'){const v=validateMove(s,id,ids,kind);if(!v.ok)return {state:s,error:v.reason};const players=s.players.map((p,i)=>i===id?{...p,hand:p.hand.filter(c=>!ids.includes(c.id))}:p),order=[...s.finishOrder],retired=[...(s.retired||[])],fouls=[...(s.fouls||[])],demoted=[...(s.demoted||[])],out=!players[id].hand.length,bad=out&&foul(v.cards,v.group,s);if(out){retired.push(id);(bad?fouls:order).push(id)}if(out&&!bad&&s.previousChampion!==null&&id!==s.previousChampion&&!retired.includes(s.previousChampion)){retired.push(s.previousChampion);demoted.push(s.previousChampion)}const end=finish(s,players,order,retired,fouls,demoted),pile={...v.group,cards:v.cards,player:id},lock=s.lock||(s.pile&&!s.pile.jokerCount&&!pile.jokerCount&&equal(s.pile.suits,pile.suits)?pile.suits:null),ranks=seq(rev(s)),adjacent=s.pile&&ranks.indexOf(v.beforeRank)===ranks.indexOf(s.pile.rank)+1,numberLock=Boolean(s.numberLock||opts(s).fullLock&&lock&&s.pile&&!s.pile.jokerCount&&!pile.jokerCount&&adjacent),immediate=v.revolts&&(!opts(s).delayedRevolution||pile.type==='stair');let n={...s,players,playedCards:[...(s.playedCards||[]),...v.cards],pile,lock,numberLock,finishOrder:end.order,retired:end.retired,fouls,demoted,moveNumber:s.moveNumber+1,revolution:Boolean(s.revolution)!==Boolean(immediate),pendingRevolution:Boolean(s.pendingRevolution)!==Boolean(v.revolts&&!immediate),jackBack:Boolean(s.jackBack||opts(s).elevenBack&&pile.type==='group'&&pile.rank===11),status:end.done?'finished':'playing'};const forced=v.spade||pile.type==='group'&&(pile.rank===8||pile.count===6||pile.count===2&&pile.jokerCount===2)||pile.type==='stair'&&pile.strongest,responders=players.filter(p=>p.id!==id&&active(n,p)&&!n.passed.includes(p.id)),unbeatable=!end.done&&!forced&&!responders.some(p=>legalMoves(p.hand,pile,n).length),clear=forced||unbeatable;if(clear)n={...n,...cleared(n)};n.turn=end.done?null:clear?(active(n,players[id])?id:next(n,id)):next(n,id,n.passed);n.lastAction=s.players[id].name+'：'+describeSelectedCards(v.cards,s,kind)+'。'+(v.revolts?'革命。':'')+(bad?'反則上がり。':out?'上がり。':'')+(clear?'場を流します。':'');return {state:n,error:null}}
export function passTurn(s,id){if(s.status!=='playing'||s.turn!==id)return {state:s,error:'今はパスできません。'};if(!s.pile)return {state:s,error:'場にカードがありません。'};const passed=[...new Set([...(s.passed||[]),id])],clear=!s.players.some(p=>p.id!==s.pile.player&&active(s,p)&&!passed.includes(p.id));let n={...s,...(clear?cleared(s):{passed,passCount:passed.length}),moveNumber:s.moveNumber+1};n.turn=clear?(active(s,s.players[s.pile.player])?s.pile.player:next(s,s.pile.player)):next(s,id,passed);n.lastAction=clear?'場が流れました。':s.players[id].name+'がパスしました。';return {state:n,error:null}}
function candidateCards(hand,pile,reverse){
  const jokers=hand.filter(c=>c.suit==='joker'),out=[],seen=new Set();
  const add=cards=>{const key=cards.map(c=>c.id).sort().join('|');if(!seen.has(key)){seen.add(key);out.push(cards)}};
  const combinations=(items,count,visit,start=0,picked=[])=>{
    if(picked.length===count){visit(picked);return}
    for(let i=start;i<=items.length-(count-picked.length);i++)combinations(items,count,visit,i+1,[...picked,items[i]]);
  };
  for(const count of pile?[pile.count]:[1,2,3,4,5,6]){
    if(count<=jokers.length)add(jokers.slice(0,count));
    for(let rank=3;rank<=15;rank++){
      const natural=hand.filter(c=>c.suit!=='joker'&&c.power===rank);
      for(let j=0;j<=Math.min(jokers.length,count-1);j++){
        const need=count-j;
        if(need<=natural.length)combinations(natural,need,picked=>add([...picked,...jokers.slice(0,j)]));
      }
    }
  }
  if(!pile||pile.type==='stair'){
    const ranks=seq(reverse);
    for(const suit of ['spades','hearts','diamonds','clubs']){
      const byRank=new Map(hand.filter(c=>c.suit===suit).map(c=>[c.power,c]));
      const lengths=pile?[pile.count]:Array.from({length:Math.min(14,hand.length)-2},(_,i)=>i+3);
      for(const count of lengths){
        if(count<3||count>14)continue;
        for(let start=0;start+count<=ranks.length;start++){
          const natural=ranks.slice(start,start+count).map(rank=>byRank.get(rank)).filter(Boolean);
          for(let j=0;j<=Math.min(2,jokers.length,count-1);j++){
            const need=count-j;
            if(need<=natural.length)combinations(natural,need,picked=>add([...picked,...jokers.slice(0,j)]));
          }
        }
      }
    }
  }
  return out;
}
export function legalMoves(hand,pile=null,state=null){
  const players=Array.from({length:state?.players?.length||4},(_,id)=>({id,hand:id?[]:hand}));
  const dummy={players,turn:0,status:'playing',pile,passed:[],lock:state?.lock||null,numberLock:state?.numberLock||false,revolution:state?.revolution||false,jackBack:state?.jackBack||false,options:opts(state)};
  return candidateCards(hand,pile,rev(dummy))
    .flatMap(cards=>(pile?[pile.type]:['auto','stair']).map(kind=>({cards,kind,check:validateMove(dummy,0,cards.map(c=>c.id),kind)})))
    .filter(move=>move.check.ok)
    .map(move=>({...move.check.group,cards:move.cards,kind:move.kind}));
}
export function guaranteedClears(hand,playedCards,pile=null,state=null){const known=new Set([...hand,...playedCards].map(c=>c.id)),unknown=FACE_CARDS.filter(c=>!known.has(c.id));return legalMoves(hand,pile,state).filter(m=>m.type==='group'&&(m.rank===8||m.count===6||m.count===2&&m.jokerCount===2)||m.type==='stair'&&m.strongest||m.count===1&&m.cards[0]?.id==='spades-3'&&pile?.rank===16||!legalMoves(unknown,{...m,player:1},state).length)}
export function autoSelectGroup(hand,pile,id){if(!pile||pile.type==='stair'||pile.count<2)return null;const c=hand.find(c=>c.id===id);if(!c||c.suit==='joker')return null;const same=hand.filter(x=>x.suit!=='joker'&&x.power===c.power);return same.length===pile.count?same.map(x=>x.id):null}
export function playableCardHints(hand,pile=null,state=null){const naturalIds=new Set(),wildIds=new Set();for(const move of legalMoves(hand,pile,state)){if(!pile&&move.count===1)continue;for(const c of move.cards)(move.jokerCount?wildIds:naturalIds).add(c.id)}return {naturalIds,wildIds}}
export function chooseCpuMove(s,id){const moves=legalMoves(s.players[id].hand,s.pile,s);if(!moves.length)return null;const r=rev(s);moves.sort((a,b)=>s.pile?power(a.rank,r)-power(b.rank,r)||a.jokerCount-b.jokerCount:b.count-a.count||a.jokerCount-b.jokerCount||power(a.rank,r)-power(b.rank,r));const ids=moves[0].cards.map(c=>c.id);ids.kind=moves[0].kind;return ids}
