// Dialogue portrait catalog. IDs are stable for story and battle code.
const groups = [
  ['court', [
    ['spades-j', 'スペードのジャック'], ['spades-q', 'スペードのクイーン'], ['spades-k', 'スペードのキング'],
    ['hearts-j', 'ハートのジャック'], ['hearts-q', 'ハートのクイーン'], ['hearts-k', 'ハートのキング'],
    ['diamonds-j', 'ダイヤのジャック'], ['diamonds-q', 'ダイヤのクイーン'], ['diamonds-k', 'ダイヤのキング'],
    ['clubs-j', 'クラブのジャック'], ['clubs-q', 'クラブのクイーン'], ['clubs-k', 'クラブのキング'],
  ]],
  ['zodiac', [
    ['aries', '牡羊座'], ['taurus', '牡牛座'], ['gemini', '双子座'], ['cancer', '蟹座'],
    ['leo', '獅子座'], ['virgo', '乙女座'], ['libra', '天秤座'], ['scorpio', '蠍座'],
    ['sagittarius', '射手座'], ['capricorn', '山羊座'], ['aquarius', '水瓶座'], ['pisces', '魚座'],
  ]],
  ['circus', [
    ['ringmaster', '団長'], ['acrobat', '曲芸師'], ['strongman', '怪力男'],
    ['magician', '奇術師'], ['clown', '哀しみの道化師'], ['fortuneteller', '占い師'],
  ]],
  ['masquerade', [
    ['duchess', '仮面の公爵夫人'], ['violinist', '幻のバイオリン弾き'], ['owl', '梟の仮面客'],
    ['dancer', '薔薇の踊り子'], ['clockwork', '時計仕掛けの司会者'], ['thief', 'ベルベットの盗賊'],
  ]],
  ['myth', [
    ['dragon', '竜の君主'], ['griffin', 'グリフォンの騎士'], ['unicorn', 'ユニコーンの治療師'],
    ['phoenix', '不死鳥の巫女'], ['basilisk', 'バジリスクの錬金術師'], ['cerberus', 'ケルベロスの門番'],
  ]],
];

export const CHARACTERS = Object.freeze(groups.flatMap(([group, entries]) =>
  entries.map(([id, label]) => Object.freeze({ id, label, group, src: `./assets/characters/${group}/${id}.png` }))));
export const CHARACTER_BY_ID = new Map(CHARACTERS.map(character => [character.id, character]));
export const CHARACTER_GROUPS = Object.freeze(['court', 'zodiac', 'circus', 'masquerade', 'myth']);
