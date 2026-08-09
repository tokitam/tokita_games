<!DOCTYPE html>
<html lang="ja">
<head>
  <?php if (file_exists(__DIR__ . '/../ga.html')) include __DIR__ . '/../ga.html'; ?>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>ペアペアどうぶつ</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="screen-title" class="screen active">
    <h1 class="logo">ペアペア<br>どうぶつ</h1>
    <div class="difficulty-select">
      <p class="select-label">むずかしさを選んでね</p>
      <button class="btn-diff" data-diff="easy">
        <span class="diff-name">かんたん</span>
        <span class="diff-info">3×4 / 6ペア</span>
        <span class="diff-hs" id="hs-easy">ベスト: --</span>
      </button>
      <button class="btn-diff" data-diff="normal">
        <span class="diff-name">ふつう</span>
        <span class="diff-info">4×4 / 8ペア</span>
        <span class="diff-hs" id="hs-normal">ベスト: --</span>
      </button>
      <button class="btn-diff" data-diff="hard">
        <span class="diff-name">むずかしい</span>
        <span class="diff-info">6×6 / 18ペア</span>
        <span class="diff-hs" id="hs-hard">ベスト: --</span>
      </button>
    </div>
  </div>

  <div id="screen-game" class="screen">
    <div class="game-header">
      <div class="stat-box">
        <span class="label">てすう</span>
        <span id="moves">0</span>
      </div>
      <div class="stat-box">
        <span class="label">のこり</span>
        <span id="pairs-left">0</span>ペア
      </div>
      <div class="stat-box">
        <span class="label">じかん</span>
        <span id="elapsed">0:00</span>
      </div>
    </div>
    <div id="card-grid" class="card-grid"></div>
  </div>

  <div id="screen-clear" class="screen">
    <div class="stars" id="stars">⭐⭐⭐</div>
    <h2 class="clear-title">クリア！🎉</h2>
    <div class="result-card">
      <div class="result-row"><span>てすう</span><span id="clear-moves">0</span></div>
      <div class="result-row"><span>じかん</span><span id="clear-time">0:00</span></div>
      <div class="result-row result-hs"><span>ベストてすう</span><span id="clear-best">--</span></div>
    </div>
    <button id="btn-retry" class="btn-primary">もういちど！</button>
    <button id="btn-title" class="btn-secondary">むずかしさ選択へ</button>
  </div>

  <script src="js/sound.js"></script>
  <script src="js/game.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
