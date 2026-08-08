# ポンポンビート（リズムタップ）

対応 issue: #12

## 概要

3レーンのノーツが判定ラインに向かって落下してくる音ゲー。Perfect/Good/Miss の3段階判定とコンボ倍率でスコアを競う。楽曲はWeb Audio APIで生成する合成音楽を使い、mp3 ファイル不要。

## 実装内容

### ファイル構成

```
games/ponpon-beat/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── sound.js    — タップ音・合成音楽生成
│   ├── chart.js    — 譜面管理・判定ロジック
│   └── main.js     — 画面遷移・ノーツ描画・入力処理
└── songs/
    ├── index.json  — 楽曲一覧
    ├── sample.json — 「ポンポンビート」譜面（BPM 128）
    └── fast.json   — 「ハイパービート」譜面（BPM 160）
```

## 使い方

- タイトルから楽曲を選んでスタート
- 落ちてくるノーツが判定ライン（白い横線）に重なったらレーンをタップ
- Perfect: ±50ms / Good: ±120ms / Miss: それ以外
- コンボ10以上で×1.5、30以上で×2.0倍率
- ゲーム終了後に結果画面（スコア・精度・FULL COMBO表示）

## 技術的な補足

- 音楽は Web Audio API のオシレーター（楽器音）で生成。mp3 不要
- タイミング計測は `AudioContext.currentTime` で高精度同期
- ノーツは `requestAnimationFrame` ループで DOM 要素を毎フレーム配置（`translateY` は不使用、シンプルに `top` で位置計算）
- 判定ウィンドウ: Perfect ±50ms / Good ±120ms
- コンボ倍率: ×1.0 / ×1.5（10以上）/ ×2.0（30以上）
- 譜面は JSON で定義（`time`: 曲開始からの秒数、`lane`: 0〜2）
- 楽曲追加: `songs/` に JSON ファイルを置いて `index.json` に追記するだけ
- ローカル確認: `python3 -m http.server 8000` → `http://localhost:8000/games/ponpon-beat/`
- localStorage: `ponpon-beat.hs.{songId}` でベストスコア保存
