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

export function playMeow(golden = false) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = 'sine';
  const base = golden ? 700 : 500;
  osc.frequency.setValueAtTime(base * 1.3, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(base, c.currentTime + 0.15);
  osc.frequency.exponentialRampToValueAtTime(base * 0.85, c.currentTime + 0.35);
  gain.gain.setValueAtTime(0.35, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45);
  osc.start(c.currentTime); osc.stop(c.currentTime + 0.5);
}

export function playCatch(golden = false) {
  if (golden) {
    // ファンファーレ
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => tone(f, 0.18, 'sine', 0.35), i * 80);
    });
  } else {
    tone(880, 0.08, 'sine', 0.3);
    setTimeout(() => tone(1100, 0.12, 'sine', 0.28), 90);
  }
}

export function playFootstep() {
  const c = getCtx();
  const buf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.25;
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain(); gain.gain.value = 0.15;
  src.connect(gain); gain.connect(c.destination);
  src.start();
}

export function resume() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
