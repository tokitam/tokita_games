DEMO : https://tokita.net/games/
<img width="1166" height="1334" alt="スクリーンショット 2026-08-09 232341" src="https://github.com/user-attachments/assets/cd3c86be-5f23-4318-8eec-6f09cc3c450e" />


# tokita_games

ウェブブラウザで完結するミニゲーム集。スマホからでも快適に遊べる、ポップな定番ゲームを1本ずつ作りきっていくプロジェクト。

## 方針

- ブラウザだけで完結する（インストール不要）
- スマホ・PC どちらでも快適に遊べる
- ビルド不要。React/Vue などのフレームワークは使わず、HTML / CSS / JS / 画像 / 音声ファイルを置くだけの静的構成
- サーバサイド処理なし。スコア保存などは localStorage を利用
- 1本ずつゲームとして完成させてから次に進む
- 見た目・世界観はポップに

## ドキュメント

- [ゲーム案ネタ出し（10本）](docs/game-ideas.md)

## ディレクトリ構成（予定）

```
tokita_games/
├── README.md
├── docs/            # 企画・設計ドキュメント
│   └── game-ideas.md
├── index.html       # ゲーム一覧のポータルページ（予定）
└── games/           # 各ゲーム（1ゲーム1ディレクトリ、予定）
    └── <game-name>/
        ├── index.html
        ├── css/
        ├── js/
        ├── img/
        └── sound/
```

## 遊び方 / 動かし方

静的ファイルのみなので、任意の静的サーバで配信するだけで動く。

```sh
# 例: ローカルで確認する場合
python3 -m http.server 8000
# → http://localhost:8000 を開く
```

### Google Analytics を有効にする

`games/ga.js` をデプロイ先サーバに配置すると Google Analytics が全ページで有効になる。リポジトリにはコミットしない（`.gitignore` で除外済み）。

```js
// games/ga.js の中身の例（G-XXXXXXXXXX は実際の測定 ID に置き換える）
var s = document.createElement('script');
s.async = true;
s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
document.head.appendChild(s);
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');
```
