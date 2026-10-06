# キャラクター画風の基準

赤・黒のジョーカー (`assets/joker-source/red.png`, `assets/joker-source/black.png`) を今後の全キャラクターの**スタイル参照**にする。対象のキャラクターやポーズを複写せず、描画方法と色設計を揃える。

## 固定する要素

- 16-bitゲーム風の大きく四角いピクセル。ぼかし、写真調、滑らかなベクター線を使わない。
- 濃い輪郭線、表情が読める顔、生成りの明部、金の縁取り。主要色は赤・黒・紫・紺を軸とし、各陣営の補助色を足す。
- 頭から胸元までのバストアップ。正面から少し振った3/4視点。会話画面で表情とシルエットが分かる余白を確保する。
- PNGの背景は透過。カード枠、ランク、文字、背景の舞台や風景は描かない。カード化は後工程。
- 1枚につき1キャラクター。双子座・ケルベロスのように複数の顔が設定の一部である場合も、1枚のまとまった肖像とする。

## 生成プロンプトの共通部分

> Use case: stylized-concept. Asset type: transparent bust-up speaking portrait for a mobile pixel-art Daifugo game. Match BOTH supplied red and black Joker reference images strictly: chunky square 16-bit pixels, crisp dark outlines, expressive theatrical face, warm ivory highlights, ornate gold trim, limited saturated palette. Subject: [character-specific identity, face, clothing, prop, palette, expression]. One original character, head and upper torso to mid-chest, 3/4 view, centered, generous clear margins, genuinely transparent cutout background. No card border, rank, lettering, captions, scenery, extra figures, blur, smooth vector style, or watermark.

参照画像は `assets/joker-source/` の2枚。今回の42体はこの共通部分を使い、個別の容姿・衣装・小道具を指定して生成した。

## 実装

- `characters.js` が42体の安定ID、表示名、分類、画像パスを公開する。
- 透過原画像は `assets/characters/{court,zodiac,circus,masquerade,myth}/` に保存する。
- カード枠への合成や会話用の表情差分はこの原画像から後工程で作る。元画像を上書きしない。
