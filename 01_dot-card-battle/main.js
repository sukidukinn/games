import { SUITS, FACE_CARDS, CARD_BACKS, createCardElement } from './cards.js';
import { initShell } from './shell.js';
initShell({ page: 'cards' });

const faces = document.querySelector('#faces');
for (const suit of SUITS) {
  const section = document.createElement('section');
  section.className = 'suit-section';
  const title = document.createElement('h2');
  title.textContent = `${suit.symbol} ${suit.label}`;
  title.className = suit.color;
  const grid = document.createElement('div');
  grid.className = 'card-grid';
  for (const card of FACE_CARDS.filter(item => item.suit === suit.id)) grid.append(makeTile(card));
  section.append(title, grid);
  faces.append(section);
}
const jokerSection = document.createElement('section');
jokerSection.className = 'suit-section';
const jokerTitle = document.createElement('h2');
jokerTitle.textContent = '★ ジョーカー';
const jokerGrid = document.createElement('div');
jokerGrid.className = 'card-grid';
for (const card of FACE_CARDS.filter(item => item.suit === 'joker')) jokerGrid.append(makeTile(card));
jokerSection.append(jokerTitle, jokerGrid);
faces.append(jokerSection);
const backs = document.querySelector('#backs');
const backGrid = document.createElement('div');
backGrid.className = 'back-grid';
for (const back of CARD_BACKS) backGrid.append(makeTile(back, true));
backs.append(backGrid);

function makeTile(item, back = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile';
  button.setAttribute('aria-label', `${item.label}を拡大`);
  button.append(createCardElement(item, { back }));
  const caption = document.createElement('span');
  caption.className = 'caption';
  caption.textContent = back ? item.label : item.rank;
  button.append(caption);
  button.addEventListener('click', () => showPreview(item, back));
  return button;
}

for (const tab of document.querySelectorAll('.tabs button')) {
  tab.addEventListener('click', () => {
    for (const button of document.querySelectorAll('.tabs button')) button.classList.toggle('active', button === tab);
    faces.classList.toggle('hidden', tab.dataset.view !== 'faces');
    backs.classList.toggle('hidden', tab.dataset.view !== 'backs');
  });
}

const dialog = document.querySelector('#preview');
function showPreview(item, back) {
  const holder = document.querySelector('#preview-card');
  holder.replaceChildren(createCardElement(item, { back }));
  document.querySelector('#preview-name').textContent = item.label;
  dialog.showModal();
}
document.querySelector('#close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
