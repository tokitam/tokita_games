# 「さめがめ」ゲーム作成

## 概要

「さめがめ」タイプのパズルゲーム「まとめてポン！」を新規作成した。スマホタップ操作に最適化した10列×12行の盤面と、クリア後に X.com へスコアを投稿できる共有機能を実装した。

## 実装内容

### 追加ファイル

| ファイル | 内容 |
|---|---|
| `games/matomete-pon/index.html` | 4画面（タイトル・ゲーム・クリア・ゲームオーバー）のHTMLシェル |
| `games/matomete-pon/css/style.css` | ダークテーマのスタイル |
| `games/matomete-pon/js/game.js` | 盤面データ・BFS連結判定・スコア計算・ゲーム状態管理 |
| `games/matomete-pon/js/renderer.js` | Canvas2D描画・グループハイライト・消去フェードアニメ |
| `games/matomete-pon/js/input.js` | タップ/クリック/マウスホバー入力処理 |
| `games/matomete-pon/js/main.js` | 画面遷移・ゲームループ・X.com共有 |

### 変更ファイル

- `games/index.html` — ゲームカード「🎯 まとめてポン！」を追加

## 使い方

1. 同じ色でつながっているブロックをタップする
2. 2個以上つながっていればまとめて消える
3. 大きなグループを消すほど高得点（スコア = (n-1)² × 10点）
4. 全部消せたらクリア（+1000点ボーナス）
5. 消せるグループがなくなったらゲームオーバー
6. クリア時に「𝕏 でシェアする」でスコアを X.com に投稿できる

## 技術的な補足

- **スコア計算**: n個消去時 `(n-1)² × 10` 点。2個=10点、5個=160点、10個=810点
- **BFS連結判定**: `game.js` の `findGroup()` が上下左右4方向にBFSで同色セルを探索
- **重力落下**: `applyGravity()` で各列の空白を詰める（列方向のみ、横方向シフトなし）
- **Canvas DPR対応**: `window.devicePixelRatio` を考慮してレティナディスプレイに対応
- **X共有**: `window.location.href` で動的URLを取得し、ポップアップブロッカー対策としてタップイベント内で `window.open` を呼ぶ
- **ハイスコア**: `localStorage` のキー `matomete-pon.highscore` に保存
