// Flat-top axial hex coordinates extended with height: (q, r, h)
var HexGrid = (function() {
  var HEX_SIZE = 1.25; // axial scale factor (flat-top)
  var HEX_H    = 0.95; // block height in Babylon units

  // 8 neighbors: 6 horizontal + top/bottom
  var DIRS = [
    {q: 1,  r: 0,  h: 0},
    {q: -1, r: 0,  h: 0},
    {q: 0,  r: 1,  h: 0},
    {q: 0,  r: -1, h: 0},
    {q: 1,  r: -1, h: 0},
    {q: -1, r: 1,  h: 0},
    {q: 0,  r: 0,  h: 1},
    {q: 0,  r: 0,  h: -1},
  ];

  function key(q, r, h) { return q + ',' + r + ',' + h; }

  function fromKey(k) {
    var p = k.split(',');
    return { q: +p[0], r: +p[1], h: +p[2] };
  }

  function hexToWorld(q, r, h) {
    return {
      x: HEX_SIZE * (1.5 * q),
      y: h * HEX_H,
      z: HEX_SIZE * (Math.sqrt(3) * 0.5 * q + Math.sqrt(3) * r),
    };
  }

  function neighbors(q, r, h) {
    return DIRS.map(function(d) { return { q: q + d.q, r: r + d.r, h: h + d.h }; });
  }

  return { HEX_SIZE: HEX_SIZE, HEX_H: HEX_H, key: key, fromKey: fromKey, hexToWorld: hexToWorld, neighbors: neighbors };
})();
