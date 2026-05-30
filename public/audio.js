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

function playSweep(startFreq, endFreq, start, duration, gain = 0.08) {
  const ctx = ensureCtx();
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime + start);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + start + duration);
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

  party() {
    const b = 0.1;

    // Buildup — rising synth sweep
    playSweep(200, 1600, 0, b*10, 0.06);
    playSweep(300, 2400, 0, b*10, 0.04);

    // Snare roll buildup
    for (let i = 0; i < 8; i++) {
      playNote(6000 + Math.random()*3000, b*i*1.1, b*0.4, 'square', 0.03 + i*0.005);
    }

    // === THE DROP ===
    const drop = b * 10;

    // Big saw chord stabs
    playNote(262, drop, b*3, 'sawtooth', 0.16);
    playNote(330, drop, b*3, 'sawtooth', 0.12);
    playNote(392, drop, b*3, 'sawtooth', 0.10);

    playNote(262, drop+b*4, b*2, 'sawtooth', 0.16);
    playNote(330, drop+b*4, b*2, 'sawtooth', 0.12);
    playNote(392, drop+b*4, b*2, 'sawtooth', 0.10);

    playNote(349, drop+b*7, b*3, 'sawtooth', 0.16);
    playNote(440, drop+b*7, b*3, 'sawtooth', 0.12);
    playNote(523, drop+b*7, b*3, 'sawtooth', 0.10);

    playNote(392, drop+b*11, b*4, 'sawtooth', 0.16);
    playNote(494, drop+b*11, b*4, 'sawtooth', 0.12);
    playNote(587, drop+b*11, b*4, 'sawtooth', 0.10);

    // Sub bass kicks
    playNote(55, drop, b*1.5, 'sine', 0.2);
    playNote(55, drop+b*3, b*1.5, 'sine', 0.2);
    playNote(55, drop+b*6, b*1.5, 'sine', 0.2);
    playNote(55, drop+b*9, b*1.5, 'sine', 0.2);
    playNote(55, drop+b*12, b*2, 'sine', 0.2);

    // Lead melody
    playNote(1047, drop, b*1.5, 'square', 0.08);
    playNote(988, drop+b*2, b, 'square', 0.08);
    playNote(784, drop+b*3.5, b, 'square', 0.08);
    playNote(988, drop+b*5, b*1.5, 'square', 0.08);
    playNote(1047, drop+b*7, b, 'square', 0.08);
    playNote(1175, drop+b*8.5, b, 'square', 0.08);
    playNote(1319, drop+b*10, b, 'square', 0.08);
    playNote(1175, drop+b*11.5, b, 'square', 0.08);
    playNote(1047, drop+b*13, b*2, 'square', 0.08);
  },
};
