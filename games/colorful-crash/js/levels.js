var Levels = (function() {
  // Row colors (bottom to top of block grid)
  var ROW_COLORS = [
    '#FF5252', // red
    '#FF7043', // orange
    '#FFD740', // yellow
    '#69F0AE', // green
    '#40C4FF', // cyan
    '#536DFE', // blue
    '#E040FB', // purple
    '#F48FB1'  // pink
  ];

  // hp: 1=normal, 2=hard, 3=very hard
  function buildLevel(level) {
    var cols = 8, rows = 5;
    var blocks = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        // Skip some blocks in higher levels for variety
        if (level >= 3 && r === 2 && c % 3 === 1) continue;
        var hp = 1;
        if (level >= 2 && r === 0) hp = 2;
        if (level >= 4 && r <= 1) hp = 2;
        if (level >= 5 && r === 0) hp = 3;
        var colorRow = (r + level) % ROW_COLORS.length;
        blocks.push({ col: c, row: r, hp: hp, maxHp: hp, color: ROW_COLORS[colorRow] });
      }
    }
    return {
      cols: cols,
      rows: rows,
      blocks: blocks,
      ballSpeedMult: 1 + (level - 1) * 0.08
    };
  }

  return {
    build: buildLevel,
    ROW_COLORS: ROW_COLORS
  };
})();
