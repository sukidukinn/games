import { CHARACTERS, CHARACTER_GROUPS } from './characters.js';
import { initShell } from './shell.js';
initShell({ page: 'characters' });
const names = { court: 'J・Q・K', zodiac: '十二星座', circus: 'サーカス', masquerade: '仮面舞踏会', myth: '神話の幻獣' };
const root = document.querySelector('#character-sections');
const dialog = document.querySelector('#preview');
for (const group of CHARACTER_GROUPS) {
  const section = document.createElement('section');
  section.className = 'character-section';
  const title = document.createElement('h2');
  title.textContent = names[group];
  const grid = document.createElement('div');
  grid.className = 'portrait-grid';
  for (const character of CHARACTERS.filter(item => item.group === group)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'portrait-tile';
    button.setAttribute('aria-label', `${character.label}を拡大`);
    const image = document.createElement('img');
    image.src = character.src;
    image.alt = '';
    image.loading = 'lazy';
    const caption = document.createElement('span');
    caption.textContent = character.label;
    button.append(image, caption);
    button.addEventListener('click', () => {
      const preview = document.querySelector('#preview-image');
      preview.src = character.src;
      preview.alt = character.label;
      document.querySelector('#preview-name').textContent = character.label;
      dialog.showModal();
    });
    grid.append(button);
  }
  section.append(title, grid);
  root.append(section);
}
document.querySelector('#close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
