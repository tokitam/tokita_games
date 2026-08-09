<!DOCTYPE html>
<html lang="ja">
<head>
  <?php if (file_exists(__DIR__ . '/../ga.html')) include __DIR__ . '/../ga.html'; ?>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>ぽんぽんクッキング</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <!-- Title Screen -->
  <div id="screen-title" class="screen">
    <h1 class="logo">🍳 ぽんぽんクッキング</h1>
    <div class="title-scores">
      <span class="label">ハイスコア</span>
      <span id="title-best">0</span>
    </div>
    <p class="title-rule">フライパンで食材をキャッチして<br>注文の料理を作ろう！<br><small>60秒でどれだけ作れるかな？</small></p>
    <button id="btn-start" class="btn-primary">スタート！</button>
  </div>

  <!-- Game Screen -->
  <div id="screen-game" class="screen hidden">
    <div class="game-header">
      <div class="info-group">
        <span class="label">スコア</span>
        <span id="score">0</span>
      </div>
      <div class="info-group timer-group">
        <span class="label">のこり</span>
        <span id="timer">60</span>
      </div>
      <div class="info-group">
        <span class="label">ベスト</span>
        <span id="best">0</span>
      </div>
    </div>
    <!-- 注文カード -->
    <div class="order-area">
      <div class="order-card">
        <div class="order-label">注文</div>
        <div id="order-name" class="order-name">-</div>
        <div id="order-items" class="order-items"></div>
        <div id="order-score" class="order-score-badge"></div>
      </div>
      <div class="order-card next-card">
        <div class="order-label">次</div>
        <div id="next-name" class="order-name small">-</div>
        <div id="next-items" class="order-items small"></div>
      </div>
    </div>
    <!-- フライパン内の食材 -->
    <div class="pan-contents">
      <span class="label">フライパン</span>
      <div id="pan-items" class="pan-items"></div>
    </div>
    <!-- フィーバーゲージ -->
    <div id="fever-bar" class="fever-bar hidden">
      <div class="fever-label">🔥フィーバー！</div>
      <div class="fever-gauge"><div id="fever-fill"></div></div>
    </div>
    <canvas id="renderCanvas"></canvas>
    <div id="popup" class="popup hidden"></div>
    <div class="controls-hint">左右ドラッグ: 移動 ／ タップ: 炒める ／ 上フリック: 捨てる</div>
  </div>

  <!-- Result Screen -->
  <div id="screen-result" class="screen hidden">
    <div class="result-inner">
      <div class="result-emoji">🍳</div>
      <div class="result-title">おつかれさま！</div>
      <div class="result-score">スコア: <span id="result-score">0</span></div>
      <div class="result-best">ベスト: <span id="result-best">0</span></div>
      <button id="btn-restart" class="btn-primary">もういちど！</button>
      <button id="btn-title" class="btn-secondary">タイトルへ</button>
    </div>
  </div>

  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="js/sound.js"></script>
  <script src="js/recipes.js"></script>
  <script src="js/game.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
