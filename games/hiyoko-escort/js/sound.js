let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.3) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.start(c.currentTime); osc.stop(c.currentTime + dur);
}

export function playPiyo() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1800, c.currentTime + 0.08);
  osc.frequency.exponentialRampToValueAtTime(2000, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.22, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
  osc.start(c.currentTime); osc.stop(c.currentTime + 0.2);
}

export function playJoin() {
  tone(880, 0.06, 'sine', 0.28);
  setTimeout(() => tone(1100, 0.08, 'sine', 0.24), 70);
}

export function playDeliver(count) {
  const freqs = count >= 4 ? [523, 659, 784, 1047] : [659, 784, 1047];
  freqs.forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.3), i * 70));
}

export function playDrop() {
  tone(400, 0.08, 'sine', 0.2);
  setTimeout(() => tone(300, 0.1, 'sine', 0.18), 80);
}

export function playFootstep() {
  const c = getCtx();
  const buf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.25;
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain(); gain.gain.value = 0.12;
  src.connect(gain); gain.connect(c.destination);
  src.start();
}

export function resume() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
