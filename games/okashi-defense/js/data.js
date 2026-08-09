// Grid: 0=placeable, 1=path, 2=decoration/blocked
// 8 columns (x: 0-7) x 10 rows (z: 0-9); [row][col]
const GRID = [
  [0,0,1,0,0,0,0,0],
  [0,0,1,0,0,0,0,0],
  [0,0,1,1,1,1,0,0],
  [0,0,0,0,0,1,0,0],
  [0,0,0,0,0,1,0,0],
  [0,0,1,1,1,1,0,0],
  [0,0,1,0,0,0,0,0],
  [0,0,1,0,0,0,0,0],
  [0,0,1,1,1,1,0,0],
  [0,0,0,0,0,1,0,0],
];

// Waypoints in grid coords (col, row) → world coords via gridToWorld()
// Enemy enters top-left, follows S-curve, exits bottom-right
const WAYPOINTS_GRID = [
  {c:2, r:-1},  // spawn (off-grid top)
  {c:2, r:0},
  {c:2, r:2},
  {c:5, r:2},
  {c:5, r:5},
  {c:2, r:5},
  {c:2, r:8},
  {c:5, r:8},
  {c:5, r:10},  // goal (off-grid bottom)
];

const TOWERS = {
  candy: {
    id: 'candy', emoji: '🍬', name: 'キャンディ砲',
    cost: 50, upgradeCostMul: 0.8,
    color: '#e879f9',
    stats: [
      { dmg: 25,  range: 2.5, cd: 60,  aoe: 0 },
      { dmg: 40,  range: 2.8, cd: 50,  aoe: 0 },
      { dmg: 65,  range: 3.1, cd: 40,  aoe: 0 },
    ],
  },
  cookie: {
    id: 'cookie', emoji: '🍪', name: 'クッキー連射',
    cost: 80, upgradeCostMul: 0.8,
    color: '#f59e0b',
    stats: [
      { dmg: 10,  range: 2.2, cd: 20,  aoe: 0 },
      { dmg: 16,  range: 2.4, cd: 17,  aoe: 0 },
      { dmg: 25,  range: 2.6, cd: 14,  aoe: 0 },
    ],
  },
  lollipop: {
    id: 'lollipop', emoji: '🍭', name: 'ロリポップ',
    cost: 60, upgradeCostMul: 0.8,
    color: '#34d399',
    stats: [
      { dmg: 0,   range: 2.0, cd: 0,   aoe: 0, slow: 0.4 },
      { dmg: 0,   range: 2.5, cd: 0,   aoe: 0, slow: 0.55 },
      { dmg: 0,   range: 3.0, cd: 0,   aoe: 0, slow: 0.7 },
    ],
  },
  choco: {
    id: 'choco', emoji: '🍫', name: 'チョコ爆弾',
    cost: 120, upgradeCostMul: 0.8,
    color: '#7c3aed',
    stats: [
      { dmg: 60,  range: 2.5, cd: 120, aoe: 1.5 },
      { dmg: 100, range: 2.8, cd: 100, aoe: 1.8 },
      { dmg: 160, range: 3.2, cd: 80,  aoe: 2.2 },
    ],
  },
};

const ENEMIES = {
  petit: {
    id: 'petit', emoji: '🟣', name: 'プチマカロン',
    hp: 20,  spd: 0.022, reward: 10, score: 10,
    color: '#c084fc', scale: 0.35,
  },
  double: {
    id: 'double', emoji: '🔵', name: 'ダブルマカロン',
    hp: 60,  spd: 0.013, reward: 25, score: 25,
    color: '#60a5fa', scale: 0.45,
  },
  dash: {
    id: 'dash', emoji: '🟡', name: 'ダッシュベリー',
    hp: 15,  spd: 0.040, reward: 15, score: 15,
    color: '#fde047', scale: 0.30,
  },
  king: {
    id: 'king', emoji: '👑', name: 'キングマカロン',
    hp: 400, spd: 0.007, reward: 100, score: 100,
    color: '#f43f5e', scale: 0.65,
  },
};

// Each wave: array of {type, count, interval (frames between spawns)}
const WAVES = [
  [{type:'petit',  count:8,  interval:60}],
  [{type:'petit',  count:10, interval:50}, {type:'dash',   count:3,  interval:40}],
  [{type:'double', count:4,  interval:80}, {type:'petit',  count:6,  interval:50}],
  [{type:'dash',   count:8,  interval:35}, {type:'petit',  count:8,  interval:40}],
  [{type:'petit',  count:10, interval:40}, {type:'king',   count:1,  interval:0 }],
  [{type:'double', count:6,  interval:70}, {type:'dash',   count:6,  interval:30}],
  [{type:'petit',  count:14, interval:35}, {type:'double', count:4,  interval:60}],
  [{type:'dash',   count:10, interval:28}, {type:'double', count:5,  interval:60}],
  [{type:'petit',  count:12, interval:30}, {type:'dash',   count:8,  interval:25}, {type:'double', count:6, interval:55}],
  [{type:'petit',  count:10, interval:30}, {type:'double', count:8,  interval:50}, {type:'king',   count:1, interval:0}],
];
