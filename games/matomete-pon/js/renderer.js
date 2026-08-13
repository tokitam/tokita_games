var Renderer = (function () {
  var canvas, ctx, cellSize;
  var GAP = 3;
  var highlightedGroup = [];
  var removingCells = [];

  var COLORS = [null, '#FF6B6B', '#4ECDC4', '#95E77E', '#FFE66D', '#C3A6FF'];
  var SHADOWS = [null, '#c84040', '#2a9d96', '#5ab53e', '#ccb52a', '#8a5ccc'];

  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function lighten(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * amt));
    var g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amt));
    var b = Math.min(255, (n & 0xff) + Math.round(255 * amt));
    return '#' + [r, g, b].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }

  function resize(wrap) {
    var dpr = window.devicePixelRatio || 1;
    var maxW = wrap.clientWidth - 16;
    var maxH = wrap.clientHeight - 16;
    var cellW = Math.floor((maxW - GAP * (Game.COLS + 1)) / Game.COLS);
    var cellH = Math.floor((maxH - GAP * (Game.ROWS + 1)) / Game.ROWS);
    cellSize = Math.max(10, Math.min(cellW, cellH));

    var totalW = cellSize * Game.COLS + GAP * (Game.COLS + 1);
    var totalH = cellSize * Game.ROWS + GAP * (Game.ROWS + 1);

    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';
    canvas.width = Math.round(totalW * dpr);
    canvas.height = Math.round(totalH * dpr);
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  function cellToPixel(row, col) {
    return {
      x: GAP + col * (cellSize + GAP),
      y: GAP + row * (cellSize + GAP)
    };
  }

  function pixelToCell(px, py) {
    var col = Math.floor((px - GAP) / (cellSize + GAP));
    var row = Math.floor((py - GAP) / (cellSize + GAP));
    if (row < 0 || row >= Game.ROWS || col < 0 || col >= Game.COLS) return null;
    var ox = px - GAP - col * (cellSize + GAP);
    var oy = py - GAP - row * (cellSize + GAP);
    if (ox < 0 || ox > cellSize || oy < 0 || oy > cellSize) return null;
    return { row: row, col: col };
  }

  function isInGroup(row, col, group) {
    for (var i = 0; i < group.length; i++) {
      if (group[i].row === row && group[i].col === col) return true;
    }
    return false;
  }

  function getRemovingAlpha(row, col) {
    for (var i = 0; i < removingCells.length; i++) {
      if (removingCells[i].row === row && removingCells[i].col === col) return removingCells[i].alpha;
    }
    return -1;
  }

  function drawBlock(x, y, size, color, alpha, highlighted) {
    var r = Math.max(3, size * 0.18);
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = SHADOWS[color];
    rrect(x + 1, y + 2, size, size, r);
    ctx.fill();

    ctx.fillStyle = highlighted ? lighten(COLORS[color], 0.28) : COLORS[color];
    rrect(x, y, size, size, r);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    rrect(x + size * 0.14, y + size * 0.1, size * 0.48, size * 0.28, r * 0.5);
    ctx.fill();

    ctx.restore();
  }

  function draw() {
    if (!ctx) return;
    var board = Game.getBoard();
    if (!board) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var r = 0; r < Game.ROWS; r++) {
      for (var c = 0; c < Game.COLS; c++) {
        var color = board[r][c];
        if (color === 0) continue;
        var pos = cellToPixel(r, c);
        var alpha = getRemovingAlpha(r, c);
        if (alpha >= 0) {
          drawBlock(pos.x, pos.y, cellSize, color, alpha, false);
        } else {
          drawBlock(pos.x, pos.y, cellSize, color, 1, isInGroup(r, c, highlightedGroup));
        }
      }
    }
  }

  function setHighlight(group) {
    highlightedGroup = group || [];
  }

  function startRemove(cells, onComplete) {
    removingCells = cells.map(function (c) { return { row: c.row, col: c.col, alpha: 1 }; });
    var start = null;
    var duration = 180;

    function step(ts) {
      if (!start) start = ts;
      var t = Math.min((ts - start) / duration, 1);
      for (var i = 0; i < removingCells.length; i++) {
        removingCells[i].alpha = 1 - t;
      }
      draw();
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        removingCells = [];
        onComplete();
      }
    }
    requestAnimationFrame(step);
  }

  function init(canvasEl, wrap) {
    canvas = canvasEl;
    resize(wrap);
  }

  return {
    init: init,
    resize: resize,
    draw: draw,
    setHighlight: setHighlight,
    startRemove: startRemove,
    pixelToCell: pixelToCell
  };
})();
