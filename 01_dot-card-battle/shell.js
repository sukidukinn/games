import { FACE_CARDS, SUITS } from './cards.js';
import { AudioManager } from './audio.js';

const PAGES = [
  ['home', 'タイトル', './index.html'],
  ['battle', '大富豪対戦', './battle.html'],
  ['cards', 'カード一覧', './cards.html'],
  ['characters', '図鑑', './characters.html'],
];

export function initShell({ page }) {
  const audio = new AudioManager();
  const animationKey = 'dotcardbattle.animation.v1';
  let animationMode = 'quick';
  try {
    const stored = localStorage.getItem(animationKey);
    if (['none', 'quick', 'slow'].includes(stored)) animationMode = stored;
  } catch {}
  const main = document.querySelector('main.screen');
  if (!main) throw new Error('A main.screen element is required');
  main.querySelector('.topbar')?.remove();
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `<a class="site-title" href="./index.html">dotcardbattle</a><nav aria-label="画面切り替え">${PAGES.slice(1).map(([id, label, href]) => `<a class="${page === id ? 'active' : ''}" href="${href}">${label}</a>`).join('')}</nav>${page === 'battle' ? '<button id="rules-button" type="button" aria-haspopup="dialog" aria-controls="rules-dialog">ルール詳細</button>' : ''}<button id="settings-button" type="button" aria-expanded="false" aria-controls="settings-panel">⚙ 設定</button><section id="settings-panel" hidden aria-label="設定"><h2>設定</h2><label class="settings-switch"><span>BGM</span><input id="setting-bgm" type="checkbox"></label><label class="settings-switch"><span>SE</span><input id="setting-se" type="checkbox"></label><fieldset><legend>カードを出す速さ</legend><label><input type="radio" name="animation-mode" value="none">ノーウェイト</label><label><input type="radio" name="animation-mode" value="quick">0.2秒</label><label><input type="radio" name="animation-mode" value="slow">1秒</label></fieldset></section>`;
  document.body.prepend(header);
  if (page === 'battle') {
    const dialog = document.querySelector('#rules-dialog');
    const ruleButton = header.querySelector('#rules-button');
    ruleButton.addEventListener('click', () => dialog.showModal());
    for (const id of ['option-eleven', 'option-stair-revolution', 'option-full-lock']) {
      const input = dialog.querySelector(`#${id}`);
      try { input.checked = localStorage.getItem(`dotcardbattle.${id}`) === 'true'; } catch {}
      input.addEventListener('change', () => {
        try { localStorage.setItem(`dotcardbattle.${id}`, String(input.checked)); } catch {}
      });
    }
  }
  const settingsButton = header.querySelector('#settings-button');
  const settingsPanel = header.querySelector('#settings-panel');
  header.querySelector('#setting-bgm').checked = audio.bgmEnabled;
  header.querySelector('#setting-se').checked = audio.seEnabled;
  header.querySelector(`input[name="animation-mode"][value="${animationMode}"]`).checked = true;
  settingsButton.addEventListener('click', () => {
    void audio.start();
    settingsPanel.hidden = !settingsPanel.hidden;
    settingsButton.setAttribute('aria-expanded', String(!settingsPanel.hidden));
    audio.play('nav');
  });
  header.querySelector('#setting-bgm').addEventListener('change', event => audio.setBgmEnabled(event.target.checked));
  header.querySelector('#setting-se').addEventListener('change', event => audio.setSeEnabled(event.target.checked));
  header.querySelectorAll('input[name="animation-mode"]').forEach(input => input.addEventListener('change', () => {
    if (!input.checked) return;
    animationMode = input.value;
    try { localStorage.setItem(animationKey, animationMode); } catch {}
    window.dispatchEvent(new CustomEvent('animationmodechange', { detail: animationMode }));
    audio.play('nav');
  }));
  document.addEventListener('pointerdown', event => {
    if (settingsPanel.hidden || header.contains(event.target)) return;
    settingsPanel.hidden = true;
    settingsButton.setAttribute('aria-expanded', 'false');
  });

  const layout = document.createElement('div');
  layout.className = 'app-layout';
  const left = document.createElement('div');
  left.className = 'side-dock left';
  left.innerHTML = '<button class="dock-handle" type="button" aria-expanded="false" aria-controls="debug-panel" aria-label="デバッグを開く"><span>›</span><span>デバッグ</span></button><aside id="debug-panel" class="dock-panel" hidden><h2>デバッグ</h2><button type="button" data-debug="ping">反応テスト</button><button type="button" data-debug="draw">引き直す</button><button type="button" data-debug="reset">リセット</button><p id="debug-output" role="status">ボタンを押してください。</p></aside>';
  const right = document.createElement('div');
  right.className = 'side-dock right';
  right.innerHTML = '<button class="dock-handle" data-panel="detail" type="button" aria-expanded="false" aria-controls="detail-panel" aria-label="詳細を開く"><span>‹</span><span>詳細</span></button><button class="dock-handle tracker-handle" data-panel="tracker" type="button" aria-expanded="false" aria-controls="tracker-panel" aria-label="消費カード一覧を開く"><span>‹</span><span>消費カード一覧</span></button><aside id="detail-panel" class="dock-panel" hidden><h2>詳細</h2><div class="detail-tabs"><button type="button" data-detail="data" class="active">データ</button><button type="button" data-detail="map">マップ</button></div><div id="detail-data"></div><div id="detail-map" hidden><p>第1章 · カードの広間</p><div class="mini-map"><span>入口</span><span>対戦</span><span>次の部屋</span></div><p>ルート詳細は後の章で追加します。</p></div></aside><aside id="tracker-panel" class="dock-panel tracker-panel" hidden><h2>消費カード一覧</h2><div id="tracker-grid" class="tracker-grid"></div><p class="tracker-note">自分の手札と、出されたカードを記録</p><div class="tracker-legend"><span class="in-hand">手札</span><span class="played">出た</span><span class="unknown">未確認</span></div><div id="tracker-counts" class="tracker-counts"></div><div id="tracker-guaranteed" class="tracker-guaranteed"></div></aside>';
  main.replaceWith(layout);
  layout.append(left, main, right);

  const leftHandle = left.querySelector('.dock-handle');
  leftHandle.addEventListener('click', () => {
    const open = !left.classList.contains('open');
    left.classList.toggle('open', open);
    layout.classList.toggle('left-open', open);
    leftHandle.setAttribute('aria-expanded', String(open));
    leftHandle.setAttribute('aria-label', `デバッグを${open ? '閉じる' : '開く'}`);
    leftHandle.firstElementChild.textContent = open ? '‹' : '›';
    left.querySelector('.dock-panel').hidden = !open;
    window.dispatchEvent(new Event('layoutchange'));
  });
  right.querySelectorAll('.dock-handle').forEach(handle => handle.addEventListener('click', () => {
    const target = handle.dataset.panel;
    const current = right.dataset.openPanel;
    const next = current === target ? '' : target;
    right.dataset.openPanel = next;
    right.classList.toggle('open', Boolean(next));
    layout.classList.toggle('right-open', Boolean(next));
    layout.classList.toggle('tracker-open', next === 'tracker');
    for (const item of right.querySelectorAll('.dock-handle')) {
      const open = item.dataset.panel === next;
      const label = item.dataset.panel === 'detail' ? '詳細' : '消費カード一覧';
      item.setAttribute('aria-expanded', String(open));
      item.setAttribute('aria-label', `${label}を${open ? '閉じる' : '開く'}`);
      item.firstElementChild.textContent = open ? '›' : '‹';
    }
    right.querySelector('#detail-panel').hidden = next !== 'detail';
    right.querySelector('#tracker-panel').hidden = next !== 'tracker';
    window.dispatchEvent(new Event('layoutchange'));
  }));
  left.querySelectorAll('[data-debug]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.debug;
    const output = left.querySelector('#debug-output');
    output.textContent = action === 'ping' ? `反応しました · ${new Date().toLocaleTimeString('ja-JP')}` : action === 'draw' ? '手札を引き直しました。' : '対戦をリセットしました。';
    window.dispatchEvent(new CustomEvent('debugaction', { detail: action }));
  }));
  right.querySelectorAll('[data-detail]').forEach(button => button.addEventListener('click', () => {
    const tab = button.dataset.detail;
    right.querySelectorAll('[data-detail]').forEach(item => item.classList.toggle('active', item === button));
    right.querySelector('#detail-data').hidden = tab !== 'data';
    right.querySelector('#detail-map').hidden = tab !== 'map';
  }));
  const detail = right.querySelector('#detail-data');
  function setDetails(lines) {
    detail.replaceChildren(...lines.map(([label, value]) => {
      const p = document.createElement('p');
      p.className = 'detail-row';
      const strong = document.createElement('strong');
      strong.textContent = label;
      const span = document.createElement('span');
      span.textContent = value;
      p.append(strong, span);
      return p;
    }));
  }
  const trackerGrid = right.querySelector('#tracker-grid');
  const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  for (const suit of SUITS) {
    const heading = document.createElement('div');
    heading.className = `tracker-suit ${suit.color}`;
    heading.textContent = suit.symbol;
    trackerGrid.append(heading);
  }
  for (const rank of rankOrder) for (const suit of SUITS) {
    const card = FACE_CARDS.find(item => item.suit === suit.id && item.rank === rank);
    const icon = document.createElement('div');
    icon.className = 'tracker-card unknown';
    icon.dataset.cardId = card.id;
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', `${card.label} · 未確認`);
    icon.title = `${card.label} · 未確認`;
    icon.innerHTML = `<span class="tracker-rank">${rank}</span><span class="tracker-symbol ${suit.color}">${suit.symbol}</span>`;
    trackerGrid.append(icon);
  }
  for (const joker of FACE_CARDS.filter(card => card.suit === 'joker')) {
    const icon = document.createElement('div');
    icon.className = 'tracker-card unknown joker';
    icon.dataset.cardId = joker.id;
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', `${joker.label} · 未確認`);
    icon.title = `${joker.label} · 未確認`;
    icon.innerHTML = `<span class="tracker-rank">JK</span><span class="tracker-symbol ${joker.color}">★</span>`;
    trackerGrid.append(icon);
  }
  for (let i = 0; i < 2; i++) {
    const blank = document.createElement('div');
    blank.className = 'tracker-blank';
    blank.setAttribute('aria-hidden', 'true');
    trackerGrid.append(blank);
  }
  function setCardTracker({ hand = [], playedCards = [], guaranteed = [], hintMessage = '' } = {}) {
    const held = new Set(hand.map(card => card.id));
    const played = new Set(playedCards.map(card => card.id));
    for (const icon of trackerGrid.querySelectorAll('.tracker-card')) {
      const status = held.has(icon.dataset.cardId) ? 'in-hand' : played.has(icon.dataset.cardId) ? 'played' : 'unknown';
      const label = status === 'in-hand' ? '自分の手札' : status === 'played' ? '出たカード' : '未確認';
      icon.className = `tracker-card ${status}${icon.dataset.cardId.startsWith('joker') ? ' joker' : ''}`;
      icon.setAttribute('aria-label', `${FACE_CARDS.find(card => card.id === icon.dataset.cardId).label} · ${label}`);
      icon.title = icon.getAttribute('aria-label');
    }
    right.querySelector('#tracker-counts').textContent = `手札 ${held.size} · 出た ${played.size} · 未確認 ${54 - held.size - played.size}`;
    const clears = right.querySelector('#tracker-guaranteed');
    clears.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = '確定で流せる組';
    clears.append(title);
    const p = document.createElement('p');
    p.textContent = guaranteed.length ? guaranteed.join(' / ') : hintMessage || '現在、確定できる組はありません。';
    clears.append(p);
  }
  setCardTracker();
  setDetails([['画面', PAGES.find(item => item[0] === page)?.[1] || page], ['カード', '表面54枚 / 裏面4枚'], ['キャラクター', '42体']]);
  return { setDetails, setCardTracker, layout, audio, getAnimationMode: () => animationMode };
}
