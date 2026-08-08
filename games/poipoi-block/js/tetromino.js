// [row, col] offsets for each rotation of each tetromino type
var TETROMINOES = {
  I: {
    color: '#00ccff', shadow: '#009ab8',
    cells: [
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]],
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]]
    ]
  },
  O: {
    color: '#ffdd00', shadow: '#c9ad00',
    cells: [
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]]
    ]
  },
  T: {
    color: '#cc44ff', shadow: '#9922cc',
    cells: [
      [[0,1],[1,0],[1,1],[1,2]],
      [[0,0],[1,0],[1,1],[2,0]],
      [[0,0],[0,1],[0,2],[1,1]],
      [[0,1],[1,0],[1,1],[2,1]]
    ]
  },
  S: {
    color: '#44ee88', shadow: '#22bb66',
    cells: [
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]],
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]]
    ]
  },
  Z: {
    color: '#ff4466', shadow: '#cc2244',
    cells: [
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,0],[1,1],[2,0]],
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,0],[1,1],[2,0]]
    ]
  },
  J: {
    color: '#4488ff', shadow: '#2266cc',
    cells: [
      [[0,0],[1,0],[1,1],[1,2]],
      [[0,0],[0,1],[1,0],[2,0]],
      [[0,0],[0,1],[0,2],[1,2]],
      [[0,1],[1,1],[2,0],[2,1]]
    ]
  },
  L: {
    color: '#ff8844', shadow: '#cc6622',
    cells: [
      [[0,2],[1,0],[1,1],[1,2]],
      [[0,0],[1,0],[2,0],[2,1]],
      [[0,0],[0,1],[0,2],[1,0]],
      [[0,0],[0,1],[1,1],[2,1]]
    ]
  }
};

var TETROMINO_TYPES = Object.keys(TETROMINOES);

// Assign integer IDs (1–7) for field storage
TETROMINO_TYPES.forEach(function(key, i) {
  TETROMINOES[key].id = i + 1;
});

// Color lookup by ID
var COLOR_BY_ID = {};
TETROMINO_TYPES.forEach(function(key) {
  var t = TETROMINOES[key];
  COLOR_BY_ID[t.id] = { color: t.color, shadow: t.shadow };
});

// 7-bag randomizer for fair distribution
var _bag = [];
function randomType() {
  if (_bag.length === 0) {
    _bag = TETROMINO_TYPES.slice();
    for (var i = _bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = _bag[i]; _bag[i] = _bag[j]; _bag[j] = tmp;
    }
  }
  return _bag.pop();
}
