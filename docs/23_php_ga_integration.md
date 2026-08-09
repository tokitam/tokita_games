# Google Analytics 対応 PHP 化

## 概要
全ゲームページとメニュー画面を `.html` から `.php` にリネームし、`games/ga.html` が存在する場合のみ `<head>` 直後で読み込む仕組みを追加した。`ga.html` はリポジトリには含めず、デプロイ先サーバにのみ配置する運用とする。

## 実装内容
- `games/index.html` → `games/index.php`（メニュー）
- `games/<name>/index.html` → `games/<name>/index.php`（全 20 ゲーム）
- 各ファイルの `<head>` 直後に PHP スニペットを挿入
- メニューのリンクを `index.html` → `index.php` に更新（15 件）
- `.gitignore` に `games/ga.html` を追加
- README のローカル起動コマンドを `php -S localhost:8000` に更新

## 使い方

### GA タグを差し込む
デプロイ先の `games/` 直下に `ga.html` を配置する。内容は Google Analytics の gtag スニペット（`<script>` タグ）。ファイルが無ければ何も出力されず、動作は変わらない。

```html
<!-- games/ga.html の中身の例 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### ローカル確認
```sh
php -S localhost:8000
# → http://localhost:8000/games/ を開く
```

## 技術的な補足
- include パスは `__DIR__` 基準のため、Web サーバのカレントディレクトリ設定に依存しない
  - メニュー: `__DIR__ . '/ga.html'`（同階層）
  - 各ゲーム: `__DIR__ . '/../ga.html'`（1 つ上）
- `file_exists` チェックにより、`ga.html` が無い環境でもエラーなく動作する
- GitHub Pages などの純粋な静的ホスティングでは PHP が実行されないため、PHP 対応サーバへのデプロイが前提
- 旧 URL（`.../index.html`）へのブックマークはリンク切れになる。ディレクトリ URL（`/games/<name>/`）は `DirectoryIndex` に `index.php` が設定されていれば引き続き有効
