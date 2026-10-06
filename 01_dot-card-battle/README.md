# dotcardbattle

この `dot-card-battle` フォルダで `node server.mjs` を起動し、`http://127.0.0.1:4174/` を開きます。ヘッダーから対戦・カード一覧・図鑑を切り替えられます。左右の「デバッグ」「詳細」枠はどの画面でも開閉できます。

「大富豪対戦」は2〜4人のソロプレイです。あなた以外はCPUが操作します。54枚（52枚＋ジョーカー2枚）をすべて配ります。[日本大富豪連盟のルール](https://daifugojapan.com/rule-book)を基に、同ランク組（最大6枚）、同一スートの階段、革命・革命返し、8切り、スペ3返し、スート縛り、一度パスしたら復帰不可、反則上がり、都落ち、階級と次ゲームのカード交換を実装しています。ジョーカーは2枚使用し、組・階段の代用、2枚ペア即流し、最強階段に対応します。4人戦は大富豪・富豪・貧民・大貧民、3人戦は富豪・平民・貧民とし、カード交換はそれぞれ2枚／1枚、3人戦は上下間で1枚です。連盟の人数別ブラインドカードと3人戦の40枚構成は採用せず、以前からの54枚全配布と2〜4人対戦を維持します。初戦はスペード3所持者から始めます。ヘッダーの「ルール詳細」から、イレブンバック（階段以外のJで場が流れるまで反転）、階段革命（5枚以上、出した瞬間に発効）、完全縛り（スートと連続数字を固定）を選択できます。同ランク革命は連盟ルールどおり出した瞬間に発効します。

手札をタップすると浮いて選択され、再度タップすると解除されます。場が同ランク組で、手札に同じ数字が必要枚数ぴったりある場合は、1枚のタップで組全体を選択します。必要枚数より多く持つ場合は1枚ずつ選択します。出せる候補は黄色、ジョーカー代用の候補は橙色の枠で示します。先手で組と階段の両方が成立する選択では出し方を指定できます。10枚以上の手札は2段で表示します。選んで提出ボタンを押すか、場へドラッグして出せます。対戦カードはカード画像を貼った3D板（63.5 × 88.9 mm、5:7）です。各対戦で2人は+1/-1、3人は+1/0/-1、4人は+2/+1/-1/-2点を累計し、1位の連勝と最多連勝を記録します。最大10戦で最終スコアと対戦履歴を表示します。次戦のカード交換では、下位者が最強札を渡し（同ランクはスート選択可）、上位者が任意札を渡します。全員の選択後に一斉交換し、渡した札と受け取った枚数を確認してから対戦を始めます。CPUのアイコンはジョーカーやキャラクター画像からランダムに選びます。ゲーム処理は `battle-state.js`、画面処理は `battle.js` にあります。`node --test` でルールを確認できます。

対戦中の提出ボタンには選択中の数字と枚数を表示します（例: 「5を4枚出す」「5＋Joker(代用) · 2枚出す」）。通常の行動ログは表示せず、エラーや場が流れた通知だけを一時的に場へ重ねます。手札の説明文は省き、手札枚数・場・手番の参照情報を画面の最下段に置いています。

右側の「消費カード一覧」には、最初に52枚を4スート×13段、ジョーカー2枚を最下段に表示し、その下に色分けと補助情報を置きます。青は自分の手札、灰色は場に出たカード、通常色は未確認のカードです。出されたカードは場が流れた後も記録されます。「確定で流せる組」は自分の手札と公開済みカードだけから計算し、未確認カードをすべて同じ相手が持つと仮定しても返せない組だけを表示します。

ヘッダーの「設定」では、BGMとSEを別々に切り替えられます。音は `borotoboro/src/sound.js` のWeb Audio方式を参考にした `audio.js` で生成し、音声ファイルは不要です。カードの提出と場を流す動きは、ノーウェイト、0.2秒（初期値）、1秒から選べます。場を流すカードは、自分が最後に出した場合は右、CPUが最後に出した場合は左へ移動します。設定はブラウザに保存されます。

- 表面: 4スート × 13ランク + 赤・黒のジョーカー各1枚 = 54枚。スートごとに等間隔の5列グリッドで表示します。
- 裏面: プレイヤー1〜4の色・紋章が異なる4種。
- `assets/source-sheet.png` と `assets/joker-source/` はAIが生成した元画像です。`assets/cards/` に切り出した58枚のPNGがあります。画像を後から個別に編集できます。
- 全PNGはポーカーサイズの **63.5 × 88.9 mm（2.5 × 3.5インチ）** と同じ **5:7** 比率の **250 × 350 px** です。100 dpiで印刷すると実寸になります。画面の一覧では表面と裏面を同じ幅・高さで表示します。
- 元シートの表面と裏面の枠は比率が揃っていなかったため、切り出しでは縦横を引き伸ばさず、中心を5:7にトリミングしています。
- `build_assets.py` は元画像から58枚を再生成します。Pillowが必要です。個別に編集したPNGを残したい場合、再生成前に退避してください。
- `cards.js` は `FACE_CARDS`、`CARD_BACKS`、ID検索用の `CARD_BY_ID` / `BACK_BY_ID`、描画用の `createCardElement` を公開します。ゲーム本体からそのまま読み込めます。
- カードの `power` は `3 < ... < K < A < 2 < JOKER` に対応します。

## 画像生成プロンプト

組み込みの画像生成ツールで以下のプロンプトを使いました。生成画像では等間隔の8領域を指定し、ランク文字は正確さを保つため切り出し時にプログラムで重ねています。

> Use case: stylized-concept. Asset type: production sprite source sheet for a mobile pixel-art playing-card game. Create a single flat orthographic contact sheet with EXACTLY eight portrait playing-card designs arranged in a strict 4-column by 2-row grid, perfectly equal-sized rectangular cells, generous identical gutters, straight axis-aligned edges, no perspective, no overlaps. Top row left to right: spade card face ornament, heart card face ornament, diamond card face ornament, club card face ornament. These are BLANK FACE TEMPLATES with warm ivory paper, a thin dark pixel border, subtle 8-bit ornamental corner flourishes and a tiny distinctive suit emblem near the upper center; leave the central 70% clear for programmatically added rank and pip. Bottom row left to right: four DIFFERENT full card backs for player 1 through player 4, respectively sapphire blue diamond mosaic, raspberry red star mosaic, jade green triangle mosaic, amber gold circle mosaic, each with repeating symmetrical pixel patterns and double-line border. Crisp limited-palette 16-bit game pixel art, hard square pixels, no anti-aliasing, cohesive visual language, high contrast at small phone sizes. No lettering, numerals, labels, logos, shadows, scenery, mockup devices, hands, or extra cards. Flat transparent empty gutters between the eight designs. Exact grid geometry is crucial so each card can be cut out automatically.


## キャラクター図鑑

`http://127.0.0.1:4174/characters.html` で42体の透過バストアップ画像を確認できます。J・Q・Kの12体、十二星座の12体、サーカス・仮面舞踏会・神話の幻獣が各6体です。ゲームからは `characters.js` の `CHARACTERS` と `CHARACTER_BY_ID` を使用できます。今後の画像生成では [CHARACTER_STYLE.md](./CHARACTER_STYLE.md) を基準にしてください。

## ジョーカー用の画像生成プロンプト

既存の `hearts-a.png` をスタイル参照として、組み込みの画像生成ツールで赤・黒を別々に生成しました。カード枠との合成と `JOKER` の文字は `build_assets.py` が処理します。

**赤:** Use case: stylized-concept. Asset type: isolated central illustration for a Joker playing card in an existing 16-bit pixel-art deck. Reference image is the deck's existing card face: match its crisp chunky square pixels, warm ivory and gold ornamental visual language, and dark red suit color. Create ONLY one classic playing-card court jester, waist-up, facing slightly left, playful grin, red and cream two-point fool's cap with tiny bells, simple red-and-gold costume, holding a small scepter with a star tip. Strong readable silhouette, detailed enough for 120x180 px display. Centered upright portrait, subject fills most of canvas with clear margins. Genuinely transparent background; no card frame, no rank, no letters, no text, no symbols, no watermark, no second figure. Avoid realism, gradients, blur and antialiasing.

**黒:** Use case: stylized-concept. Asset type: isolated central illustration for the SECOND, separate Joker card in an existing 16-bit pixel-art playing-card deck. Reference image shows the deck's existing ivory-and-gold face design. Match its chunky square pixels and crisp limited-palette game art, but create a DISTINCT classic court jester from the red joker: older mischievous male jester, three-point black and deep-violet cap with small gold bells, black, indigo and cream diamond-pattern costume, holding a black-and-gold theatrical mask. Upright waist-up portrait, facing slightly right, clear recognizable silhouette, centered with clear margins. At 120x180 px must remain legible. Genuinely transparent background; no card frame, no rank, no letters, no text, no watermark, no second figure. Avoid realism, gradients, blur, antialiasing, red costume.
