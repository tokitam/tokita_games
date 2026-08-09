var FRUITS = [
  { id: 1,  emoji: '🍇', radius: 24,  score: 1,   color: '#7B1FA2' },
  { id: 2,  emoji: '🍋', radius: 32,  score: 3,   color: '#F9A825' },
  { id: 3,  emoji: '🍊', radius: 40,  score: 6,   color: '#E65100' },
  { id: 4,  emoji: '🍎', radius: 50,  score: 10,  color: '#C62828' },
  { id: 5,  emoji: '🍐', radius: 60,  score: 15,  color: '#558B2F' },
  { id: 6,  emoji: '🍑', radius: 70,  score: 21,  color: '#E91E63' },
  { id: 7,  emoji: '🍍', radius: 80,  score: 28,  color: '#F9A825' },
  { id: 8,  emoji: '🍈', radius: 92,  score: 36,  color: '#388E3C' },
  { id: 9,  emoji: '🍉', radius: 106, score: 45,  color: '#D32F2F' },
  { id: 10, emoji: '🍉', radius: 120, score: 55,  color: '#1B5E20' },
  { id: 11, emoji: '🌟', radius: 136, score: 100, color: '#FFD600' }
];

function getFruitById(id) {
  return FRUITS[id - 1] || null;
}
