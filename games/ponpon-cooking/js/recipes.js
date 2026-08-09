// 食材定義
const Ingredients = {
  egg:     { emoji: '🥚', name: 'たまご',  color: [1.0, 0.95, 0.5] },
  rice:    { emoji: '🍚', name: 'ごはん',  color: [1.0, 1.0, 0.9] },
  shrimp:  { emoji: '🦐', name: 'エビ',    color: [1.0, 0.4, 0.3] },
  negi:    { emoji: '🧅', name: 'ねぎ',    color: [0.3, 0.8, 0.2] },
  carrot:  { emoji: '🥕', name: 'にんじん', color: [1.0, 0.5, 0.1] },
  // 邪魔アイテム
  burnt:   { emoji: '🥩', name: '焦げ肉', color: [0.15, 0.1, 0.05], bad: true },
  fly:     { emoji: '🪰', name: 'ハエ',   color: [0.1, 0.1, 0.1],  bad: true },
};

// レシピ定義（materialはIngredients のキー配列）
const Recipes = [
  { name: 'たまごやき',   materials: ['egg', 'egg'],                score: 20, emoji: '🍳' },
  { name: 'チャーハン',   materials: ['rice', 'egg', 'negi'],        score: 40, emoji: '🍛' },
  { name: 'エビチリ',     materials: ['shrimp', 'shrimp', 'negi'],   score: 50, emoji: '🦐' },
  { name: 'やさいいため', materials: ['carrot', 'negi', 'negi'],     score: 30, emoji: '🥗' },
];

// 多重集合として一致チェック
function recipesMatch(panItems, recipe) {
  if (panItems.length !== recipe.materials.length) return false;
  const counts = {};
  for (const m of recipe.materials) counts[m] = (counts[m] || 0) + 1;
  for (const item of panItems) {
    if (!counts[item]) return false;
    counts[item]--;
  }
  return true;
}

// 現在のパンの中身にマッチするレシピを返す
function findMatchingRecipe(panItems, targetRecipe) {
  if (targetRecipe && recipesMatch(panItems, targetRecipe)) return targetRecipe;
  return null;
}

// ランダムなレシピを返す（直前と違うもの）
function randomRecipe(exclude) {
  const pool = exclude ? Recipes.filter(r => r !== exclude) : Recipes;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 落下食材の種類を抽選（邪魔アイテム10%）
function randomIngredient(fever) {
  if (Math.random() < 0.08) return Math.random() < 0.5 ? 'burnt' : 'fly';
  const keys = ['egg', 'rice', 'shrimp', 'negi', 'carrot'];
  return keys[Math.floor(Math.random() * keys.length)];
}
