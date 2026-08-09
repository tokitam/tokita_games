var Renderer = (function() {
  var canvas, ctx, nextCanvas, nextCtx;
  var cellSize = 28;
  var COLS, ROWS;
  var dpr;

  // roundRect polyfill for older Safari
  function roundRectPath(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function drawBlock(c, col, row, colorInfo, alpha) {
    var x = col * cellSize;
    var y = row * cellSize;
    var size = cellSize - 2;
    var r = Math.max(2, size * 0.2);

    c.save();
    if (alpha !== undefined) c.globalAlpha = alpha;

    // Drop shadow
    c.fillStyle = colorInfo.shadow;
    roundRectPath(c, x + 2, y + 3, size, size, r);
    c.fill();

    // Main face
    c.fillStyle = colorInfo.color;
    roundRectPath(c, x, y, size, size, r);
    c.fill();

    // Highlight gloss
    c.fillStyle = 'rgba(255,255,255,0.32)';
    roundRectPath(c, x + 3, y + 3, size * 0.48, size * 0.28, r * 0.5);
    c.fill();

    c.restore();
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    var wrap = canvas.parentElement;
    var availW = Math.min(wrap.clientWidth, 420);
    var availH = wrap.clientHeight;
    if (availW <= 0 || availH <= 0) return;
    cellSize = Math.floor(Math.min(availW / COLS, availH / ROWS));

    canvas.style.width  = (cellSize * COLS) + 'px';
    canvas.style.height = (cellSize * ROWS) + 'px';
    canvas.width  = cellSize * COLS * dpr;
    canvas.height = cellSize * ROWS * dpr;
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  function init(mainCanvas, nCanvas, cols, rows) {
    canvas = mainCanvas;
    nextCanvas = nCanvas;
    COLS = cols;
    ROWS = rows;
    dpr = window.devicePixelRatio || 1;

    // Next canvas DPI setup
    var nSize = 72;
    nextCanvas.width  = nSize * dpr;
    nextCanvas.height = nSize * dpr;
    nextCanvas.style.width  = nSize + 'px';
    nextCanvas.style.height = nSize + 'px';
    nextCtx = nextCanvas.getContext('2d');
    nextCtx.scale(dpr, dpr);

    resize();
  }

  function render(state) {
    var W = cellSize * COLS;
    var H = cellSize * ROWS;

    // Background
    ctx.fillStyle = '#12122a';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (var c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * cellSize, 0); ctx.lineTo(c * cellSize, H); ctx.stroke();
    }
    for (var r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * cellSize); ctx.lineTo(W, r * cellSize); ctx.stroke();
    }

    // Locked blocks
    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        var id = state.field[row][col];
        if (!id) continue;
        if (state.clearFlash && state.clearFlash.rows.indexOf(row) !== -1) {
          // Flash: alternate between white and block color
          var progress = state.clearFlash.timer / 180;
          var flashAlpha = 0.4 + 0.6 * Math.abs(Math.sin(progress * Math.PI * 3));
          ctx.fillStyle = 'rgba(255,255,255,' + flashAlpha + ')';
          roundRectPath(ctx, col * cellSize, row * cellSize, cellSize - 2, cellSize - 2, Math.max(2, (cellSize - 2) * 0.2));
          ctx.fill();
        } else {
          drawBlock(ctx, col, row, COLOR_BY_ID[id]);
        }
      }
    }

    if (!state.current || state.clearFlash) return;

    // Ghost piece
    var gy = Game.ghostY();
    if (gy !== state.current.y) {
      var cells = TETROMINOES[state.current.type].cells[state.current.rotation];
      cells.forEach(function(cell) {
        if (gy + cell[0] >= 0) {
          drawBlock(ctx, state.current.x + cell[1], gy + cell[0], { color: 'rgba(200,200,240,0.22)', shadow: 'rgba(0,0,0,0)' });
        }
      });
    }

    // Active piece
    var t = TETROMINOES[state.current.type];
    var activeCells = t.cells[state.current.rotation];
    activeCells.forEach(function(cell) {
      if (state.current.y + cell[0] >= 0) {
        drawBlock(ctx, state.current.x + cell[1], state.current.y + cell[0], { color: t.color, shadow: t.shadow });
      }
    });
  }

  function renderNext(type) {
    var nSize = 72;
    nextCtx.fillStyle = '#12122a';
    roundRectPath(nextCtx, 0, 0, nSize, nSize, 6);
    nextCtx.fill();
    if (!type) return;

    var cells = TETROMINOES[type].cells[0];
    var minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    cells.forEach(function(c) {
      minR = Math.min(minR, c[0]); maxR = Math.max(maxR, c[0]);
      minC = Math.min(minC, c[1]); maxC = Math.max(maxC, c[1]);
    });
    var pieceW = maxC - minC + 1;
    var pieceH = maxR - minR + 1;
    var cs = Math.floor(Math.min((nSize - 8) / (pieceW + 0.5), (nSize - 8) / (pieceH + 0.5)));
    var ox = Math.floor((nSize - pieceW * cs) / 2) - minC * cs;
    var oy = Math.floor((nSize - pieceH * cs) / 2) - minR * cs;
    var t = TETROMINOES[type];

    // Temporarily override cellSize for next canvas
    var saved = cellSize;
    cellSize = cs;
    cells.forEach(function(c) {
      var x = ox + c[1] * cs;
      var y = oy + c[0] * cs;
      var size = cs - 2;
      var r = Math.max(2, size * 0.2);
      nextCtx.fillStyle = t.shadow;
      roundRectPath(nextCtx, x + 2, y + 2, size, size, r);
      nextCtx.fill();
      nextCtx.fillStyle = t.color;
      roundRectPath(nextCtx, x, y, size, size, r);
      nextCtx.fill();
      nextCtx.fillStyle = 'rgba(255,255,255,0.3)';
      roundRectPath(nextCtx, x + 2, y + 2, size * 0.45, size * 0.25, r * 0.5);
      nextCtx.fill();
    });
    cellSize = saved;
  }

  return { init: init, render: render, renderNext: renderNext, resize: resize };
})();
