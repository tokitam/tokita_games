# tokita_games

ウェブブラウザで完結するミニゲーム集。スマホからでも快適に遊べる、ポップな定番ゲームを1本ずつ作りきっていくプロジェクト。

## 方針

- ブラウザだけで完結する（インストール不要）
- スマホ・PC どちらでも快適に遊べる
- ビルド不要。React/Vue などのフレームワークは使わず、HTML / CSS / JS / 画像 / 音声ファイルを置くだけの構成
- サーバサイドは PHP のみ（Google Analytics タグの差し込みに使用）。スコア保存などは localStorage を利用
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

PHP が動くサーバで配信する。ローカル確認は PHP の組み込みサーバが手軽。

```sh
# 例: ローカルで確認する場合（PHP 7.4 以上が必要）
php -S localhost:8000
# → http://localhost:8000/games/ を開く
```

> **Note**: `python3 -m http.server` では PHP が実行されず、ページが正常に表示されない。
