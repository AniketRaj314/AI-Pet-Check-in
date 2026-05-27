const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;

function ensureCtx() {
  if (!actx) actx = new AudioCtx();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function playNote(freq, start, duration, type = 'square', gain = 0.15) {
  const ctx = ensureCtx();
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(gain, ctx.currentTime + start);
  vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

  osc.connect(vol);
  vol.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration);
}

const sfx = {
  scan() {
    playNote(880, 0, 0.08);
    playNote(1320, 0.06, 0.1);
  },

  success() {
    playNote(523, 0, 0.12);
    playNote(659, 0.1, 0.12);
    playNote(784, 0.2, 0.12);
    playNote(1047, 0.3, 0.25, 'square', 0.12);
    playNote(784, 0.3, 0.25, 'triangle', 0.08);
  },

  already() {
    playNote(440, 0, 0.15);
    playNote(523, 0.12, 0.15);
    playNote(440, 0.25, 0.12);
  },

  error() {
    playNote(392, 0, 0.18);
    playNote(311, 0.15, 0.18);
    playNote(247, 0.3, 0.3, 'square', 0.12);
  },
};
